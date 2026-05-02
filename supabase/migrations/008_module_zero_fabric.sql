-- Migration 008: Module Zero Fabric Tables
-- Creates core tables for sources, revisions, audit logging, editorial doctrine, and user roles

-- =============================================================================
-- Table: sources
-- Purpose: External sources/references for content verification and citation
-- =============================================================================
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    source_type TEXT,
    reliability_score SMALLINT CHECK (reliability_score >= 1 AND reliability_score <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT sources_url_unique UNIQUE (url)
);

COMMENT ON TABLE sources IS 'External sources/references for content verification and citation';
COMMENT ON COLUMN sources.source_type IS 'Type of source, e.g., academic, governmental, media';
COMMENT ON COLUMN sources.reliability_score IS 'Reliability rating from 1 (low) to 5 (high)';

CREATE INDEX IF NOT EXISTS idx_sources_source_type ON sources (source_type);
CREATE INDEX IF NOT EXISTS idx_sources_reliability_score ON sources (reliability_score);
CREATE INDEX IF NOT EXISTS idx_sources_created_at ON sources (created_at);

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sources_read_public" ON sources FOR SELECT USING (true);

-- =============================================================================
-- Table: revisions
-- Purpose: Track changes to content across different entity types
-- =============================================================================
CREATE TABLE IF NOT EXISTS revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    previous_content JSONB,
    new_content JSONB NOT NULL,
    changed_by UUID,
    change_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE revisions IS 'Track changes to content across different entity types';
COMMENT ON COLUMN revisions.entity_type IS 'Type of entity being revised, e.g., people, language_family, country';
COMMENT ON COLUMN revisions.entity_id IS 'Identifier of the entity being revised';
COMMENT ON COLUMN revisions.previous_content IS 'JSON snapshot of content before the change';
COMMENT ON COLUMN revisions.new_content IS 'JSON snapshot of content after the change';
COMMENT ON COLUMN revisions.changed_by IS 'UUID of the user who made the change';
COMMENT ON COLUMN revisions.change_reason IS 'Explanation for why the change was made';

CREATE INDEX IF NOT EXISTS idx_revisions_entity_type ON revisions (entity_type);
CREATE INDEX IF NOT EXISTS idx_revisions_entity_id ON revisions (entity_id);
CREATE INDEX IF NOT EXISTS idx_revisions_entity_type_id ON revisions (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_revisions_changed_by ON revisions (changed_by);
CREATE INDEX IF NOT EXISTS idx_revisions_created_at ON revisions (created_at);

ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revisions_read_public" ON revisions FOR SELECT USING (true);

-- =============================================================================
-- Table: audit_log
-- Purpose: System-level audit trail for tracking all database operations
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'System-level audit trail for tracking all database operations';
COMMENT ON COLUMN audit_log.action IS 'Type of action performed, e.g., insert, update, delete';
COMMENT ON COLUMN audit_log.table_name IS 'Name of the table affected';
COMMENT ON COLUMN audit_log.record_id IS 'Identifier of the affected record';
COMMENT ON COLUMN audit_log.old_data IS 'JSON snapshot of data before the operation (for update/delete)';
COMMENT ON COLUMN audit_log.new_data IS 'JSON snapshot of data after the operation (for insert/update)';
COMMENT ON COLUMN audit_log.user_id IS 'UUID of the user who performed the action';
COMMENT ON COLUMN audit_log.ip_address IS 'IP address from which the action was performed';

CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log (record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_action ON audit_log (table_name, action);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_read_public" ON audit_log FOR SELECT USING (true);

-- =============================================================================
-- Table: editorial_doctrine
-- Purpose: Editorial guidelines/rules for content management
-- =============================================================================
CREATE TABLE IF NOT EXISTS editorial_doctrine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    rules JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE editorial_doctrine IS 'Editorial guidelines/rules for content management';
COMMENT ON COLUMN editorial_doctrine.name IS 'Unique name identifying the doctrine';
COMMENT ON COLUMN editorial_doctrine.description IS 'Human-readable description of the doctrine';
COMMENT ON COLUMN editorial_doctrine.rules IS 'JSON object containing the specific rules';
COMMENT ON COLUMN editorial_doctrine.is_active IS 'Whether this doctrine is currently active';

CREATE INDEX IF NOT EXISTS idx_editorial_doctrine_is_active ON editorial_doctrine (is_active);
CREATE INDEX IF NOT EXISTS idx_editorial_doctrine_created_at ON editorial_doctrine (created_at);

ALTER TABLE editorial_doctrine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "editorial_doctrine_read_public" ON editorial_doctrine FOR SELECT USING (true);

-- =============================================================================
-- Table: user_roles
-- Purpose: User role assignments for access control
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role)
);

COMMENT ON TABLE user_roles IS 'User role assignments for access control';
COMMENT ON COLUMN user_roles.user_id IS 'UUID of the user';
COMMENT ON COLUMN user_roles.role IS 'Role assigned to the user, e.g., admin, editor, reviewer, viewer';

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles (role);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_read_public" ON user_roles FOR SELECT USING (true);
