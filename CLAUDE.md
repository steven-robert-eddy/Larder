@AGENTS.md

# Larder

Personal recipe library + meal planner. Full design doc: `docs/design.md`
— read it before making structural changes. Currently implemented:
**Phase 1 (Library foundation)** and **Phase 2 (Import)** in full — URL
import (structured JSON-LD, then AI fallback), the clip bookmarklet for
sites that block server-side fetches, paste-a-blob (also the practical
path for Instagram captions today), a Web Share Target
(`/import/share-target`, Android/Chrome), and its iOS equivalent — a
user-built Shortcut (`/import/shortcut`) hitting `/api/import/share`,
since Safari has no share-target API of its own. All three (share
target, iOS Shortcut, paste form) funnel into the same
`runShareTargetImport`/`runPasteImport` functions in
`src/lib/import/paste-import.ts` — one extraction path, three entry
points. These were pulled forward from Phase 3 at the user's explicit
request — they're entry points onto already-built extraction, not new
capability, so none of it needed Phase 3's tables. Auto-tagging beyond
EFFORT derivation and the job queue are still
open (see README's "Open scope within Phase 2"). The rest of Phase 3
(dedicated Instagram URL fetch, cookbook-photo capture, vision
extraction) is not started. Follow the phase order in design doc section
11; don't scaffold a later phase's tables or features "since we're in
there" — pulling forward a self-contained piece like the share target,
at explicit user request, is a narrow exception, not a precedent for
skipping ahead unprompted.

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
