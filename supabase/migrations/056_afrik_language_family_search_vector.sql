-- Migration 056 — Search vector for afrik_language_families (DEC-028, ETNI-1400)
--
-- Context: a family whose only mention of a searched term sits inside its
-- decolonial text (content->decolonialHeader — whyProblematic,
-- contemporaryUsage, originOfHistoricalTerm, historicalAppellations,
-- selfAppellation) is invisible to search today. The families arm of
-- ftsSearchEntities (src/lib/supabase/queries/afrik/search.ts) fetches every
-- family and keeps only the ones whose name_fr contains the term — prose is
-- fetched into `content` but never read for matching. DEC-028 closes this
-- gap by indexing that prose, starting with families; the later extension to
-- people and country fiches already shipped in migrations 043/044.
--
-- Same weighting shape as migration 043's afrik_peoples/afrik_countries
-- columns, scaled to what a family fiche actually has:
--
--   A  name_fr, name_en — the family's own name outranks a prose mention.
--   D  content->decolonialHeader, flattened — the block this migration
--      exists to make searchable at all.
--
-- jsonb_to_tsvector with a '["string"]' filter walks every string value in
-- the decolonialHeader object regardless of which of its five keys carries
-- the match, the same technique 043 uses for afrik_peoples.content->
-- appellations. No other part of `content` is indexed: generalInfo and
-- associatedPeoples are structured data, not the prose DEC-028 is about.
--
-- Why DROP COLUMN + ADD COLUMN rather than ALTER COLUMN ... SET EXPRESSION:
-- same reasoning as migration 043 — SET EXPRESSION is PG17+ only and still
-- rewrites the table, so this stays portable and makes the index rebuild
-- explicit rather than implicit in a column drop.
--
-- Idempotent: DROP COLUMN IF EXISTS / ADD COLUMN IF NOT EXISTS /
-- CREATE INDEX IF NOT EXISTS. Full table rewrite under ACCESS EXCLUSIVE, but
-- the corpus holds ~24 families — sub-second.
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project (jajggbeimfudpzcxytbb) by hand. Application code
-- (searchAfrikLanguageFamilies) depends on this column existing — deploy
-- this migration to a project before the code that queries it reaches that
-- project, or the query answers PGRST204 (unknown column).

ALTER TABLE public.afrik_language_families DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.afrik_language_families
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('french', COALESCE(name_fr, '')), 'A')
    || setweight(to_tsvector('french', COALESCE(name_en, '')), 'A')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(content -> 'decolonialHeader', '{}'::jsonb),
           '["string"]'::jsonb),
         'D')
  ) STORED;

COMMENT ON COLUMN public.afrik_language_families.search_vector IS
  'Weighted French tsvector: A = name_fr + name_en, D = every string in content->decolonialHeader (whyProblematic, contemporaryUsage, originOfHistoricalTerm, historicalAppellations, selfAppellation). Queried by searchAfrikLanguageFamiliesByText (src/lib/supabase/queries/afrik/languageFamilies.ts) — DEC-028, ETNI-1400.';

-- Dropping the column dropped this index with it.
CREATE INDEX IF NOT EXISTS idx_afrik_language_families_search_vector
  ON public.afrik_language_families USING gin(search_vector);

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- 1. The lexemes carry weight labels:
--      SELECT search_vector FROM afrik_language_families WHERE id = 'FLG_KROU';
--      -- expect suffixes A (from "Krou"/"Kru") and D (from decolonialHeader prose)
--
-- 2. The GIN index came back after the column drop:
--      SELECT indexname FROM pg_indexes
--       WHERE tablename = 'afrik_language_families'
--         AND indexname = 'idx_afrik_language_families_search_vector';
--      -- expect 1 row
--
-- 3. AC — a term found only in decolonial text surfaces the family:
--      SELECT id FROM afrik_language_families
--       WHERE search_vector @@ websearch_to_tsquery('french', 'administrateurs');
--      -- expect FLG_KROU (whyProblematic mentions "administrateurs coloniaux"),
--      -- even though neither "Krou" nor "Kru" contains that term
--
-- 4. Name matching still works unchanged:
--      SELECT id FROM afrik_language_families
--       WHERE search_vector @@ websearch_to_tsquery('french', 'Krou');
--      -- expect FLG_KROU
