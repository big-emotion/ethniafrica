-- Migration 012: Add tier, label, created_by, key_prefix, and ip_address columns to api_keys
-- Adds tier (public|partner|admin), label, created_by for ETNI-173
-- Adds key_prefix (first 20 chars of raw key) for fast PBKDF2 lookup without full scan
-- Adds ip_address for IP-binding of public-tier keys

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'public'
    CHECK (tier IN ('public', 'partner', 'admin')),
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS key_prefix TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_ip_tier ON api_keys(ip_address, tier);

COMMENT ON COLUMN api_keys.tier IS 'Key tier: public (read-only, IP-bound), partner, or admin';
COMMENT ON COLUMN api_keys.label IS 'Human-readable label for the key';
COMMENT ON COLUMN api_keys.created_by IS 'UUID of the admin who created the key';
COMMENT ON COLUMN api_keys.key_prefix IS 'Plaintext prefix (first 20 chars) of the raw key for fast lookup — not a secret';
COMMENT ON COLUMN api_keys.ip_address IS 'IP address of requester; enforces one public key per IP';
