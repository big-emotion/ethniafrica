-- Migration 043 — Weight the AFRIK search vectors so relevance can be ranked
--
-- Context: /api/v2/search has always matched without ranking. Migration 025
-- built one flat, unweighted tsvector per row from name_main plus *every*
-- string in content->'appellations'. A lexeme found in a prose field therefore
-- counted exactly as much as the people's own name. Measured on recette, the
-- query "Bété" returned Amhara first: Amhara's appellations.historicalRegion
-- reads "Wollo (Bete Amhara)", and the French stemmer folds Bété, Bete and
-- Béti onto the single lexeme 'bet'. Meanwhile the route swagger and the
-- OpenAPI spec both described a ts_rank_cd ordering that no code executed —
-- the only sort key in play was the confidence score, which spans 0.57–0.77
-- inside a typical result set and so discriminates almost nothing.
--
-- This migration gives the ranking function of migration 044 something to
-- weigh:
--
--   afrik_peoples     A  name_main, appellations.selfAppellation (the autonym)
--                     B  appellations.exonyms (the names others gave them)
--                     D  the rest of the appellations block — historicalRegion,
--                        originOfExonyms, whyProblematic, contemporaryUsage …
--   afrik_countries   A  name_fr
--                     C  etymology
--
-- The D block is deliberately kept in the index rather than dropped. It is why
-- a reader can find a people through its historical region at all, and the
-- ts_headline excerpt built over the same block is what explains that match
-- back to them. The fix is that prose no longer outranks a name.
--
-- Measured effect on recette, q="Bété": weighted ts_rank spreads the matches
-- across 0.05–0.88 where the unweighted vector held them inside 0.070–0.079.
-- For countries, q="Niger": République du Niger vs Nigeria goes from
-- 0.0865/0.0827 (a 1.05x gap, effectively a coin toss) to 0.6852/0.2482.
--
-- Weights change ranking only: `search_vector @@ websearch_to_tsquery(...)`
-- matches exactly the same rows before and after. The six existing
-- `config: "french"` textSearch call sites therefore keep working unchanged,
-- and this migration is safe to apply on its own, ahead of 044.
--
-- Why DROP COLUMN + ADD COLUMN rather than ALTER COLUMN ... SET EXPRESSION:
-- SET EXPRESSION exists from PostgreSQL 17 and recette runs 17.6, so it is
-- available there — but the production major version is not pinned anywhere in
-- this repository, and SET EXPRESSION rewrites the table regardless. Dropping
-- and re-adding is portable to any supported major, and it makes the index
-- recreation explicit: dropping a column silently drops the indexes over it,
-- and an index that disappears with no line of SQL saying so is how a
-- constraint went missing for months (see migration 039).
--
-- Idempotent: DROP COLUMN IF EXISTS / ADD COLUMN IF NOT EXISTS /
-- CREATE INDEX IF NOT EXISTS. Re-running rebuilds the same column from the
-- same expression. Note this is a full table rewrite under ACCESS EXCLUSIVE:
-- 803 peoples and 54 countries, sub-second, but it is still a lock — do not
-- run it against production during a traffic peak.
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project. 043 must be applied before 044, and both before the
-- application code that calls the new RPC is deployed.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. afrik_peoples
-- ────────────────────────────────────────────────────────────────────────────
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
           COALESCE(content -> 'appellations', '{}'::jsonb),
           '["string"]'::jsonb),
         'D')
  ) STORED;

COMMENT ON COLUMN public.afrik_peoples.search_vector IS
  'Weighted French tsvector: A = name_main + selfAppellation, B = exonyms, D = the rest of content->appellations. Ranked by public.afrik_search_peoples (migration 044).';

-- Dropping the column dropped this index with it.
CREATE INDEX IF NOT EXISTS idx_afrik_peoples_search_vector
  ON public.afrik_peoples USING gin(search_vector);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. afrik_countries
-- ────────────────────────────────────────────────────────────────────────────
-- Same two fields as migration 025, now separated so a country's name
-- outranks a mention inside its etymology. name_origin_actor stays out of the
-- vector: widening the searchable surface is a separate editorial decision
-- from weighting the surface we already have.
ALTER TABLE public.afrik_countries DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.afrik_countries
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('french', COALESCE(name_fr, '')), 'A')
    || setweight(to_tsvector('french', COALESCE(etymology, '')), 'C')
  ) STORED;

COMMENT ON COLUMN public.afrik_countries.search_vector IS
  'Weighted French tsvector: A = name_fr, C = etymology. Ranked by public.afrik_search_countries (migration 044).';

CREATE INDEX IF NOT EXISTS idx_afrik_countries_search_vector
  ON public.afrik_countries USING gin(search_vector);

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- 1. The lexemes now carry weight labels:
--      SELECT search_vector FROM afrik_peoples WHERE id = 'PPL_BETE';
--      -- expect suffixes A / B / D, e.g. 'bet':1A,...
--
-- 2. Both GIN indexes came back after the column drop:
--      SELECT indexname FROM pg_indexes
--       WHERE tablename IN ('afrik_peoples','afrik_countries')
--         AND indexname LIKE '%search_vector%';
--      -- expect 2 rows
--
-- 3. Matching is unchanged — this is what keeps the existing call sites safe.
--    Run before and after; expect the same count (16 on recette today):
--      SELECT count(*) FROM afrik_peoples
--       WHERE search_vector @@ websearch_to_tsquery('french','Bété');
--
-- 4. Ranking now discriminates:
--      SELECT name_main,
--             ts_rank('{0.1,0.3,0.6,1.0}', search_vector,
--                     websearch_to_tsquery('french','Bété')) AS r
--        FROM afrik_peoples
--       WHERE search_vector @@ websearch_to_tsquery('french','Bété')
--       ORDER BY r DESC LIMIT 5;
--      -- expect Béti / Béti-Fang / Bété at the top, Amhara far below
