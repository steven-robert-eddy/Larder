# Larder — Design Document

*A personal recipe library and meal planner.*

**Status:** Ready for implementation
**Author:** Steven (with Claude)
**Intended reader:** Claude Code

---

## 1. Overview

A personal, self-hosted web app for collecting recipes from anywhere and planning the week's meals around them.

The problem being solved is fragmentation. Recipes currently live in browser bookmarks, phone screenshots, Instagram saves, a notes doc, another recipe app, and physical cookbooks. None of those talk to each other, and none of them can answer "what should I make Thursday?"

**The v1 win is capture, not planning.** If the app can reliably ingest a recipe from any of those four sources in under thirty seconds and tag it usefully, it has already earned its place. Planning is built on top of that library.

### Goals

- One canonical home for every recipe, regardless of origin
- Low-friction import: paste a URL, share an Instagram post, photograph a cookbook page
- Automatic classification (cooking method, main ingredient, meal type) that the user can correct
- Weekly meal planning with a "suggest something" assist
- Personal layer on each recipe: notes, rating, cook history, own photos

### Non-goals (v1)

- Nutrition tracking or calorie counting
- Social features, publishing, or public recipe sharing
- Video transcription of Instagram Reels (captions cover the real use case)
- Pantry/inventory management
- Multi-user collaboration (designed for, not built yet)

---

## 2. Users and context

| | |
|---|---|
| **Users** | Single user at launch. Schema and auth must accommodate a second account later without migration pain. |
| **Primary device** | Phone. Kitchen use, couch browsing, capturing a cookbook page on the spot. |
| **Secondary device** | Desktop, for bulk import sessions and cleanup work. |
| **Hosting** | Self-hosted. The user owns the data. |
| **Developer** | Solo, working with Claude Code. |

**Design implication:** phone-first means the mobile layout is the default that gets designed and tested, and desktop is the enhancement — not the reverse. Every core flow must be one-handed and thumb-reachable.

---

## 3. Recommended stack

No stack preference was expressed, so this is chosen for solo maintainability and for how well Claude Code can work in it.

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js (App Router), TypeScript** | One codebase, one deploy. Server actions and route handlers cover the API without a separate service. |
| Client | **PWA** — installable, offline-capable shell | Phone-first without App Store friction. Add-to-homescreen gets you an icon and full-screen. |
| DB | **PostgreSQL** | Relational data with real full-text search built in. |
| ORM | **Prisma** | Migrations and typed queries; Claude Code handles it well. |
| Jobs | **pg-boss** (Postgres-backed queue) | Imports and OCR are slow and failure-prone. No Redis needed. |
| Object storage | **S3-compatible** (Cloudflare R2, or MinIO if fully local) | Recipe photos, cookbook page scans. |
| AI | **Anthropic API** (Claude) | Structured recipe extraction from HTML, caption text, and page photos. |
| Auth | **Auth.js** with credentials or a single-user magic link | Keep it boring. Multi-user is a config change later. |
| Deploy | Single VPS with Docker Compose, or Fly.io | App + Postgres + storage in one compose file. |

**Alternative worth noting:** a native app via Expo/React Native would give a better share-sheet and camera experience. It is not recommended for v1 — the PWA can accept shared URLs via the Web Share Target API and use the standard camera input, and one codebase matters more right now than a slightly nicer capture flow. Revisit if the share experience proves too clumsy in daily use.

---

## 4. Data model

### Core entities

