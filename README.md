# Larder

A personal, self-hosted recipe library and meal planner. See
[`docs/design.md`](./docs/design.md) for the full design document.

Built so far:
- **Phase 1: Library foundation** — auth, data model, manual recipe
  entry/editing, browse/search/filter, tag management, photo upload.
- **Phase 2: Import** — paste a URL, and if the page publishes
  `schema.org/Recipe` structured data (most modern recipe sites do), it's
  parsed into a review screen with nothing saved until you confirm. Pages
  with no structured data fall back to AI extraction (Claude Sonnet 5)
  instead of a blank form, when `ANTHROPIC_API_KEY` is configured. Sites
  that block server-side fetches entirely (Allrecipes and other big
  commercial sites especially) have their own fallback: a browser
  bookmarklet at `/import/bookmarklet` that captures the page from inside
  your own browser instead, so nothing about the request looks automated.
  There's also `/import/paste` for anything that isn't a URL at all — an
  Instagram caption, a notes-app entry — dump the text and AI splits it
  into ingredients and steps the same way. On Android/Chrome, Larder also
  registers as a Web Share Target, so it shows up directly in the OS
  share sheet and feeds shared text straight into the same paste pipeline
  (`/import/share-target`). iOS Safari doesn't implement that API, but
  `/import/shortcut` walks through building the iPhone equivalent as a
  one-time Shortcut. When even that isn't practical — Instagram often
  won't let you select/copy a caption in-app at all, and the share sheet
  frequently hands over only the post's link — `/import/photo` accepts
  one or more screenshots and reads the recipe straight out of them with
  Claude's vision, no text selection needed at all; multiple screenshots
  cover captions too long for one screen. See "Notes on the data model"
  below for how all of these wire into the same backend.

Capture (Phase 3) and meal planning (Phase 4) aren't built, and their
tables are deliberately not scaffolded early. The screenshot-vision
import above is a deliberately narrow slice of Phase 3's vision work,
pulled forward at explicit user request after every non-vision path hit
a real, Instagram-specific wall (server-side fetch blocked, share sheet
omitting captions, in-app text selection disabled). It's just "read text
out of an uploaded image" — no camera capture, no cropping/rotation, no
multi-page cookbook scanning, none of Phase 3's actual scope. Dedicated
Instagram URL-fetch-with-fallback and full cookbook photo capture remain
Phase 3, not started.

### Open scope within Phase 2

Deferred on purpose, not forgotten:
- **Auto-tagging** beyond the deterministic EFFORT derivation (already
  live since Phase 1) — `suggested_tags` comes back from AI extraction but
  isn't applied automatically yet.
- **Job queue** (`pg-boss`, per the design doc) — both the structured-data
  and AI-extraction paths are fast enough to run synchronously; a queue
  becomes necessary once the photo/OCR paths (Phase 3) are slow enough to
  need one.

## Stack

Next.js (App Router, TypeScript) · PostgreSQL + Prisma · Auth.js
(credentials, single user) · S3-compatible object storage (MinIO locally,
Cloudflare R2 in production) · Tailwind CSS.

## Local development

Requires Docker, Node 22+, and npm.

1. **Copy the env file** and adjust as needed:

   ```bash
   cp .env.example .env
   npx auth secret   # writes a real AUTH_SECRET into .env
   ```

2. **Start Postgres + MinIO:**

   ```bash
   docker compose up -d postgres minio minio-init
   ```

3. **Install dependencies, migrate, and seed:**

   ```bash
   npm install
   npm run db:migrate   # applies prisma/migrations, creates pg_trgm + search indexes
   npm run db:seed      # seeds the tag taxonomy + 5 sample recipes (see SEED_USER_EMAIL/PASSWORD in .env)
   ```

4. **Run the app:**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 and sign in with `SEED_USER_EMAIL` /
   `SEED_USER_PASSWORD` from `.env` (defaults to `you@example.com` /
   `changeme123` — change the password after first login by re-running the
   seed with a new `SEED_USER_PASSWORD`, since there's no in-app password
   change yet).

MinIO's console is at http://localhost:9001 (same credentials as
`MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`).

## Full stack via Docker Compose

`docker compose up -d` builds and runs the app itself alongside Postgres
and MinIO (see `Dockerfile`). The app container runs `prisma migrate
deploy` on startup before serving traffic. Seeding is a separate manual
step: `docker compose exec app npx prisma db seed`.

## Deploying somewhere reachable from your phone

