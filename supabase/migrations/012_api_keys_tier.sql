-- Migration 012: Add tier, label, created_by columns to api_keys
-- Adds tier (public|partner|admin), label, and created_by fields per ETNI-173

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'public'
    CHECK (tier IN ('public', 'partner', 'admin')),
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID;

COMMENT ON COLUMN api_keys.tier IS 'Key tier: public (read-only, IP-bound), partner, or admin';
COMMENT ON COLUMN api_keys.label IS 'Human-readable label for the key';
COMMENT ON COLUMN api_keys.created_by IS 'UUID of the admin who created the key';
