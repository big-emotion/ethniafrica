-- Migration 008: Module Zero Fabric
-- Creates foundational tables for AFRIK data governance:
-- sources, assertions, confidence_scores, flags, revisions, editorial_doctrine
-- All tables have RLS enabled with read-public, write-deny default policies

-- ============================================
-- 1. TABLES
-- ============================================

-- Table: mz_sources
-- Reference table for data sources
CREATE TABLE IF NOT EXISTS mz_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  url TEXT,
  source_type TEXT, -- e.g., 'academic', 'institutional', 'primary'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: mz_assertions
-- Claims/statements that can be sourced
CREATE TABLE IF NOT EXISTS mz_assertions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- e.g., 'people', 'language_family', 'country'
  entity_id VARCHAR(50) NOT NULL,
  assertion_type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  source_id UUID REFERENCES mz_sources(id),
  created_by UUID, -- nullable, for future auth
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: mz_confidence_scores
-- Confidence ratings for assertions
CREATE TABLE IF NOT EXISTS mz_confidence_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assertion_id UUID REFERENCES mz_assertions(id) ON DELETE CASCADE,
  score NUMERIC(3,2) NOT NULL CHECK (score >= 0 AND score <= 1),
  methodology TEXT,
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  evaluated_by UUID, -- nullable
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: mz_flags
-- Issues/concerns flagged on content
CREATE TABLE IF NOT EXISTS mz_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  flag_type TEXT NOT NULL, -- e.g., 'contested', 'needs-review', 'colonial-term'
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_by UUID, -- nullable
  resolved_by UUID, -- nullable
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Table: mz_revisions
-- Version history for entity content
CREATE TABLE IF NOT EXISTS mz_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  revision_number INTEGER NOT NULL,
  previous_content JSONB,
  new_content JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID, -- nullable
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, revision_number)
);

-- Table: mz_editorial_doctrine
-- Editorial policies and guidelines
CREATE TABLE IF NOT EXISTS mz_editorial_doctrine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '[]',
  applies_to TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. TRIGGERS FOR updated_at
-- ============================================

-- Create trigger function if not exists (may already exist from migration 001)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for mz_sources
DROP TRIGGER IF EXISTS update_mz_sources_updated_at ON mz_sources;
CREATE TRIGGER update_mz_sources_updated_at
  BEFORE UPDATE ON mz_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for mz_assertions
DROP TRIGGER IF EXISTS update_mz_assertions_updated_at ON mz_assertions;
CREATE TRIGGER update_mz_assertions_updated_at
  BEFORE UPDATE ON mz_assertions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for mz_editorial_doctrine
DROP TRIGGER IF EXISTS update_mz_editorial_doctrine_updated_at ON mz_editorial_doctrine;
CREATE TRIGGER update_mz_editorial_doctrine_updated_at
  BEFORE UPDATE ON mz_editorial_doctrine
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. RLS (Row Level Security)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE mz_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE mz_assertions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mz_confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE mz_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE mz_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mz_editorial_doctrine ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public read access for mz_sources" ON mz_sources;
DROP POLICY IF EXISTS "Public read access for mz_assertions" ON mz_assertions;
DROP POLICY IF EXISTS "Public read access for mz_confidence_scores" ON mz_confidence_scores;
DROP POLICY IF EXISTS "Public read access for mz_flags" ON mz_flags;
DROP POLICY IF EXISTS "Public read access for mz_revisions" ON mz_revisions;
DROP POLICY IF EXISTS "Public read access for mz_editorial_doctrine" ON mz_editorial_doctrine;

-- SELECT policies (read-public for anon/authenticated)
CREATE POLICY "Public read access for mz_sources"
  ON mz_sources FOR SELECT
  USING (true);

CREATE POLICY "Public read access for mz_assertions"
  ON mz_assertions FOR SELECT
  USING (true);

CREATE POLICY "Public read access for mz_confidence_scores"
  ON mz_confidence_scores FOR SELECT
  USING (true);

