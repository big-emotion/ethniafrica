-- Migration 010: Assertions, Confidence Scores, Flags, and Triggers
-- Creates tables for content assertions, confidence scoring, and user flagging system

-- =============================================================================
-- Table: assertions
-- Purpose: Claims/statements about entities with source attribution and status tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS assertions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    assertion_type TEXT NOT NULL,
    content JSONB NOT NULL,
    source_id UUID REFERENCES sources(id),
    status TEXT DEFAULT 'pending',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE assertions IS 'Claims/statements about entities with source attribution and status tracking';
COMMENT ON COLUMN assertions.entity_type IS 'Type of entity this assertion relates to, e.g., people, language_family, country';
COMMENT ON COLUMN assertions.entity_id IS 'Identifier of the entity this assertion relates to';
COMMENT ON COLUMN assertions.assertion_type IS 'Type of assertion, e.g., claim, fact, interpretation';
COMMENT ON COLUMN assertions.content IS 'JSON content of the assertion';
COMMENT ON COLUMN assertions.source_id IS 'Reference to the source backing this assertion';
COMMENT ON COLUMN assertions.status IS 'Current status: pending, verified, disputed, rejected';
COMMENT ON COLUMN assertions.created_by IS 'UUID of the user who created this assertion';

CREATE INDEX IF NOT EXISTS idx_assertions_entity_type ON assertions (entity_type);
CREATE INDEX IF NOT EXISTS idx_assertions_entity_id ON assertions (entity_id);
CREATE INDEX IF NOT EXISTS idx_assertions_entity_type_id ON assertions (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_assertions_status ON assertions (status);
CREATE INDEX IF NOT EXISTS idx_assertions_source_id ON assertions (source_id);
CREATE INDEX IF NOT EXISTS idx_assertions_created_at ON assertions (created_at);

ALTER TABLE assertions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assertions_read_public" ON assertions FOR SELECT USING (true);

-- =============================================================================
-- Table: confidence_scores
-- Purpose: Confidence ratings for assertions with methodology documentation
-- =============================================================================
CREATE TABLE IF NOT EXISTS confidence_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assertion_id UUID NOT NULL REFERENCES assertions(id) ON DELETE CASCADE,
    score SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
    methodology TEXT,
    scored_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE confidence_scores IS 'Confidence ratings for assertions with methodology documentation';
COMMENT ON COLUMN confidence_scores.assertion_id IS 'Reference to the assertion being scored';
COMMENT ON COLUMN confidence_scores.score IS 'Confidence score from 0 to 100';
COMMENT ON COLUMN confidence_scores.methodology IS 'Description of how the score was calculated';
COMMENT ON COLUMN confidence_scores.scored_by IS 'UUID of the user or system that assigned the score';

CREATE INDEX IF NOT EXISTS idx_confidence_scores_assertion_id ON confidence_scores (assertion_id);
CREATE INDEX IF NOT EXISTS idx_confidence_scores_score ON confidence_scores (score);
CREATE INDEX IF NOT EXISTS idx_confidence_scores_created_at ON confidence_scores (created_at);

ALTER TABLE confidence_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "confidence_scores_read_public" ON confidence_scores FOR SELECT USING (true);

-- =============================================================================
-- Table: flags
-- Purpose: User flags/reports on content for moderation and quality control
-- =============================================================================
CREATE TABLE IF NOT EXISTS flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    flag_type TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    flagged_by UUID,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE flags IS 'User flags/reports on content for moderation and quality control';
COMMENT ON COLUMN flags.entity_type IS 'Type of entity being flagged, e.g., people, language_family, country';
COMMENT ON COLUMN flags.entity_id IS 'Identifier of the entity being flagged';
COMMENT ON COLUMN flags.flag_type IS 'Type of flag, e.g., inaccurate, offensive, outdated, colonial-bias';
COMMENT ON COLUMN flags.description IS 'Detailed description of the issue';
COMMENT ON COLUMN flags.status IS 'Current status: open, investigating, resolved, dismissed';
COMMENT ON COLUMN flags.flagged_by IS 'UUID of the user who created the flag';
COMMENT ON COLUMN flags.resolved_by IS 'UUID of the user who resolved the flag';
COMMENT ON COLUMN flags.resolved_at IS 'Timestamp when the flag was resolved';

CREATE INDEX IF NOT EXISTS idx_flags_entity_type ON flags (entity_type);
CREATE INDEX IF NOT EXISTS idx_flags_entity_id ON flags (entity_id);
CREATE INDEX IF NOT EXISTS idx_flags_entity_type_id ON flags (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_flags_flag_type ON flags (flag_type);
CREATE INDEX IF NOT EXISTS idx_flags_status ON flags (status);
CREATE INDEX IF NOT EXISTS idx_flags_created_at ON flags (created_at);

ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flags_read_public" ON flags FOR SELECT USING (true);

-- =============================================================================
-- Function and Trigger: update_updated_at_column
-- Purpose: Auto-update updated_at timestamp on row update
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp on row update';

DROP TRIGGER IF EXISTS trigger_assertions_updated_at ON assertions;

CREATE TRIGGER trigger_assertions_updated_at
    BEFORE UPDATE ON assertions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
