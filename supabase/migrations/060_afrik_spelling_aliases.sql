-- Migration 060 — Add editorial spelling-alias column, indexed at exonym weight (DEC-034, ETNI-1408)
--
-- Context: an entity known under an alternate spelling ("Gour" for "Gur")
-- never surfaces today, even though REQ-002 already requires alternate-
-- spelling search to work. DEC-034 (published, Pending) covers two parts: a
-- per-entity, editorially-filled alias column indexed at the same weight as
-- exonyms, and a trigram fuzzy search on top of it. This migration is the
-- first part only — the DB foundation. The trigram/fuzzy-typo layer is out of
-- scope here and is tracked as the DEC-034 follow-up bug-fix ticket.
--
-- Adds a plain JSONB array column, spelling_aliases, to afrik_peoples and
-- afrik_languages — sibling to content rather than nested inside it, mirroring
-- how afrik_countries.summary sits beside content (migration 045). It is
-- editorial content, not a source, so the Source Tier policy is not engaged.
--
-- Folded into search_vector at Weight B, the same weight migrations 043/058
-- already give appellations.exonyms on afrik_peoples and migration 055 gives
-- content->alternateNames on afrik_languages: an alias is exactly as strong a
-- match signal as an exonym, and both stay strictly below the canonical name
-- (Weight A).
--
-- Why DROP COLUMN + ADD COLUMN rather than ALTER COLUMN ... SET EXPRESSION:
-- same reasoning as migrations 043/055/056/058/059 — SET EXPRESSION is PG17+
-- only and still rewrites the table, so this stays portable across majors and
-- makes the index rebuild explicit rather than implicit in a column drop.
--
-- Idempotent: DROP COLUMN IF EXISTS / ADD COLUMN IF NOT EXISTS /
-- CREATE INDEX IF NOT EXISTS throughout. Full table rewrite under ACCESS
-- EXCLUSIVE, but the corpus holds ~803 peoples and a few hundred languages —
-- sub-second, same order of magnitude as 043/055/058.
--
-- Out of scope: trigram/pg_trgm fuzzy search (separate DEC-034 follow-up),
-- editorial backfill of alias values into fiches, UI display.
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project (jajggbeimfudpzcxytbb) by hand. Migration-queue
-- position 5 of the program, after 059 (ETNI-1405). Must not merge
-- concurrently with any other migration in the program (check:migration-files
-- rejects a duplicate version and a hole in the sequence).

-- ────────────────────────────────────────────────────────────────────────────
-- 1. afrik_peoples
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.afrik_peoples
  ADD COLUMN IF NOT EXISTS spelling_aliases JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.afrik_peoples.spelling_aliases IS
  'Editorial array of alternate spellings for this people (e.g. "Gour" for "Gur"), indexed at search_vector Weight B alongside exonyms — DEC-034, ETNI-1408.';

ALTER TABLE public.afrik_peoples DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.afrik_peoples
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('french', COALESCE(name_main, '')), 'A')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(content -> 'appellations' -> 'selfAppellation', '""'::jsonb),
           '["string"]'::jsonb),
         'A')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(content -> 'appellations' -> 'exonyms', '[]'::jsonb),
           '["string"]'::jsonb),
         'B')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(spelling_aliases, '[]'::jsonb),
           '["string"]'::jsonb),
         'B')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(content -> 'appellations', '{}'::jsonb),
           '["string"]'::jsonb),
         'D')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(content -> 'origins', '{}'::jsonb),
           '["string"]'::jsonb),
         'D')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(content -> 'organization', '{}'::jsonb),
           '["string"]'::jsonb),
         'D')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(content -> 'ethnicities', '[]'::jsonb),
           '["string"]'::jsonb),
         'D')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(content -> 'culture', '{}'::jsonb),
           '["string"]'::jsonb),
         'D')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(content -> 'historicalRole', '{}'::jsonb),
           '["string"]'::jsonb),
         'D')
  ) STORED;

COMMENT ON COLUMN public.afrik_peoples.search_vector IS
  'Weighted French tsvector: A = name_main + selfAppellation, B = exonyms + spelling_aliases, D = the rest of content->appellations plus content->origins, ->organization, ->ethnicities, ->culture, ->historicalRole. Ranked by public.afrik_search_peoples (migration 044) — DEC-034, ETNI-1408.';

-- Dropping the column dropped this index with it.
CREATE INDEX IF NOT EXISTS idx_afrik_peoples_search_vector
  ON public.afrik_peoples USING gin(search_vector);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. afrik_languages
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.afrik_languages
  ADD COLUMN IF NOT EXISTS spelling_aliases JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.afrik_languages.spelling_aliases IS
  'Editorial array of alternate spellings for this language, indexed at search_vector Weight B alongside content->alternateNames — DEC-034, ETNI-1408.';

ALTER TABLE public.afrik_languages DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.afrik_languages
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', COALESCE(id, '')), 'A')
    || CASE
         WHEN COALESCE(content ->> 'nameProvenance', 'sourced') = 'derived'
           THEN setweight(to_tsvector('french', COALESCE(name, '')), 'C')
         ELSE setweight(to_tsvector('french', COALESCE(name, '')), 'A')
       END
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(content -> 'alternateNames', '[]'::jsonb),
           '["string"]'::jsonb),
         'B')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(spelling_aliases, '[]'::jsonb),
           '["string"]'::jsonb),
         'B')
  ) STORED;

COMMENT ON COLUMN public.afrik_languages.search_vector IS
  'Weighted language search document: A = ISO 639-3 id and sourced canonical '
  'name, B = attested alternate names and spelling_aliases, C = a canonical '
  'name derived from people fiches. Provenance comes from '
  'content.nameProvenance (ETNI-1502). Aliases per DEC-034, ETNI-1408.';

CREATE INDEX IF NOT EXISTS idx_afrik_languages_search_vector
  ON public.afrik_languages USING gin(search_vector);

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- 1. Both columns exist, defaulting to an empty array:
--      SELECT spelling_aliases FROM afrik_peoples LIMIT 1;
--      SELECT spelling_aliases FROM afrik_languages LIMIT 1;
--      -- expect '[]' where no alias has been set editorially
--
-- 2. Both GIN indexes came back after the column drop:
--      SELECT indexname FROM pg_indexes
--       WHERE tablename IN ('afrik_peoples','afrik_languages')
--         AND indexname LIKE '%search_vector%';
--      -- expect 2 rows
--
-- 3. AC — a declared alias surfaces the entity even though it never appears
--    in name_main/appellations or name/alternateNames:
--      UPDATE afrik_peoples SET spelling_aliases = '["Gour"]'::jsonb
--       WHERE id = '<the Gur people id>';
--      SELECT id FROM afrik_peoples
--       WHERE search_vector @@ websearch_to_tsquery('french', 'gour');
--      -- expect that row
--
-- 4. Ranking still puts a name match above an alias match for the same term
--    (weight A > B), via the migration-044 ranking function.
