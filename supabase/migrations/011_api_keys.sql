-- Migration 011: API Keys Table
-- Creates the api_keys table for API key management.
-- SECURITY NOTE: This table stores hashed API keys only, never raw keys.
-- The key_hash column should contain a secure hash (e.g., SHA-256) of the actual API key.

-- =============================================================================
-- Table: api_keys
-- Stores API keys for programmatic access to the system
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID,
  scopes TEXT[] DEFAULT '{}',
  rate_limit INTEGER DEFAULT 1000,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

COMMENT ON TABLE api_keys IS 'Stores API keys for programmatic access. SECURITY: Only hashed keys are stored, never raw keys. Use a secure hashing algorithm (SHA-256 or better) before storing.';
COMMENT ON COLUMN api_keys.key_hash IS 'Secure hash of the API key - never store raw keys';
COMMENT ON COLUMN api_keys.name IS 'Human-readable identifier for the key';
COMMENT ON COLUMN api_keys.user_id IS 'Optional owner of the API key';
COMMENT ON COLUMN api_keys.scopes IS 'Array of permission scopes (e.g., read:peoples, read:families)';
COMMENT ON COLUMN api_keys.rate_limit IS 'Maximum requests per hour allowed for this key';
COMMENT ON COLUMN api_keys.active IS 'Whether the key is currently active';
COMMENT ON COLUMN api_keys.expires_at IS 'Optional expiration timestamp';
COMMENT ON COLUMN api_keys.last_used_at IS 'Timestamp of last successful use';
COMMENT ON COLUMN api_keys.revoked_at IS 'Timestamp when the key was revoked';

-- =============================================================================
-- Row Level Security
-- Read public, write denied (same pattern as other tables)
-- =============================================================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Key owners can read their own keys; key_hash is never exposed to other users
CREATE POLICY api_keys_read_owner ON api_keys FOR SELECT USING (auth.uid() = user_id);
-- Note: No write policies = write denied by default with RLS enabled

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);

-- =============================================================================
-- Function: update_api_key_last_used
-- Validates an API key and updates its last_used_at timestamp
-- Returns TRUE if the key is valid and active, FALSE otherwise
-- =============================================================================
DROP FUNCTION IF EXISTS update_api_key_last_used(TEXT);
CREATE OR REPLACE FUNCTION update_api_key_last_used(p_key_hash TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_active BOOLEAN;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT active, expires_at INTO v_active, v_expires_at
  FROM api_keys WHERE key_hash = p_key_hash;
  
  IF NOT FOUND OR NOT v_active THEN
    RETURN FALSE;
  END IF;
  
  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = p_key_hash;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_api_key_last_used(TEXT) IS 'Validates an API key hash and updates last_used_at. Returns TRUE if valid and active, FALSE if not found, inactive, or expired.';
