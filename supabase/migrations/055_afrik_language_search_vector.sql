-- Migration 055 — make AFRIK languages searchable by ISO code and name
--
-- Story: ETNI-1504 (REQ-136, ARCH-020).
--
-- Languages already have a public table, but unlike peoples and countries
-- they have no text-search vector. This migration gives each row a stored,
-- weighted document:
--
--   A  ISO 639-3 id and a sourced canonical name
--   B  attested alternate names
--   C  a canonical name derived from people fiches
--
-- ETNI-1502 owns the loader and writes the provenance contract consumed here:
-- content.nameProvenance is "sourced" or "derived", while
-- content.alternateNames is the attested-name array. Missing provenance is
-- treated as sourced so an existing row does not silently lose the authority
-- of its canonical name when this migration lands.
--
-- The ISO code uses the simple configuration so the identifier is preserved
-- as written. Human-readable names use the French configuration, matching the
-- existing AFRIK search vectors. The sourced/derived split changes ranking,
-- not matching: both canonical names remain in the vector.
--
-- Idempotent: dropping the generated column also drops its dependent index;
-- the column and GIN index are then recreated explicitly. This migration is
-- committed for human application and is not applied by the ticket workflow.

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
  ) STORED;

COMMENT ON COLUMN public.afrik_languages.search_vector IS
  'Weighted language search document: A = ISO 639-3 id and sourced canonical '
  'name, B = attested alternate names, C = a canonical name derived from '
  'people fiches. Provenance comes from content.nameProvenance (ETNI-1502).';

CREATE INDEX IF NOT EXISTS idx_afrik_languages_search_vector
  ON public.afrik_languages USING gin(search_vector);

-- Verification after human application:
--
-- 1. ISO code lexemes carry the highest weight:
--      SELECT id, search_vector FROM public.afrik_languages WHERE id = 'yor';
--      -- expect the "yor" lexeme with weight A
--
-- 2. At equal textual match, sourced outranks derived:
--      SELECT id, name, content ->> 'nameProvenance' AS provenance,
--             ts_rank('{0.1,0.3,0.6,1.0}', search_vector,
--                     websearch_to_tsquery('french', name)) AS relevance
--        FROM public.afrik_languages
--       ORDER BY relevance DESC;
--      -- expect a sourced canonical-name match above an equal derived match
--
-- 3. The GIN index exists:
--      SELECT indexname FROM pg_indexes
--       WHERE tablename = 'afrik_languages'
--         AND indexname = 'idx_afrik_languages_search_vector';
--      -- expect 1 row
