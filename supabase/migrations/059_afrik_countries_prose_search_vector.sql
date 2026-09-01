-- Migration 059 — Widen afrik_countries.search_vector to six prose sections (DEC-028, ETNI-1405)
--
-- Context: migration 043 weights afrik_countries.search_vector over only two
-- fields, name_fr (A) and etymology (C). Every prose section of
-- public/modele-pays.json — summary, historicalNames.*, historicalFacts.*,
-- culture.*, kingdoms[].historicalRole, majorPeoples[].appellationRemarks —
-- is fetched but never indexed. "Keïta" appears thirty-three times across
-- that prose and a search for it returns nothing today. DEC-028 closes this
-- gap for country fiches the same way migration 056 closed it for language
-- families and migration 058 closed it for peoples, completing the
-- family -> people -> country coverage the decision describes.
--
-- The six sections indexed here are exactly the ones DEC-028 names, no more:
--
--   A  name_fr                                          (unchanged from 043)
--   C  etymology                                         (unchanged from 043)
--   D  summary, content->historicalNames, ->historicalFacts, ->culture
--      (flattened whole objects, same jsonb_to_tsvector technique as 043's
--      D block, 056 and 058), plus content->kingdoms[].historicalRole and
--      content->majorPeoples[].appellationRemarks — a single field lifted
--      out of each array element, not the whole array element, because
--      DEC-028 names only that field of each: the rest of a kingdom
--      (name, period, dominantPeoples, politicalCenters) and of a
--      majorPeoples entry (name, selfAppellation, exonyms, peopleId,
--      mainRegion, languages, languageFamily) is structured lookup data,
--      not prose, and stays out of the vector. jsonb_path_query_array
--      extracts that one field per array element into a flat jsonb array,
--      which jsonb_to_tsvector's '["string"]' filter then walks the same
--      way it walks any other section.
--
-- content->demographics and content->sources are deliberately excluded, same
-- reasoning as 058's exclusion of afrik_peoples' demography and sources:
-- numeric/structured, not prose.
--
-- Migration 045 added the `summary` column and at the time deliberately kept
-- it out of the search vector, reasoning that it restates name_fr/etymology
-- lexemes already weighted. DEC-028 revisits that: the chapeau's own prose
-- ("Ouvre sur l'histoire du nom quand elle est parlante") routinely carries
-- phrasing absent from the shorter name_fr and etymology fields, so it is
-- indexed here at D alongside the other prose sections.
--
-- Why DROP COLUMN + ADD COLUMN rather than ALTER COLUMN ... SET EXPRESSION:
-- same reasoning as migrations 043/056/058 — SET EXPRESSION is PG17+ only and
-- still rewrites the table, so this stays portable across majors and makes
-- the index rebuild explicit rather than implicit in a column drop.
--
-- Idempotent: DROP COLUMN IF EXISTS / ADD COLUMN IF NOT EXISTS /
-- CREATE INDEX IF NOT EXISTS. Full table rewrite under ACCESS EXCLUSIVE, but
-- the corpus holds 54 countries — sub-second, same order of magnitude as 043.
--
-- Out of scope: no application query change (countries.ts and search.ts
-- already read/rank search_vector unchanged since 043/044), no OpenAPI
-- change (the search contract does not change, only recall widens), no fiche
-- content or sources added (Source Tier policy is not engaged — this indexes
-- existing prose only).
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project (jajggbeimfudpzcxytbb) by hand. Migration-queue
-- position 4 of the DEC-028 program, after 058 (ETNI-1402). Must not merge
-- concurrently with any other migration in the program (check:migration-files
-- rejects a duplicate version and a hole in the sequence).

ALTER TABLE public.afrik_countries DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.afrik_countries
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('french', COALESCE(name_fr, '')), 'A')
    || setweight(to_tsvector('french', COALESCE(etymology, '')), 'C')
    || setweight(to_tsvector('french', COALESCE(summary, '')), 'D')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(content -> 'historicalNames', '{}'::jsonb),
           '["string"]'::jsonb),
         'D')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(content -> 'historicalFacts', '{}'::jsonb),
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
           COALESCE(
             jsonb_path_query_array(content, '$.kingdoms[*].historicalRole'),
             '[]'::jsonb),
           '["string"]'::jsonb),
         'D')
    || setweight(
         jsonb_to_tsvector(
           'french',
           COALESCE(
             jsonb_path_query_array(
               content, '$.majorPeoples[*].appellationRemarks'),
             '[]'::jsonb),
           '["string"]'::jsonb),
         'D')
  ) STORED;

COMMENT ON COLUMN public.afrik_countries.search_vector IS
  'Weighted French tsvector: A = name_fr, C = etymology, D = summary plus content->historicalNames, ->historicalFacts, ->culture, ->kingdoms[].historicalRole, ->majorPeoples[].appellationRemarks. Ranked by public.afrik_search_countries (migration 044) — DEC-028, ETNI-1405.';

-- Dropping the column dropped this index with it.
CREATE INDEX IF NOT EXISTS idx_afrik_countries_search_vector
  ON public.afrik_countries USING gin(search_vector);

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- 1. The lexemes carry weight labels, including D from the newly-indexed
--    sections:
--      SELECT search_vector FROM afrik_countries WHERE id = '<a country whose
--        kingdoms[].historicalRole or historicalFacts prose names Keïta>';
--      -- expect suffixes A / C / D
--
-- 2. The GIN index came back after the column drop:
--      SELECT indexname FROM pg_indexes
--       WHERE tablename = 'afrik_countries'
--         AND indexname = 'idx_afrik_countries_search_vector';
--      -- expect 1 row
--
-- 3. AC — a term found only in a newly-indexed prose section surfaces the
--    country even though it is absent from name_fr and etymology:
--      SELECT id FROM afrik_countries
--       WHERE search_vector @@ websearch_to_tsquery('french', 'Keïta');
--      -- expect the Mali fiche (and any other whose kingdoms/historicalFacts
--      -- prose names a Keïta), even though "Keïta" is not their name_fr or
--      -- etymology
--
-- 4. Ranking still puts a name match above a prose match for the same term
--    (weight A > D), via the migration-044 ranking function:
--      SELECT name_fr,
--             ts_rank('{0.1,0.3,0.6,1.0}', search_vector,
--                     websearch_to_tsquery('french','Keïta')) AS r
--        FROM afrik_countries
--       WHERE search_vector @@ websearch_to_tsquery('french','Keïta')
--       ORDER BY r DESC LIMIT 5;
--      -- expect a country literally named "Keïta" (weight A), if any, ranked
--      -- above the prose-only match (weight D)
