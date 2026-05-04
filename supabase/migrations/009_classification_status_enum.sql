-- Migration 009: Classification Status Enum
-- Adds classification_status enum to track the scholarly status of classifications
-- for peoples and language families in the AFRIK schema.

-- Create enum type (idempotent)
-- This enum captures the epistemic status of classifications, acknowledging
-- that categorizations may be contested, inherited from colonial-era systems,
-- or actively being reconstructed.
DO $$ BEGIN
  CREATE TYPE classification_status AS ENUM (
    'consensual',       -- Widely accepted classification among scholars
    'contested',        -- Classification that is debated among scholars
    'colonial-legacy',  -- Classification inherited from colonial-era categorizations
    'reconstructive'    -- Classification being actively reconstructed/decolonized
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add comment on the enum type
COMMENT ON TYPE classification_status IS 'Epistemic status of a classification: consensual (widely accepted), contested (debated), colonial-legacy (inherited from colonial era), or reconstructive (being decolonized)';

-- Add column to afrik_peoples (idempotent)
-- Nullable: not all peoples may have a determined classification status yet
ALTER TABLE afrik_peoples 
ADD COLUMN IF NOT EXISTS classification_status classification_status;

COMMENT ON COLUMN afrik_peoples.classification_status IS 'Epistemic status of how this people is classified - may be consensual, contested, colonial-legacy, or reconstructive';

-- Add column to afrik_language_families (idempotent)
-- Nullable: not all language families may have a determined classification status yet
ALTER TABLE afrik_language_families 
ADD COLUMN IF NOT EXISTS classification_status classification_status;

COMMENT ON COLUMN afrik_language_families.classification_status IS 'Epistemic status of how this language family is classified - may be consensual, contested, colonial-legacy, or reconstructive';
