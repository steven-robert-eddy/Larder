-- Full-text search + fuzzy search support.
-- Prisma's schema DSL can't express generated columns or non-default
-- index types, so this is handwritten rather than generated.

-- Generated tsvector over the fields search should cover on the recipe
-- itself (title, description, notes). Ingredient text is searched
-- separately below and combined at query time -- it lives in a child
-- table, so it can't be folded into a single generated column here.
ALTER TABLE "recipes"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("notes", '')), 'C')
  ) STORED;

CREATE INDEX "recipes_search_vector_idx" ON "recipes" USING GIN ("search_vector");

-- Trigram indexes power fuzzy/typo-tolerant matching (ILIKE '%term%' and
-- similarity()) on top of the exact full-text index above.
CREATE INDEX "recipes_title_trgm_idx" ON "recipes" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "ingredient_lines_raw_text_trgm_idx" ON "ingredient_lines" USING GIN ("raw_text" gin_trgm_ops);