CREATE POLICY "Public read access for mz_flags"
  ON mz_flags FOR SELECT
  USING (true);

CREATE POLICY "Public read access for mz_revisions"
  ON mz_revisions FOR SELECT
  USING (true);

CREATE POLICY "Public read access for mz_editorial_doctrine"
  ON mz_editorial_doctrine FOR SELECT
  USING (true);

-- Note: INSERT/UPDATE/DELETE policies are intentionally not created.
-- With RLS enabled and no permissive policies for these operations,
-- they are effectively denied for all roles (anon/authenticated).

-- ============================================
-- 4. INDEXES
-- ============================================

-- Indexes for mz_sources
CREATE INDEX IF NOT EXISTS idx_mz_sources_source_type ON mz_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_mz_sources_title ON mz_sources(title);

-- Indexes for mz_assertions
CREATE INDEX IF NOT EXISTS idx_mz_assertions_entity_type_id ON mz_assertions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_mz_assertions_assertion_type ON mz_assertions(assertion_type);
CREATE INDEX IF NOT EXISTS idx_mz_assertions_source_id ON mz_assertions(source_id);
CREATE INDEX IF NOT EXISTS idx_mz_assertions_created_by ON mz_assertions(created_by);

-- Indexes for mz_confidence_scores
CREATE INDEX IF NOT EXISTS idx_mz_confidence_scores_assertion_id ON mz_confidence_scores(assertion_id);
CREATE INDEX IF NOT EXISTS idx_mz_confidence_scores_score ON mz_confidence_scores(score);

-- Indexes for mz_flags
CREATE INDEX IF NOT EXISTS idx_mz_flags_entity_type_id ON mz_flags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_mz_flags_flag_type ON mz_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_mz_flags_status ON mz_flags(status);
CREATE INDEX IF NOT EXISTS idx_mz_flags_created_by ON mz_flags(created_by);

-- Indexes for mz_revisions
CREATE INDEX IF NOT EXISTS idx_mz_revisions_entity_type_id ON mz_revisions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_mz_revisions_revision_number ON mz_revisions(entity_type, entity_id, revision_number);
CREATE INDEX IF NOT EXISTS idx_mz_revisions_created_by ON mz_revisions(created_by);

-- Indexes for mz_editorial_doctrine
CREATE INDEX IF NOT EXISTS idx_mz_editorial_doctrine_name ON mz_editorial_doctrine(name);
CREATE INDEX IF NOT EXISTS idx_mz_editorial_doctrine_is_active ON mz_editorial_doctrine(is_active);
CREATE INDEX IF NOT EXISTS idx_mz_editorial_doctrine_applies_to ON mz_editorial_doctrine USING gin(applies_to);

-- ============================================
-- 5. COMMENTS
-- ============================================

-- Table comments
COMMENT ON TABLE mz_sources IS 'Reference table for data sources - academic, institutional, primary sources';
COMMENT ON TABLE mz_assertions IS 'Claims/statements about entities that can be sourced and verified';
COMMENT ON TABLE mz_confidence_scores IS 'Confidence ratings for assertions based on source quality and methodology';
COMMENT ON TABLE mz_flags IS 'Issues/concerns flagged on content - contested claims, colonial terminology, etc.';
COMMENT ON TABLE mz_revisions IS 'Version history tracking for entity content changes';
COMMENT ON TABLE mz_editorial_doctrine IS 'Editorial policies and guidelines governing content standards';

-- Column comments for mz_sources
COMMENT ON COLUMN mz_sources.id IS 'Unique identifier for the source';
COMMENT ON COLUMN mz_sources.title IS 'Title of the source (must be unique)';
COMMENT ON COLUMN mz_sources.url IS 'URL where the source can be accessed';
COMMENT ON COLUMN mz_sources.source_type IS 'Type of source: academic, institutional, primary, etc.';
COMMENT ON COLUMN mz_sources.metadata IS 'Additional metadata as JSONB (author, publication_year, etc.)';

