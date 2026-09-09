@AGENTS.md

# Larder

Personal recipe library + meal planner. Full design doc: `docs/design.md`
— read it before making structural changes. Currently implemented:
**Phase 1 (Library foundation)** and **Phase 2 (Import)** in full — URL
import (structured JSON-LD, then AI fallback), the clip bookmarklet for
sites that block server-side fetches, paste-a-blob, a Web Share Target
(`/import/share-target`, Android/Chrome), its iOS equivalent (a
user-built Shortcut at `/import/shortcut` hitting `/api/import/share`,
since Safari has no share-target API of its own), and a screenshot
upload path (`/import/photo`, `extractRecipeFromImages` in
`src/lib/import/ai-extract.ts`) that reads a recipe out of one or more
images with Claude's vision. All of these funnel into the same handful
of extraction functions in `src/lib/import/{paste,photo}-import.ts` —
one extraction path (text or vision), several entry points.

These were all pulled forward from Phase 3 at the user's explicit
request, in escalating order as each simpler thing turned out not to
work for their actual case (Instagram): the share target and Shortcut
are just entry points onto already-built text extraction, no new
capability; the screenshot upload *is* new capability (a vision API
call) but still a deliberately narrow slice — no camera capture, no
cropping/rotation, no multi-page cookbook scanning, none of Phase 3's
actual scope — added only after URL import, the share sheet, and in-app
copy/paste all hit real Instagram-specific walls (fetch blocked, share
sheet omitting captions, caption text not selectable in-app). Auto-tagging
beyond EFFORT derivation and the job queue are still open (see README's
"Open scope within Phase 2"). Dedicated Instagram URL-fetch-with-fallback
and full cookbook photo capture remain Phase 3, not started. Follow the
phase order in design doc section 11; don't scaffold a later phase's
tables or features "since we're in there" — pulling forward a narrow,
self-contained piece at explicit user request is a narrow exception, not
a precedent for skipping ahead unprompted.

Key conventions from the design doc (section 12) that apply to all future
phases:

- `raw_text` on `IngredientLine` is always preserved and always rendered;
  parsed fields are supplementary, never authoritative.
- AI calls (Phase 2+) go behind an interface with the shared extraction
  contract (design doc section 5.5) as the boundary — mockable in tests,
  no live API calls in the test suite.
- Extraction failures must never lose data — land in `NEEDS_REVIEW` with
  whatever was recovered, not a discarded job.
- Mobile viewport is the default for every component and manual test;
  desktop is a breakpoint, not the baseline.
- Config via environment variables (see `src/lib/env.ts`, `.env.example`)
  — no hardcoded `localhost`.

See `README.md` for local setup (Docker Compose + Prisma migrate/seed).
