-- Normalize source references while preserving the existing source_ids boundary.
-- ETNI-666
--
-- This migration is deliberately additive. Legacy assertions keep their
-- source_ids array until the compatibility audit reports no remaining strings.

ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS source_key TEXT,
  ADD COLUMN IF NOT EXISTS source_kind TEXT,
  ADD COLUMN IF NOT EXISTS evidence_tier SMALLINT,
  ADD COLUMN IF NOT EXISTS identifiers JSONB NOT NULL DEFAULT '{}'::JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sources_source_key_key'
  ) THEN
    ALTER TABLE sources
      ADD CONSTRAINT sources_source_key_key UNIQUE (source_key);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sources_source_kind_check'
  ) THEN
    ALTER TABLE sources
      ADD CONSTRAINT sources_source_kind_check
      CHECK (
        source_kind IS NULL
        OR source_kind IN (
          'intergovernmental', 'government', 'official_statistics',
          'linguistic_reference', 'academic', 'community', 'repository',
          'archive', 'discovery', 'ai_generated', 'unknown'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sources_evidence_tier_check'
  ) THEN
    ALTER TABLE sources
      ADD CONSTRAINT sources_evidence_tier_check
      CHECK (evidence_tier IS NULL OR evidence_tier IN (1, 2));
  END IF;
END $$;

COMMENT ON COLUMN sources.source_key IS
  'Stable, deterministic source identifier assigned by the ETNI-666 migration boundary.';
COMMENT ON COLUMN sources.source_kind IS
  'Structured citation kind. NULL is retained only for legacy rows awaiting review.';
COMMENT ON COLUMN sources.evidence_tier IS
  'Authorized evidence tier: 1 or 2. NULL means the citation needs review.';
COMMENT ON COLUMN sources.identifiers IS
  'Bibliographic or archival identifiers such as ISBN, DOI, catalogue, or call number.';

CREATE TABLE IF NOT EXISTS assertion_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assertion_id UUID NOT NULL REFERENCES assertions(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  locator_type TEXT NOT NULL,
  locator_value TEXT NOT NULL,
  legacy_raw_citation TEXT,
  review_status TEXT NOT NULL DEFAULT 'verified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assertion_references_locator_type_check
    CHECK (locator_type IN ('page', 'folio', 'section', 'timestamp')),
  CONSTRAINT assertion_references_review_status_check
    CHECK (review_status IN ('verified', 'review_required')),
  CONSTRAINT assertion_references_unique_locator
    UNIQUE (assertion_id, source_id, locator_type, locator_value)
);

CREATE INDEX IF NOT EXISTS idx_assertion_references_assertion_id
  ON assertion_references(assertion_id);
CREATE INDEX IF NOT EXISTS idx_assertion_references_source_id
  ON assertion_references(source_id);

COMMENT ON TABLE assertion_references IS
  'Normalized source links for assertions, including precise evidence locators.';
COMMENT ON COLUMN assertion_references.legacy_raw_citation IS
  'Byte-for-byte original legacy citation retained during the compatibility boundary.';
COMMENT ON COLUMN assertion_references.review_status IS
  'verified for structured references; review_required when legacy metadata is unknown.';
