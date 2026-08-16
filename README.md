# Larder

A personal, self-hosted recipe library and meal planner. See
[`docs/design.md`](./docs/design.md) for the full design document — this
build covers **Phase 1: Library foundation** (auth, data model, manual
recipe entry/editing, browse/search/filter, tag management, photo upload).
Import (Phase 2), capture (Phase 3), and meal planning (Phase 4) are not
built yet, and their tables are deliberately not scaffolded early.

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

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
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
- Phase 2's `ImportJob` table and Phase 4's `MealPlanEntry` table are not
  yet in the schema, per the design doc's "don't scaffold future phases
  early" guidance.

## Environment variables

See `.env.example` for the full list (database, S3/object storage,
Auth.js, seed user, base URL). Nothing is hardcoded — a missing required
variable fails fast via `src/lib/env.ts` rather than silently defaulting
to `localhost`.
