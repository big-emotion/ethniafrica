-- Migration 028: Names Atlas — name_records schema (Epic 8, FR55/FR57)
-- =============================================================================
-- Story: ETNI-465 [8.1] `name_records` schema migration
--
-- Introduces the canonical naming/etymology data model consumed by every
-- downstream Epic 8 story (and later by Epic 13 for imposed-name mapping):
--   * name_record_type enum (endonym | exonym | historical_spelling | surname)
--   * name_records table, polymorphic (entity_type, entity_id) per the
--     Module 0 fabric convention — entity_type is TEXT (no Postgres
--     entity_type type exists; see 009_module_zero_fabric.sql), v1 populates
--     'people' only.
--   * "Source or drop" enforcement (FR57, AR3 pattern): a BEFORE INSERT OR
--     UPDATE trigger rejects rows whose assertion_id is null or whose
--     assertion cites zero Tier 1/2 sources (sources.tier IN
--     ('primary', 'secondary'), mirroring the tier-to-quality mapping in
--     016_module_zero_triggers.sql).
--   * Generated French search_vector column + GIN index (extends the
--     025_search_vectors.sql pattern) plus an entity lookup index.
--   * RLS: public read, writes gated to moderator/admin roles (AR6).
--
-- Idempotent: every statement is guarded (DO/duplicate_object for the enum,
-- IF NOT EXISTS for table/column/index, DROP-then-CREATE for the trigger and
-- policies) so re-applying this migration is a no-op — same discipline as
-- migrations 015/016.
--
-- Human-applied via `supabase db push` per the AR45 runbook; this story is
-- code-complete without production application.
-- =============================================================================

-- =============================================================================
-- 1. Enum: name_record_type
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE name_record_type AS ENUM ('endonym', 'exonym', 'historical_spelling', 'surname');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 2. Table: name_records
-- =============================================================================
CREATE TABLE IF NOT EXISTS name_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'people',
  entity_id VARCHAR(50) NOT NULL,
  name_text TEXT NOT NULL,
  name_type name_record_type NOT NULL,
  language_of_origin VARCHAR(3),
  meaning TEXT,
  period_label TEXT,
  imposed_by TEXT,
  imposition_period TEXT,
  why_problematic TEXT,
  contemporary_usage TEXT,
  assertion_id uuid NOT NULL REFERENCES assertions(id),
  sort_rank INTEGER NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT name_records_unique_variant UNIQUE (entity_type, entity_id, name_text, name_type),
  CONSTRAINT name_records_imposed_needs_context CHECK (imposed_by IS NULL OR why_problematic IS NOT NULL)
);

COMMENT ON TABLE name_records IS
  'Structured per-name etymology records (endonyms, exonyms, historical '
  'spellings, surnames) attached to Module 0 assertions with Tier 1/2 '
  'sources. entity_type/entity_id follow the polymorphic Module 0 fabric '
  'convention; v1 populates entity_type=''people'' only. ETNI-465 (Epic 8, FR55/FR57).';
COMMENT ON COLUMN name_records.entity_type IS 'Target entity table key (people, language_family, country) — v1 populates people only';
COMMENT ON COLUMN name_records.entity_id   IS 'Target entity identifier (PPL_* for v1 rows)';
COMMENT ON COLUMN name_records.imposed_by  IS 'Imposed-name context (NULL = not an imposed exonym)';
COMMENT ON COLUMN name_records.sort_rank   IS 'Endonym-first ordering within a dossier';

-- =============================================================================
-- 3. Trigger: source-or-drop enforcement (FR57, AR3 pattern)
-- -----------------------------------------------------------------------------
-- Mirrors 011_assertions_triggers.sql conventions: a plpgsql trigger function
-- plus a DROP-then-CREATE trigger wiring. Rejects any row whose assertion_id
-- is null, or whose assertion cites zero sources with tier IN
-- ('primary', 'secondary') — the Tier 1/2 mapping already used by
-- recompute_confidence() in 016_module_zero_triggers.sql.
-- =============================================================================
CREATE OR REPLACE FUNCTION enforce_name_record_sources()
RETURNS TRIGGER AS $$
DECLARE
  v_qualifying_source_count INTEGER;
BEGIN
  IF NEW.assertion_id IS NULL THEN
    RAISE EXCEPTION
      'name_records row rejected: assertion_id is required (source or drop, FR57).'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(DISTINCT s.id)
  INTO v_qualifying_source_count
  FROM assertions a
  LEFT JOIN LATERAL UNNEST(COALESCE(a.source_ids, '{}'::UUID[])) AS src_id ON true
  LEFT JOIN sources s ON s.id = src_id
  WHERE a.id = NEW.assertion_id
    AND s.tier IN ('primary', 'secondary');

  IF COALESCE(v_qualifying_source_count, 0) = 0 THEN
    RAISE EXCEPTION
      'name_records row rejected: assertion % cites zero Tier 1/2 sources (source or drop, FR57).',
      NEW.assertion_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enforce_name_record_sources() IS
  'BEFORE INSERT OR UPDATE trigger function: rejects name_records rows with a '
  'null assertion_id or whose assertion cites zero Tier 1/2 sources. '
  'ETNI-465 (Epic 8, FR57, AR3 pattern).';

DROP TRIGGER IF EXISTS name_records_source_or_drop ON name_records;
CREATE TRIGGER name_records_source_or_drop
  BEFORE INSERT OR UPDATE ON name_records
  FOR EACH ROW
  EXECUTE FUNCTION enforce_name_record_sources();

COMMENT ON TRIGGER name_records_source_or_drop ON name_records IS
  'Enforces "source or drop": rejects rows without a Tier 1/2-sourced assertion. ETNI-465.';

-- =============================================================================
-- 4. Generated search_vector column + GIN index (name-variant FTS)
-- -----------------------------------------------------------------------------
-- Extends the French tsvector + GIN pattern from 025_search_vectors.sql.
-- =============================================================================
ALTER TABLE name_records
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french', COALESCE(name_text, '') || ' ' || COALESCE(meaning, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_name_records_search_vector
  ON name_records USING gin(search_vector);

-- =============================================================================
-- 5. Entity lookup index
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_name_records_entity
  ON name_records(entity_type, entity_id);

-- =============================================================================
-- 6. RLS — public read, moderator/admin write (AR6)
-- -----------------------------------------------------------------------------
-- Read pattern from 019_afrik_rls.sql; write-gate pattern from
-- 021_revisions_ddl.sql (EXISTS against user_roles).
-- =============================================================================
ALTER TABLE name_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS name_records_read_public ON name_records;
CREATE POLICY name_records_read_public ON name_records
  FOR SELECT USING (true);

COMMENT ON POLICY name_records_read_public ON name_records IS
  'Anonymous and authenticated callers may SELECT all name records. ETNI-465.';

DROP POLICY IF EXISTS name_records_write_moderator ON name_records;
CREATE POLICY name_records_write_moderator ON name_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('moderator', 'admin')
    )
  );

COMMENT ON POLICY name_records_write_moderator ON name_records IS
  'Only moderator and admin roles may INSERT/UPDATE/DELETE name_records. ETNI-465 (AR6).';
