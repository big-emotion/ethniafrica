-- Migration 008: Module Zero Fabric
-- Creates tables for citations, assertions, confidence scores, flags, revisions,
-- editorial doctrine, user roles, and audit logging with RLS enabled.

-- =============================================================================
-- Table: sources
-- Citation/reference sources for data
-- =============================================================================
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT,
  type TEXT, -- e.g., 'academic', 'governmental', 'ngo'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sources IS 'Citation/reference sources for data claims and assertions';

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY sources_read_public ON sources FOR SELECT USING (true);
-- Note: No write policies = write denied by default with RLS enabled

CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(type);

-- =============================================================================
-- Table: assertions
-- Data claims that can be verified
-- =============================================================================
CREATE TABLE IF NOT EXISTS assertions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- e.g., 'people', 'language_family', 'country'
  entity_id TEXT NOT NULL,
  field_path TEXT NOT NULL, -- JSONB path like 'content.generalInfo.population'
  value JSONB NOT NULL,
  source_id UUID REFERENCES sources(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE assertions IS 'Data claims that can be verified against sources';

ALTER TABLE assertions ENABLE ROW LEVEL SECURITY;
CREATE POLICY assertions_read_public ON assertions FOR SELECT USING (true);
-- Note: No write policies = write denied by default with RLS enabled

CREATE INDEX IF NOT EXISTS idx_assertions_entity ON assertions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_assertions_source_id ON assertions(source_id);

-- =============================================================================
-- Table: confidence_scores
-- Confidence levels for assertions
-- =============================================================================
CREATE TABLE IF NOT EXISTS confidence_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assertion_id UUID REFERENCES assertions(id) ON DELETE CASCADE,
  score DECIMAL(3,2) CHECK (score >= 0 AND score <= 1),
  methodology TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE confidence_scores IS 'Confidence levels for assertions, ranging from 0 to 1';

ALTER TABLE confidence_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY confidence_scores_read_public ON confidence_scores FOR SELECT USING (true);
-- Note: No write policies = write denied by default with RLS enabled

-- =============================================================================
-- Table: flags
-- Moderation/review flags on content
-- =============================================================================
CREATE TABLE IF NOT EXISTS flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  flag_type TEXT NOT NULL, -- e.g., 'inaccurate', 'outdated', 'colonial-term'
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

COMMENT ON TABLE flags IS 'Moderation/review flags on content for quality control';

ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY flags_read_public ON flags FOR SELECT USING (true);
-- Note: No write policies = write denied by default with RLS enabled

CREATE INDEX IF NOT EXISTS idx_flags_entity ON flags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_flags_status ON flags(status);

-- =============================================================================
-- Table: revisions
-- Audit trail for content changes
-- =============================================================================
CREATE TABLE IF NOT EXISTS revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field_path TEXT,
  old_value JSONB,
  new_value JSONB,
  changed_by UUID,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE revisions IS 'Audit trail for content changes with before/after values';

ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY revisions_read_public ON revisions FOR SELECT USING (true);
-- Note: No write policies = write denied by default with RLS enabled

CREATE INDEX IF NOT EXISTS idx_revisions_entity ON revisions(entity_type, entity_id);

-- =============================================================================
-- Table: editorial_doctrine
-- Editorial guidelines and policies
-- =============================================================================
CREATE TABLE IF NOT EXISTS editorial_doctrine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE editorial_doctrine IS 'Editorial guidelines and policies for content creation';

ALTER TABLE editorial_doctrine ENABLE ROW LEVEL SECURITY;
CREATE POLICY editorial_doctrine_read_public ON editorial_doctrine FOR SELECT USING (true);
-- Note: No write policies = write denied by default with RLS enabled

-- =============================================================================
-- Table: user_roles
-- User role assignments
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'reviewer', 'contributor')),
  granted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, role)
);

COMMENT ON TABLE user_roles IS 'User role assignments for access control';

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_roles_read_public ON user_roles FOR SELECT USING (true);
-- Note: No write policies = write denied by default with RLS enabled

-- =============================================================================
-- Table: audit_log
-- System-wide audit log
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  actor_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'System-wide audit log for tracking all actions';

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_read_public ON audit_log FOR SELECT USING (true);
-- Note: No write policies = write denied by default with RLS enabled

CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
