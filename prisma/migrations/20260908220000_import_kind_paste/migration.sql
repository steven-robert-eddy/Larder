-- Adds the paste-a-blob import path (design doc section 5.4). No trigram
-- indexes or generated columns involved, so this is a plain enum addition
-- — no --create-only cleanup needed, unlike the import_jobs migration.
ALTER TYPE "ImportKind" ADD VALUE 'PASTE';
