-- Migration 009: Classification Status Enum
-- Adds classification_status enum type for tracking data classification state
-- Adds nullable classification_status column to afrik_peoples and afrik_language_families

-- Create classification_status enum type (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'classification_status') THEN
    CREATE TYPE classification_status AS ENUM (
      'consensual',
      'contested',
      'colonial-legacy',
      'reconstructive'
    );
  END IF;
END
$$;

COMMENT ON TYPE classification_status IS 'Classification status for ethnolinguistic data: consensual (widely accepted), contested (disputed), colonial-legacy (colonial-era classification), reconstructive (reconstructed from historical sources)';

-- Add classification_status column to afrik_peoples (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'afrik_peoples' AND column_name = 'classification_status'
  ) THEN
    ALTER TABLE afrik_peoples ADD COLUMN classification_status classification_status;
  END IF;
END
$$;

COMMENT ON COLUMN afrik_peoples.classification_status IS 'Classification status indicating the scholarly consensus level of this people group classification';

-- Add classification_status column to afrik_language_families (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'afrik_language_families' AND column_name = 'classification_status'
  ) THEN
    ALTER TABLE afrik_language_families ADD COLUMN classification_status classification_status;
  END IF;
END
$$;

COMMENT ON COLUMN afrik_language_families.classification_status IS 'Classification status indicating the scholarly consensus level of this language family classification';
