-- Migration 058 — Widen afrik_peoples.search_vector to five prose sections (DEC-028, ETNI-1402)
--
-- Context: migration 043 already weights afrik_peoples.search_vector, but only
-- over content->appellations (name_main at A, selfAppellation at A, exonyms at
-- B, the rest of appellations at D). The other eight content sections of a
-- people fiche — origins, organization, ethnicities, languages, culture,
-- historicalRole, demography, sources — are fetched but never indexed. A
-- proper name or event mentioned only in that prose ("Soundiata", who never
-- appears in appellations but does in a people's historicalRole/origins
-- prose) is therefore unreachable by search. DEC-028 closes this gap for
-- people fiches the same way migration 056 already closed it for language
-- families' decolonialHeader block.
--
-- The five sections indexed here — origins, organization, ethnicities,
-- culture, historicalRole — are the prose-bearing content sub-objects of
-- public/modele-peuple.json left over after excluding appellations (already
-- indexed by 043), demography (numeric/structured, not prose) and languages
-- (mostly ISO codes and a single role field, not prose). This matches DEC-028
-- as published on Confluence (page 178388993, DEC-028): "The search vector is
-- extended to the prose of peoples and countries."
--
-- Same weighting shape as migrations 043/056:
--
--   A  name_main, appellations.selfAppellation        (unchanged from 043)
--   B  appellations.exonyms                            (unchanged from 043)
--   D  content->appellations (rest), plus content->origins, ->organization,
--      ->ethnicities, ->culture, ->historicalRole — flattened
--
-- jsonb_to_tsvector with a '["string"]' filter walks every string value in
-- each section regardless of nesting depth, the same technique 043 uses for
-- appellations and 056 uses for decolonialHeader. `ethnicities` is a plain
-- string array (subgroup names, e.g. ["Ashanti","Fante"]), so the same filter
-- applies unchanged.
--
-- Why DROP COLUMN + ADD COLUMN rather than ALTER COLUMN ... SET EXPRESSION:
-- same reasoning as migrations 043/056 — SET EXPRESSION is PG17+ only and
-- still rewrites the table, so this stays portable across majors and makes
-- the index rebuild explicit rather than implicit in a column drop.
--
-- Idempotent: DROP COLUMN IF EXISTS / ADD COLUMN IF NOT EXISTS /
-- CREATE INDEX IF NOT EXISTS. Full table rewrite under ACCESS EXCLUSIVE, but
-- the corpus holds ~803 peoples — sub-second, same order of magnitude as 043.
--
-- Out of scope: no application query change (peoples.ts and search.ts already
-- read/rank search_vector unchanged since 043/044), no OpenAPI change (the
-- search contract does not change, only recall widens), no fiche content or
-- sources added (Source Tier policy is not engaged — this indexes existing
-- prose only).
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project (jajggbeimfudpzcxytbb) by hand. Migration-queue
-- position 3 of the DEC-028 program, after 056 (ETNI-1400). Must not merge
-- concurrently with any other migration in the program (check:migration-files
-- rejects a duplicate version and a hole in the sequence).

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
  'Weighted French tsvector: A = name_main + selfAppellation, B = exonyms, D = the rest of content->appellations plus content->origins, ->organization, ->ethnicities, ->culture, ->historicalRole. Ranked by public.afrik_search_peoples (migration 044) — DEC-028, ETNI-1402.';

-- Dropping the column dropped this index with it.
CREATE INDEX IF NOT EXISTS idx_afrik_peoples_search_vector
  ON public.afrik_peoples USING gin(search_vector);

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- 1. The lexemes carry weight labels, including D from the newly-indexed
--    sections:
--      SELECT search_vector FROM afrik_peoples WHERE id = '<a people whose
--        historicalRole or origins prose names a historical figure>';
--      -- expect suffixes A / B / D
--
-- 2. The GIN index came back after the column drop:
--      SELECT indexname FROM pg_indexes
--       WHERE tablename = 'afrik_peoples'
--         AND indexname = 'idx_afrik_peoples_search_vector';
--      -- expect 1 row
--
-- 3. AC — a term found only in a newly-indexed prose section surfaces the
--    people even though it is absent from name_main and appellations:
--      SELECT id FROM afrik_peoples
--       WHERE search_vector @@ websearch_to_tsquery('french', 'Soundiata');
--      -- expect the Mandinka/Malinké-family fiche whose historicalRole or
--      -- origins prose names Soundiata Keïta, even though "Soundiata" is not
--      -- their name_main or an appellation
--
-- 4. Ranking still puts a name match above a prose match for the same term
--    (weight A > D), via the migration-044 ranking function:
--      SELECT name_main,
--             ts_rank('{0.1,0.3,0.6,1.0}', search_vector,
--                     websearch_to_tsquery('french','Soundiata')) AS r
--        FROM afrik_peoples
--       WHERE search_vector @@ websearch_to_tsquery('french','Soundiata')
--       ORDER BY r DESC LIMIT 5;
--      -- expect any people literally named "Soundiata" (weight A) ranked
--      -- above the prose-only match (weight D)
