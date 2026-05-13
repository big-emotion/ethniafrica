-- Migration 013: Add severity and auto_generated to flags
-- Required by Story 0.20 (FR31) - URL health -> confidence recompute hook.
--
-- Adds the fields needed by the nightly data-integrity job to distinguish
-- automatically-opened flags (e.g. `unreachable_source`) from human-curated
-- ones, and to expose a severity level to public consumers.
ALTER TABLE flags
  ADD COLUMN IF NOT EXISTS severity TEXT
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_flags_flag_type ON flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_flags_auto_generated ON flags(auto_generated)
  WHERE auto_generated = TRUE;
