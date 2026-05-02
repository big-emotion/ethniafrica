-- Migration 009: Classification Status Enum
-- Adds classification_status enum to track the scholarly consensus status
-- of taxonomic classifications for peoples and language families

-- Create the classification_status enum type (idempotent)
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

COMMENT ON TYPE classification_status IS 'Status indicating scholarly consensus level of a taxonomic classification: consensual (widely accepted), contested (actively debated), colonial-legacy (historically imposed, being reconsidered), reconstructive (being rebuilt from indigenous perspectives)';

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

COMMENT ON COLUMN afrik_peoples.classification_status IS 'Scholarly consensus status of this people''s taxonomic classification';

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

COMMENT ON COLUMN afrik_language_families.classification_status IS 'Scholarly consensus status of this language family''s taxonomic classification';