-- Column comments for mz_assertions
COMMENT ON COLUMN mz_assertions.id IS 'Unique identifier for the assertion';
COMMENT ON COLUMN mz_assertions.entity_type IS 'Type of entity: people, language_family, country, etc.';
COMMENT ON COLUMN mz_assertions.entity_id IS 'Stable identifier of the referenced entity';
COMMENT ON COLUMN mz_assertions.assertion_type IS 'Type of assertion being made';
COMMENT ON COLUMN mz_assertions.content IS 'Content of the assertion as JSONB';
COMMENT ON COLUMN mz_assertions.source_id IS 'Reference to the source backing this assertion';
COMMENT ON COLUMN mz_assertions.created_by IS 'User who created this assertion (for future auth)';

-- Column comments for mz_confidence_scores
COMMENT ON COLUMN mz_confidence_scores.id IS 'Unique identifier for the confidence score';
COMMENT ON COLUMN mz_confidence_scores.assertion_id IS 'Reference to the assertion being scored';
COMMENT ON COLUMN mz_confidence_scores.score IS 'Confidence score between 0 and 1';
COMMENT ON COLUMN mz_confidence_scores.methodology IS 'Description of how the score was determined';
COMMENT ON COLUMN mz_confidence_scores.evaluated_at IS 'When the evaluation was performed';
COMMENT ON COLUMN mz_confidence_scores.evaluated_by IS 'User who performed the evaluation';

-- Column comments for mz_flags
COMMENT ON COLUMN mz_flags.id IS 'Unique identifier for the flag';
COMMENT ON COLUMN mz_flags.entity_type IS 'Type of entity being flagged';
COMMENT ON COLUMN mz_flags.entity_id IS 'Stable identifier of the flagged entity';
COMMENT ON COLUMN mz_flags.flag_type IS 'Type of flag: contested, needs-review, colonial-term, etc.';
COMMENT ON COLUMN mz_flags.description IS 'Description of the issue being flagged';
COMMENT ON COLUMN mz_flags.status IS 'Status of the flag: open, resolved, or dismissed';
COMMENT ON COLUMN mz_flags.created_by IS 'User who created the flag';
COMMENT ON COLUMN mz_flags.resolved_by IS 'User who resolved/dismissed the flag';
COMMENT ON COLUMN mz_flags.resolved_at IS 'When the flag was resolved/dismissed';

-- Column comments for mz_revisions
COMMENT ON COLUMN mz_revisions.id IS 'Unique identifier for the revision';
COMMENT ON COLUMN mz_revisions.entity_type IS 'Type of entity being revised';
COMMENT ON COLUMN mz_revisions.entity_id IS 'Stable identifier of the revised entity';
COMMENT ON COLUMN mz_revisions.revision_number IS 'Sequential revision number for this entity';
COMMENT ON COLUMN mz_revisions.previous_content IS 'Content before this revision (null for first revision)';
COMMENT ON COLUMN mz_revisions.new_content IS 'Content after this revision';
COMMENT ON COLUMN mz_revisions.change_summary IS 'Human-readable summary of changes';
COMMENT ON COLUMN mz_revisions.created_by IS 'User who created this revision';

-- Column comments for mz_editorial_doctrine
COMMENT ON COLUMN mz_editorial_doctrine.id IS 'Unique identifier for the doctrine';
COMMENT ON COLUMN mz_editorial_doctrine.name IS 'Unique name for the editorial policy';
COMMENT ON COLUMN mz_editorial_doctrine.description IS 'Description of the policy purpose';
COMMENT ON COLUMN mz_editorial_doctrine.rules IS 'Rules as JSONB array';
COMMENT ON COLUMN mz_editorial_doctrine.applies_to IS 'Entity types this doctrine applies to';
COMMENT ON COLUMN mz_editorial_doctrine.is_active IS 'Whether this doctrine is currently active';