For actual daily use you need this running on a server that's always
on, not just your laptop on your home Wi-Fi. See
[`docs/deploy-gcp-free.md`](./docs/deploy-gcp-free.md) for a $0/month
path: a free-tier Google Cloud VM + Cloudflare R2 for photos, with
`docker-compose.prod.yml` and a GitHub Actions workflow
(`.github/workflows/deploy-image.yml`) that builds and publishes the
image so the VM never has to.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run test` | Vitest — parser unit tests + fixtures (`src/lib/import/`) |
| `npm run db:migrate` | `prisma migrate dev` (local schema changes) |
| `npm run db:deploy` | `prisma migrate deploy` (apply migrations, no diffing) |
| `npm run db:seed` | Run `prisma/seed.ts` |
| `npm run db:studio` | Prisma Studio |

## Notes on the data model

- **`raw_text` on ingredients is sacred.** The UI always renders it as
  written; parsed fields (`quantity`, `unit`, `item`, ...) exist for future
  scaling/grocery-list features and are never allowed to replace it.
- **Full-text search** lives on `recipes.search_vector`, a generated
  `tsvector` column (see `prisma/migrations/20260816150600_search_indexes`)
  — Prisma's schema DSL can't express generated columns, so that migration
  is handwritten and the column is marked `Unsupported("tsvector")` in
  `schema.prisma` so Prisma Migrate leaves it alone. Trigram indexes on
  `recipes.title` and `ingredient_lines.raw_text` back the fuzzy/typo
  matching layered on top.
- **EFFORT tags are derived, not guessed.** `weeknight` / `project` are
  applied automatically from `total_minutes` in code
  (`src/lib/taxonomy.ts`), not by a model — see design doc section 6.
- Phase 4's `MealPlanEntry` table is not yet in the schema, per the
  design doc's "don't scaffold future phases early" guidance.
- **`ImportJob`'s `recipe_id` is a plain column, not a Prisma relation** —
  deliberately, so a recipe can be hard-deleted later without needing
  cascade/set-null ceremony on a field that's just an audit trail.
- **Migrations touching this schema need `--create-only`.** Prisma's
  migration diffing doesn't know about the hand-written trigram indexes
  or the generated `search_vector` column (see above) and will try to
  drop them on every `prisma migrate dev` — generate with `--create-only`,
  strip the spurious `DROP INDEX`/`ALTER COLUMN ... DROP DEFAULT`
  statements by hand, then apply. See the comment on `searchVector` in
  `schema.prisma` and `prisma/migrations/20260908183849_import_jobs/` for
  a worked example.
- **The clip bookmarklet authenticates with a bearer token, not the
  session cookie.** It runs on whatever third-party site the user is
  looking at, so it's a genuinely cross-origin request with no cookie to
  carry — `CLIP_TOKEN` stands in for a session. `/api/import/clip` is
  explicitly excluded from the auth middleware (`src/proxy.ts`) for this
  reason; don't add other unauthenticated routes there without the same
  care around CORS and token validation.
- **AI extraction lives behind one interface**, `src/lib/import/ai-extract.ts`
  (`extractRecipeWithAI`) — every caller (the web-import AI fallback,
  paste-a-blob, and eventually Instagram/cookbook-photo in Phase 3) goes
  through it rather than touching the Anthropic SDK directly, per design
  doc section 12. It uses `client.messages.parse` with
  `zodOutputFormat(extractionContractSchema)` on Claude Sonnet 5 — Sonnet
  because this is a straightforward extraction task, not multi-step
  reasoning, and it's cheap enough to run on every import that needs it.
  Tests mock this module instead of calling the API — see
  `ai-extract.test.ts`.
- **AI extraction failures never lose data.** Web import falls through to
  the existing blank-review-with-raw-HTML behavior; paste-a-blob keeps the
  original pasted text on the job (`raw_payload.text`) and shows it on the
  review screen in a collapsed `<details>` so nothing has to be retyped.
- **Web Share Target is a thin entry point, not a new import path.**
  `/import/share-target` (registered in `public/manifest.json`) just
  parses the OS share payload and calls the same `runPasteImport` /
  `runShareTargetImport` functions paste-a-blob uses — no new extraction
  logic. Sharing an Instagram post commonly hands over only the post's
  link, not the caption (captions aren't reliably exposed to the share
  sheet), so a link-only share skips the AI call and lands on a blank
  review with the link preserved rather than wasting a call on nothing.
  `ImportJob.inputUrl` is now populated for `PASTE`-kind jobs too when a
  source URL is available, and the review screen infers `sourceType:
  "INSTAGRAM"` from an `instagram.com` link automatically. When a share
  really did land link-only, the review screen shows a "paste the
  caption" box (`retryPasteImport`) that re-extracts into the *same* job
  instead of sending the user back to `/import/paste` to start over and
  lose the saved link.
- **iOS has no Web Share Target API — the Shortcuts app is the
  equivalent.** `/api/import/share` (bearer-token auth, same `CLIP_TOKEN`
  as the clip bookmarklet) is the iPhone counterpart to
  `/import/share-target`: a user-built Shortcut (walked through at
  `/import/shortcut`, no developer account or Xcode needed) POSTs the
  share-sheet payload there and opens the returned `reviewUrl`. Both
  entry points funnel into the same `runShareTargetImport`, which now
  treats a text/title field that's nothing but a bare link
  (`isBareUrl`) the same as no text at all — Shortcuts can't always
  distinguish "shared a URL" from "shared text" as cleanly as the Web
  Share Target spec does, so this keeps a same-value-in-both-fields
  Shortcut from wasting an AI call on a lone link.
- **`/import/photo` reads text out of images with Claude's vision, not a
  separate OCR step.** `extractRecipeFromImages` (`src/lib/import/ai-extract.ts`)
  sends up to `MAX_PHOTOS` (6, see `actions.ts`) images as ordered image
  content blocks in one message, with a vision-specific system prompt
  telling the model to treat multiple screenshots as one continuous
  scrolled caption and ignore UI chrome (like counts, usernames,
  buttons). Screenshots aren't persisted anywhere — they're base64'd
  in-memory, sent, and discarded; a failed extraction lands on a blank
  review like any other no-data-found import, just without a "retry with
  the original" box (there's no original left to retry with, unlike
  paste's `rawPayload.text`). This is also why `next.config.ts` raises
  `experimental.serverActions.bodySizeLimit` to `24mb` — Next's 1MB
  default is nowhere near enough for several screenshots at once.

## Environment variables

See `.env.example` for the full list (database, S3/object storage,
Auth.js, seed user, base URL, the optional `CLIP_TOKEN` for the import
bookmarklet, the optional `ANTHROPIC_API_KEY` for AI-assisted import).
Nothing is hardcoded — a missing required variable fails fast via
`src/lib/env.ts` rather than silently defaulting to `localhost`. Both
`CLIP_TOKEN` and `ANTHROPIC_API_KEY` are optional: unset, their features
just show a "not set up yet" message instead of failing the build.
