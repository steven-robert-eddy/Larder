-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('WEB', 'INSTAGRAM', 'COOKBOOK', 'MANUAL');

-- CreateEnum
CREATE TYPE "TagFacet" AS ENUM ('METHOD', 'MAIN', 'MEAL', 'CUISINE', 'EFFORT', 'SEASON', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AppliedBy" AS ENUM ('AUTO', 'USER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "servings_yield" DECIMAL(6,2),
    "servings_unit" TEXT,
    "prep_minutes" INTEGER,
    "cook_minutes" INTEGER,
    "total_minutes" INTEGER,
    "source_type" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "source_url" TEXT,
    "source_name" TEXT,
    "source_author" TEXT,
    "hero_image_url" TEXT,
    "rating" INTEGER,
    "notes" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_lines" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "section" TEXT,
    "raw_text" TEXT NOT NULL,
    "quantity" DECIMAL(8,3),
    "quantity_max" DECIMAL(8,3),
    "unit" TEXT,
    "item" TEXT,
    "preparation" TEXT,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ingredient_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "steps" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "section" TEXT,
    "text" TEXT NOT NULL,
    "timer_seconds" INTEGER,

    CONSTRAINT "steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "facet" "TagFacet" NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_tags" (
    "recipe_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "confidence" DECIMAL(3,2),
    "applied_by" "AppliedBy" NOT NULL DEFAULT 'USER',

    CONSTRAINT "recipe_tags_pkey" PRIMARY KEY ("recipe_id","tag_id")
);

-- CreateTable
CREATE TABLE "recipe_photos" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "is_hero" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cook_logs" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "cooked_on" DATE NOT NULL,
    "notes" TEXT,

    CONSTRAINT "cook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "recipes_user_id_idx" ON "recipes"("user_id");

-- CreateIndex
CREATE INDEX "recipes_user_id_is_archived_idx" ON "recipes"("user_id", "is_archived");

-- CreateIndex
CREATE INDEX "ingredient_lines_recipe_id_position_idx" ON "ingredient_lines"("recipe_id", "position");

-- CreateIndex
CREATE INDEX "steps_recipe_id_position_idx" ON "steps"("recipe_id", "position");

-- CreateIndex
CREATE INDEX "tags_user_id_facet_idx" ON "tags"("user_id", "facet");

-- CreateIndex
CREATE UNIQUE INDEX "tags_user_id_facet_name_key" ON "tags"("user_id", "facet", "name");

-- CreateIndex
CREATE INDEX "recipe_tags_tag_id_idx" ON "recipe_tags"("tag_id");

-- CreateIndex
CREATE INDEX "recipe_photos_recipe_id_idx" ON "recipe_photos"("recipe_id");

-- CreateIndex
CREATE INDEX "cook_logs_recipe_id_cooked_on_idx" ON "cook_logs"("recipe_id", "cooked_on");

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_lines" ADD CONSTRAINT "ingredient_lines_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "steps" ADD CONSTRAINT "steps_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_tags" ADD CONSTRAINT "recipe_tags_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_tags" ADD CONSTRAINT "recipe_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_photos" ADD CONSTRAINT "recipe_photos_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cook_logs" ADD CONSTRAINT "cook_logs_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
