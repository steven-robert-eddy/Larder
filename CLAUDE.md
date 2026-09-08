@AGENTS.md

# Larder

Personal recipe library + meal planner. Full design doc: `docs/design.md`
— read it before making structural changes. Currently implemented:
**Phase 1 (Library foundation)**, plus the structured-data slice of
**Phase 2 (Import)** — URL → `schema.org/Recipe` JSON-LD → review screen.
The AI fallback, paste-a-blob, auto-tagging, and job queue pieces of
Phase 2 are still open (see README's "Open scope within Phase 2").
Follow the phase order in design doc section 11; don't scaffold a later
phase's tables or features "since we're in there."

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
