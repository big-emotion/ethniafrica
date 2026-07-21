-- Migration 019: Postgres FTS search_vector columns (AR22, FR2, NFR4)
-- Adds GENERATED STORED tsvector columns with GIN indexes on afrik_peoples and
-- afrik_countries for French full-text ranking at scale.
-- Existing rows are backfilled automatically by the generated-column expression.

-- Peoples: name_main + all string values in content->appellations
-- (covers selfAppellation endonym, mainName, and exonyms alt-names)
ALTER TABLE afrik_peoples
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french', COALESCE(name_main, '')) ||
    jsonb_to_tsvector(
      'french',
      COALESCE(content -> 'appellations', '{}'::jsonb),
      '["string"]'::jsonb
    )
  ) STORED;

-- Countries: name_fr + etymology
ALTER TABLE afrik_countries
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'french',
      COALESCE(name_fr, '') || ' ' ||
      COALESCE(etymology, '')
    )
  ) STORED;

-- GIN indexes for O(log n) FTS lookups
CREATE INDEX IF NOT EXISTS idx_afrik_peoples_search_vector
  ON afrik_peoples USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_afrik_countries_search_vector
  ON afrik_countries USING gin(search_vector);