```
User
  id, email, name, created_at

Recipe
  id, user_id
  title
  description            -- short blurb, optional
  servings_yield         -- integer, nullable
  servings_unit          -- "servings", "cookies", "loaf"
  prep_minutes           -- nullable
  cook_minutes           -- nullable
  total_minutes          -- nullable, may differ from prep+cook
  source_type            -- WEB | INSTAGRAM | COOKBOOK | MANUAL
  source_url             -- nullable
  source_name            -- "Serious Eats", "Salt Fat Acid Heat p.212"
  source_author          -- nullable
  hero_image_url         -- nullable
  rating                 -- 1-5, nullable, user's own
  notes                  -- free text, user's tweaks
  is_archived            -- soft delete
  created_at, updated_at

IngredientLine
  id, recipe_id
  position               -- ordering
  section                -- "For the sauce", nullable
  raw_text               -- ALWAYS preserved verbatim
  quantity               -- decimal, nullable
  quantity_max           -- for "2-3 cloves", nullable
  unit                   -- normalized enum-ish string, nullable
  item                   -- "garlic", nullable
  preparation            -- "minced", nullable
  is_optional            -- boolean

Step
  id, recipe_id
  position
  section                -- nullable, mirrors ingredient sections
  text
  timer_seconds          -- parsed from text if present, nullable

Tag
  id, user_id
  facet                  -- METHOD | MAIN | MEAL | CUISINE | EFFORT | SEASON | CUSTOM
  name                   -- "crockpot", "pasta", "weeknight"
  is_system              -- seeded vs. user-created

RecipeTag
  recipe_id, tag_id
  confidence             -- 0-1 from auto-tagger, null if user-applied
  applied_by             -- AUTO | USER

RecipePhoto
  id, recipe_id, url, caption, is_hero, created_at
  -- the user's own results, separate from the imported hero image

CookLog
  id, recipe_id, cooked_on, notes
  -- one row per time it's made; drives "last cooked" and "times made"

MealPlanEntry
  id, user_id
  date
  slot                   -- BREAKFAST | LUNCH | DINNER | OTHER
  recipe_id              -- nullable
  freeform_text          -- "leftovers", "eat out", for non-recipe nights
  position               -- ordering within a slot
  created_at

ImportJob
  id, user_id
  kind                   -- WEB | INSTAGRAM | PHOTO
  status                 -- QUEUED | RUNNING | NEEDS_REVIEW | DONE | FAILED
  input_url              -- nullable
  input_asset_urls       -- array, for photo imports
  raw_payload            -- jsonb: scraped HTML, caption text, OCR output
  parsed_payload         -- jsonb: the draft recipe before user confirms
  error_message
  recipe_id              -- set once confirmed
  created_at, updated_at
```

### Modeling notes

**`raw_text` on ingredients is sacred.** Structured parsing (quantity/unit/item) will be wrong sometimes. Always render `raw_text` in the UI, and use the structured fields only for scaling and future grocery lists. Never let a parse failure lose the original line.

**Structure ingredients from day one** even though scaling and grocery lists are later phases. Retrofitting structure across a few hundred recipes is miserable; parsing at import time is free.

**`CookLog` as rows, not a counter.** "Times made" is `count(*)`, "last cooked" is `max(cooked_on)`. Same table, and you get history for free.

**Tags are faceted, not flat.** A recipe is `METHOD:crockpot` + `MAIN:beef` + `MEAL:dinner`. Faceted tags make the filter UI and the suggestion engine straightforward; a flat tag soup does not.

---

## 5. Ingestion — the heart of the app

Four paths in, one shared destination: a **review screen** where the parsed draft is shown for confirmation before it becomes a real recipe. This is non-negotiable. Every extraction method fails sometimes, and a fifteen-second review beats silently saving garbage.

### 5.1 Web import

1. User pastes a URL (or shares to the app via Web Share Target).
2. Fetch the page server-side with a normal browser user-agent.
3. **Try structured data first.** Look for JSON-LD `schema.org/Recipe`, then microdata. Most major food sites publish it, and it gives clean title, ingredients, steps, times, yield, and image — no AI needed and no ambiguity.
4. **Fall back to AI.** If no structured data, strip the page to readable content (Readability-style extraction) and send it to Claude with a strict JSON schema for recipe fields.
5. Download the hero image to object storage — don't hotlink someone else's server.
6. Queue for auto-tagging, present the review screen.

Build the structured-data path first. It will cover the large majority of real-world recipe sites, cost nothing, and never hallucinate.

### 5.2 Instagram import

The recipes being saved are **written out in the caption**, which makes this tractable. No video transcription needed.

Instagram has no usable public API for arbitrary post content, and scraping is fragile and hostile to automation. Design accordingly, in order of preference:

1. **Share-sheet paste (primary, always works).** User shares the post to the app or copies the caption; app receives text plus optionally a screenshot. Claude parses the caption into a recipe. Zero dependency on Instagram cooperating.
2. **URL fetch attempt (best-effort).** Try to fetch the post's public page and pull the caption from Open Graph metadata. If it works, great; if it returns a login wall, fall back to path 1 with a clear message.
3. **Screenshot path.** If the user has a screenshot of the caption, run it through the same vision pipeline as cookbook pages.

**Do not build this as if the URL fetch is the main path.** It will break, probably more than once a year. The paste path is the contract; the fetch is a convenience layered on top.

Always store `source_url` so the original post can be reopened.

### 5.3 Cookbook scanning

Capture is a phone camera photo of the page.

