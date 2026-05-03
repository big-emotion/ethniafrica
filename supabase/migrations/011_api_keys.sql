-- Migration 011: API Keys
-- Creates tables for user roles, audit logging, and API key management
-- All tables have RLS enabled with appropriate access policies

-- ============================================
-- 1. TABLES
-- ============================================

-- Table: user_roles
-- User role assignments for authorization
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- references future auth.users
  role TEXT NOT NULL, -- e.g., 'admin', 'editor', 'reviewer', 'contributor'
  granted_by UUID, -- nullable, user who granted this role
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- nullable, for temporary roles
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Table: audit_log
-- System-wide audit trail for security and compliance
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- e.g., 'create', 'update', 'delete', 'access', 'login', 'logout'
  entity_type TEXT, -- nullable, type of entity affected
  entity_id VARCHAR(50), -- nullable, identifier of entity affected
  user_id UUID, -- nullable, for anonymous actions
  ip_address INET, -- nullable, client IP address
  user_agent TEXT, -- nullable, client user agent
  details JSONB DEFAULT '{}', -- additional event details
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: api_keys
-- API key management for external integrations
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE, -- hashed API key (never store plaintext)
  key_prefix VARCHAR(8) NOT NULL, -- first 8 chars for identification
  name TEXT NOT NULL, -- human-readable name for the key
  description TEXT, -- optional description of key purpose
  user_id UUID, -- nullable, owner of the key
  permissions TEXT[] DEFAULT '{}', -- e.g., 'read:peoples', 'read:families'
  rate_limit INTEGER DEFAULT 1000, -- requests per hour
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ, -- nullable, updated on each use
  expires_at TIMESTAMPTZ, -- nullable, for expiring keys
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. TRIGGERS FOR updated_at
-- ============================================

-- Create trigger function if not exists (may already exist from previous migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for api_keys
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. RLS (Row Level Security)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Service role only access for audit_log" ON audit_log;
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;

-- user_roles: SELECT allowed for authenticated users on their own records
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- audit_log: SELECT denied for all except service role (sensitive)
-- With RLS enabled and no SELECT policy, access is denied by default.
-- Service role bypasses RLS, so it can still read audit_log.
-- No policy created = denied for anon/authenticated roles.

-- api_keys: SELECT allowed for authenticated users on their own keys only
CREATE POLICY "Users can view their own API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Note: INSERT/UPDATE/DELETE policies are intentionally not created.
-- With RLS enabled and no permissive policies for these operations,
-- they are effectively denied for all roles (anon/authenticated).
-- Service role bypasses RLS for administrative operations.

-- ============================================
-- 4. INDEXES
-- ============================================

-- Indexes for user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);

-- Indexes for audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type_id ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- Indexes for api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- ============================================
-- 5. COMMENTS
-- ============================================

-- Table comments
COMMENT ON TABLE user_roles IS 'User role assignments for authorization - supports temporary and permanent role grants';
COMMENT ON TABLE audit_log IS 'System-wide audit trail for security and compliance - restricted access';
COMMENT ON TABLE api_keys IS 'API key management for external integrations - stores hashed keys only';

-- Column comments for user_roles
COMMENT ON COLUMN user_roles.id IS 'Unique identifier for the role assignment';
COMMENT ON COLUMN user_roles.user_id IS 'User who has this role (references future auth.users)';
COMMENT ON COLUMN user_roles.role IS 'Role name: admin, editor, reviewer, contributor, etc.';
COMMENT ON COLUMN user_roles.granted_by IS 'User who granted this role (nullable)';
COMMENT ON COLUMN user_roles.granted_at IS 'When this role was granted';
COMMENT ON COLUMN user_roles.expires_at IS 'When this role expires (nullable for permanent roles)';
COMMENT ON COLUMN user_roles.is_active IS 'Whether this role assignment is currently active';
COMMENT ON COLUMN user_roles.created_at IS 'When this record was created';

-- Column comments for audit_log
COMMENT ON COLUMN audit_log.id IS 'Unique identifier for the audit entry';
COMMENT ON COLUMN audit_log.event_type IS 'Type of event: create, update, delete, access, login, logout';
COMMENT ON COLUMN audit_log.entity_type IS 'Type of entity affected by this event';
COMMENT ON COLUMN audit_log.entity_id IS 'Identifier of the entity affected';
COMMENT ON COLUMN audit_log.user_id IS 'User who performed the action (nullable for anonymous)';
COMMENT ON COLUMN audit_log.ip_address IS 'Client IP address';
COMMENT ON COLUMN audit_log.user_agent IS 'Client user agent string';
COMMENT ON COLUMN audit_log.details IS 'Additional event details as JSONB';
COMMENT ON COLUMN audit_log.created_at IS 'When this event occurred';

-- Column comments for api_keys
COMMENT ON COLUMN api_keys.id IS 'Unique identifier for the API key record';
COMMENT ON COLUMN api_keys.key_hash IS 'Hashed API key (application handles hashing, never store plaintext)';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters of the key for identification';
COMMENT ON COLUMN api_keys.name IS 'Human-readable name for the API key';
COMMENT ON COLUMN api_keys.description IS 'Optional description of the key purpose';
COMMENT ON COLUMN api_keys.user_id IS 'Owner of the API key (nullable)';
COMMENT ON COLUMN api_keys.permissions IS 'Array of permission strings: read:peoples, read:families, etc.';
COMMENT ON COLUMN api_keys.rate_limit IS 'Maximum requests per hour for this key';
COMMENT ON COLUMN api_keys.is_active IS 'Whether this API key is currently active';
COMMENT ON COLUMN api_keys.last_used_at IS 'When this key was last used for authentication';
COMMENT ON COLUMN api_keys.expires_at IS 'When this key expires (nullable for non-expiring keys)';
COMMENT ON COLUMN api_keys.created_at IS 'When this key was created';
COMMENT ON COLUMN api_keys.updated_at IS 'When this key was last updated';
