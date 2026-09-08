# Larder

A personal, self-hosted recipe library and meal planner. See
[`docs/design.md`](./docs/design.md) for the full design document.

Built so far:
- **Phase 1: Library foundation** — auth, data model, manual recipe
  entry/editing, browse/search/filter, tag management, photo upload.
- **Phase 2 (partial): Import** — paste a URL, and if the page publishes
  `schema.org/Recipe` structured data (most modern recipe sites do), it's
  parsed into a review screen with nothing saved until you confirm. Sites
  that block that kind of request (Allrecipes and other big commercial
  sites especially) have a fallback: a browser bookmarklet at
  `/import/bookmarklet` that captures the page from inside your own
  browser instead of fetching it server-side, so nothing about the
  request looks automated. The AI fallback (for pages with neither
  structured data nor a cooperative browser), paste-a-blob import, and
  auto-tagging are intentionally not built yet — see "Open scope" below.

Capture (Phase 3) and meal planning (Phase 4) aren't built, and their
tables are deliberately not scaffolded early.

### Open scope within Phase 2

Deferred on purpose, not forgotten:
- **AI fallback extraction** (`ANTHROPIC_API_KEY` is wired into env/deploy
  but unused) — for pages with no structured data, currently they land on
  a blank review form instead.
- **Paste-a-blob** manual import.
- **Auto-tagging** beyond the deterministic EFFORT derivation (already
  live since Phase 1).
- **Job queue** (`pg-boss`, per the design doc) — the structured-data path
  is fast enough to run synchronously; a queue becomes necessary once the
  AI fallback and photo/OCR paths (Phase 3) are slow enough to need one.

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

## Environment variables

See `.env.example` for the full list (database, S3/object storage,
Auth.js, seed user, base URL, the optional `CLIP_TOKEN` for the import
bookmarklet). Nothing is hardcoded — a missing required variable fails
fast via `src/lib/env.ts` rather than silently defaulting to `localhost`.