1. Camera capture in the app, with support for **multiple photos per recipe** — recipes span pages, and ingredients are often on the facing page.
2. Client-side pre-processing: let the user crop and rotate. Skip auto-deskewing heroics; a decent crop is enough.
3. Send the image(s) to **Claude's vision API** rather than a traditional OCR engine. Cookbook layouts are multi-column, use small caps, sidebars, and pull quotes — a vision model handling layout and extraction in one pass beats OCR-then-parse, which chokes on exactly this.
4. Prompt for the same strict JSON recipe schema, with explicit instruction to preserve ingredient lines verbatim and to leave fields null rather than guess.
5. Store the page photos on the recipe so the original is always available if extraction missed something.
6. Prompt the user for the book title and page number — that becomes `source_name`.

**Design for a bad-lighting kitchen photo, not a flatbed scan.** Glare, curved page gutters, and a thumb in the corner are the normal case.

### 5.4 Manual entry

A plain form, plus a **paste-a-blob** mode: dump unformatted text from a notes app, let Claude split it into ingredients and steps, then review. This is the migration path for the existing notes doc and for anything the other three methods fumble.

### 5.5 Shared extraction contract

Every path produces the same JSON shape before review:

```json
{
  "title": "string",
  "description": "string | null",
  "servings_yield": "number | null",
  "servings_unit": "string | null",
  "prep_minutes": "number | null",
  "cook_minutes": "number | null",
  "ingredients": [
    { "section": "string | null", "raw_text": "string",
      "quantity": "number | null", "quantity_max": "number | null",
      "unit": "string | null", "item": "string | null",
      "preparation": "string | null", "is_optional": "boolean" }
  ],
  "steps": [
    { "section": "string | null", "text": "string", "timer_seconds": "number | null" }
  ],
  "suggested_tags": [ { "facet": "string", "name": "string", "confidence": 0.0 } ]
}
```

One schema, one review screen, one set of tests. Adding a fifth import source later means writing one adapter, not a new pipeline.

---

## 6. Classification

Auto-tag on import, fully editable afterward. Suggested tags above a confidence threshold are pre-applied; below it, they appear as one-tap suggestions on the review screen.

### Seed taxonomy

| Facet | Values |
|---|---|
| **METHOD** | crockpot / slow cooker, instant pot / pressure cooker, grill, smoker, oven / bake, roast, stovetop, air fryer, sous vide, no-cook, one-pot, sheet pan |
| **MAIN** | chicken, beef, pork, seafood, fish, eggs, pasta, rice, beans / legumes, vegetable, cheese, bread / dough |
| **MEAL** | breakfast, lunch, dinner, side, appetizer, dessert, snack, sauce / condiment, drink |
| **CUISINE** | italian, mexican, chinese, thai, indian, japanese, mediterranean, american, bbq, cajun, korean, french |
| **EFFORT** | weeknight (≤45 min), project (>2 hr), make-ahead, freezer-friendly, minimal cleanup |
| **SEASON** | summer, fall, winter, spring, holiday |
| **CUSTOM** | user-created, free-form |

The tagger reads title, ingredients, steps, and times, then returns facet/name pairs constrained to the existing tag vocabulary — plus at most two novel suggestions per recipe, which land in CUSTOM and require explicit acceptance. This keeps the vocabulary from drifting into forty near-synonyms.

Derive EFFORT tags from `total_minutes` in code rather than asking the model. Deterministic beats clever.

---

## 7. Meal planning

### Weekly view

A seven-day board, Monday through Sunday, defaulting to the current week with arrows to move between weeks.

- On phone: vertical scroll of day cards. Tap a day, tap a slot, pick a recipe. Drag-and-drop is a desktop nicety, not the mobile mechanic — tap-to-assign is faster with a thumb and far less fiddly.
- Dinner is the default slot and is the only one shown until the user expands a day. Most planning is dinner planning; showing three empty slots per day makes the week look like homework.
- Non-recipe entries are first-class: "leftovers," "out," "sandwiches" as freeform text. A planner that only accepts recipes gets abandoned the first busy week.

### Suggestions

A **"Suggest a meal"** button on any empty slot, filterable by facet — "give me a crockpot night," "something with chicken," "weeknight only."

Scoring, deliberately simple and explainable:

```
score = (rating_normalized * 2.0)
      + (days_since_last_cooked_normalized * 1.5)
      + (never_cooked ? 1.0 : 0)
      + random_jitter(0.0 to 0.5)
```

...filtered by whatever facets the user selected, excluding anything already on this week's plan. Return three candidates with a reshuffle button.

This deliberately favors well-liked recipes that haven't been made recently, and gives untried recipes a nudge so the library doesn't calcify around six dinners. No ML, no embeddings — the rating and cook-log data already encode the useful signal, and a rule the user can understand is a rule the user can trust.

