-- Hand-edited: `prisma migrate dev` generated spurious `DROP INDEX` (for
-- the hand-written trigram indexes) and `ALTER COLUMN search_vector DROP
-- DEFAULT` statements here, because those aren't expressible in
-- schema.prisma and Prisma's diff engine doesn't know they're supposed
-- to exist. Stripped both out — only the real ImportJob changes remain.
-- Any future migration touching this schema should be generated with
-- `--create-only` and checked for the same spurious drops before applying.

-- CreateEnum
CREATE TYPE "ImportKind" AS ENUM ('WEB', 'INSTAGRAM', 'PHOTO');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('QUEUED', 'RUNNING', 'NEEDS_REVIEW', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "ImportKind" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'QUEUED',
    "input_url" TEXT,
    "input_asset_urls" TEXT[],
    "raw_payload" JSONB,
    "parsed_payload" JSONB,
    "error_message" TEXT,
    "recipe_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_jobs_user_id_status_idx" ON "import_jobs"("user_id", "status");

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
