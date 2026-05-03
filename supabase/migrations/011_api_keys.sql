-- Migration 011: API Keys
-- Creates table for API keys for external access

-- =============================================================================
-- Function: update_updated_at_column (idempotent guard)
-- Purpose: Ensure the trigger function exists even if migration 010 was skipped
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Table: api_keys
-- Purpose: API keys for external access
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    user_id UUID,
    permissions JSONB NOT NULL DEFAULT '{}',
    rate_limit INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT api_keys_key_hash_unique UNIQUE (key_hash),
    CONSTRAINT api_keys_key_prefix_unique UNIQUE (key_prefix)
);

COMMENT ON TABLE api_keys IS 'API keys for external access';
COMMENT ON COLUMN api_keys.name IS 'Human-readable name for the key';
COMMENT ON COLUMN api_keys.key_hash IS 'Hashed version of the API key, never store plaintext';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters for identification, e.g., "etni_abc"';
COMMENT ON COLUMN api_keys.user_id IS 'UUID of the user who owns this key';
COMMENT ON COLUMN api_keys.permissions IS 'Granted permissions/scopes as JSON';
COMMENT ON COLUMN api_keys.rate_limit IS 'Requests per hour';
COMMENT ON COLUMN api_keys.is_active IS 'Whether the key is currently active';
COMMENT ON COLUMN api_keys.last_used_at IS 'Timestamp of last usage';
COMMENT ON COLUMN api_keys.expires_at IS 'Expiration timestamp for expiring keys';

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys (key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys (is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys (expires_at);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Public read is intentionally restricted: key_hash must never be exposed.
-- Only the owning user may read their own rows via RLS.
-- A public-facing view (api_keys_public) omits key_hash for anonymous reads.
CREATE POLICY "api_keys_read_owner" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

-- Public view that deliberately excludes key_hash
CREATE OR REPLACE VIEW api_keys_public AS
    SELECT
        id,
        name,
        key_prefix,
        user_id,
        permissions,
        rate_limit,
        is_active,
        last_used_at,
        expires_at,
        created_at,
        updated_at
    FROM api_keys;

-- =============================================================================
-- Trigger: Auto-update updated_at on row update
-- =============================================================================
DROP TRIGGER IF EXISTS trigger_api_keys_updated_at ON api_keys;

CREATE TRIGGER trigger_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