---

## 8. Browsing and search

- **Search** across title, ingredients, and notes via Postgres full-text search. Fuzzy enough to survive typos; a trigram index on title helps.
- **Filter** by facet, multi-select within a facet (OR), across facets (AND). "Crockpot OR instant pot" AND "beef" AND "weeknight."
- **Sort** by recently added, rating, last cooked, alphabetical.
- **Views:** grid with hero images (browsing mood), compact list (looking for something specific).
- **Saved filters** as one-tap chips — "quick dinners," "haven't made in 3 months."

---

## 9. Cooking mode

Occasional-use feature, so build it small and build it late.

- Full-screen, one step at a time, large type
- Ingredients accessible without leaving the step (bottom sheet)
- Wake lock so the screen stays on
- Tap a detected duration in a step to start a timer
- "Made it" button at the end → writes a `CookLog` row, prompts for rating and a result photo

The "Made it" button is the important part. It's the only thing feeding cook history, which the suggestion engine depends on. Make it easy to hit and easy to hit from the recipe page too, not only from cooking mode.

---

## 10. Later phases

Explicitly deferred, but the data model should not block them:

- **Grocery list.** Consolidate structured ingredients across the week's plan, group by store section, merge duplicates ("2 cloves garlic" + "1 clove garlic" = 3). Needs the structured ingredient fields, which is why they exist from day one.
- **Recipe scaling.** Multiply structured quantities, render fractions sensibly (1.5 → 1½), flag that cook times and pan sizes don't scale linearly.
- **Sharing.** Second user account, shared recipe library, per-user ratings and notes on shared recipes.

---

## 11. Build phases

**Phase 1 — Library foundation**
Auth, data model, migrations. Manual recipe entry and editing. Recipe detail page with notes, rating, cook log. Browse, search, filter. Tag management with the seeded taxonomy. Photo upload.
*Done when:* recipes can be added by hand and found again reliably.

**Phase 2 — Import**
Shared extraction contract and review screen. Web import (structured data path, then AI fallback). Paste-a-blob manual import. Auto-tagging. Job queue with status UI.
*Done when:* a URL becomes a tagged recipe in under thirty seconds.

**Phase 3 — Capture**
Cookbook photo capture, multi-page, vision extraction. Instagram caption import via share/paste, with best-effort URL fetch. Web Share Target registration.
*Done when:* all four sources are covered and the backlog migration can start.

**Phase 4 — Planning**
Weekly board, slot assignment, freeform entries. Suggestion engine. Week navigation.
*Done when:* a week can be planned in five minutes.

**Phase 5 — Kitchen polish**
Cooking mode, timers, wake lock. "Made it" flow. Offline caching of planned recipes.

**Phase 6 — Deferred features**
Grocery list, scaling, second user.

---

## 12. Notes for Claude Code

- **Build in the phase order above.** Each phase should end in a working, deployable app. Do not scaffold Phase 4 tables early "since we're in there."
- **Test the parsers with fixtures.** Save real HTML from a dozen recipe sites, real Instagram caption text, and a few genuinely bad cookbook photos into a fixtures directory. These are the regression suite. Parsers are where this app will actually break.
- **AI calls go behind an interface** with the extraction contract as the boundary. Swappable models, mockable in tests, and no API calls in the test suite.
- **Never let extraction failure lose data.** If parsing fails, the `ImportJob` keeps the raw payload and lands in `NEEDS_REVIEW` with whatever was recovered. The user fixes it by hand rather than starting over.
- **Seed data.** A migration that loads the tag taxonomy and five sample recipes, so the UI is never being built against an empty database.
- **Mobile viewport is the default** in every component and every manual test. Desktop is a breakpoint, not the baseline.
- **Config via environment variables** from the first commit: database URL, S3 credentials, Anthropic API key, base URL. No hardcoded localhost anywhere.

---

## 13. Open decisions

Not blockers for Phase 1, but worth settling before the phase that needs them:

1. **Where does it run** — VPS with Docker Compose, or Fly.io? Affects storage choice (MinIO vs. R2) and backup strategy. Decide before Phase 2.
2. **Backup plan for the database.** This becomes the only copy of a few hundred recipes. Nightly `pg_dump` to object storage is the minimum, and it needs a restore test.
3. **Import a whole cookbook, or only recipes actually cooked?** Determines whether bulk-capture tooling is worth building in Phase 3.
4. **Does the existing recipe app have an export?** If it offers JSON or a bulk format, a one-off import script beats re-capturing dozens of recipes by hand.
