-- Migration 018: Per-assertion data model (R-2 / ASR-4) — fiche_revisions + typed FKs
-- Story: ETNI-207
-- =============================================================================
-- Ships the schema extension that gates Phase 2 (Kofi flagging journey):
--
--   1. New table `fiche_revisions` — one row per published snapshot of a fiche.
--   2. `assertions.fiche_revision_id` — typed FK (NOT NULL) so every assertion
--      is anchored to a specific fiche revision.  ON DELETE CASCADE.
--   3. `flags.assertion_id` — typed FK (NULLABLE) so a flag can anchor to a
--      specific assertion.  ON DELETE CASCADE.
--   4. `flags.assertion_field_path` — text path within the assertion that is
--      being flagged (nullable; replaces the polymorphic target_field_path
--      originally drafted in ETNI-54, per Winston's 2026-05-14 ruling).
--   5. `flags_has_anchor_check` — CHECK guaranteeing every flag anchors to
--      either a specific assertion OR its parent entity.
--
-- Polymorphic target_type / target_id / target_field_path is explicitly
-- NOT introduced on flags (architectural ruling, Winston 2026-05-14).
--
-- Idempotency: every DDL statement uses IF NOT EXISTS / IF EXISTS guards.
-- Re-running this migration on a database that already has it applied is safe.
-- =============================================================================

-- =============================================================================
-- 1. fiche_revisions — one row per published content snapshot
-- =============================================================================

CREATE TABLE IF NOT EXISTS fiche_revisions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      TEXT        NOT NULL,
  entity_id        TEXT        NOT NULL,
  version          INTEGER     NOT NULL,
  content_snapshot JSONB       NOT NULL,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_type, entity_id, version)
);

ALTER TABLE fiche_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fiche_revisions_read_public ON fiche_revisions;
CREATE POLICY fiche_revisions_read_public ON fiche_revisions FOR SELECT USING (true);

COMMENT ON TABLE  fiche_revisions            IS 'Published content snapshots for AFRIK fiches; one row per (entity, version)';
COMMENT ON COLUMN fiche_revisions.entity_type IS 'Fiche entity class: people | language_family | language | country';
COMMENT ON COLUMN fiche_revisions.entity_id   IS 'Stable entity identifier matching assertions.entity_id';
COMMENT ON COLUMN fiche_revisions.version     IS 'Monotonically increasing revision counter per (entity_type, entity_id)';
COMMENT ON COLUMN fiche_revisions.content_snapshot IS 'Full JSONB snapshot of the fiche at publish time';
COMMENT ON COLUMN fiche_revisions.published_at IS 'Timestamp when this revision was published; NULL means draft';

-- =============================================================================
-- 2. assertions.fiche_revision_id — typed FK, NOT NULL, cascade
-- =============================================================================

-- 2a. Backfill step: seed one placeholder fiche_revisions row per
--     (entity_type, entity_id) that already exists in assertions so the
--     NOT NULL constraint is satisfiable in a single ALTER.  No-op on a
--     fresh database.
DO $$
DECLARE
  r RECORD;
  rev_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'assertions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assertions' AND column_name = 'fiche_revision_id'
  ) THEN
    FOR r IN
      SELECT DISTINCT entity_type, entity_id
      FROM assertions
    LOOP
      rev_id := gen_random_uuid();
      INSERT INTO fiche_revisions (id, entity_type, entity_id, version, content_snapshot)
      VALUES (
        rev_id,
        r.entity_type,
        r.entity_id,
        1,
        jsonb_build_object(
          'backfill', true,
          'note', 'Placeholder seeded by migration 018 for pre-existing assertion rows'
        )
      )
      ON CONFLICT (entity_type, entity_id, version) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 2b. Add the FK column (idempotent).
ALTER TABLE assertions
  ADD COLUMN IF NOT EXISTS fiche_revision_id UUID
    REFERENCES fiche_revisions(id) ON DELETE CASCADE;

-- 2c. Backfill fiche_revision_id for any existing rows that now lack it.
--     Each existing assertion (entity_type, entity_id) maps to the placeholder
--     fiche_revisions row seeded in step 2a (version = 1).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assertions' AND column_name = 'fiche_revision_id'
  ) THEN
    UPDATE assertions a
    SET fiche_revision_id = fr.id
    FROM fiche_revisions fr
    WHERE fr.entity_type = a.entity_type
      AND fr.entity_id   = a.entity_id
      AND fr.version     = 1
      AND a.fiche_revision_id IS NULL;
  END IF;
END $$;

-- 2d. Enforce NOT NULL — safe now that every row has been backfilled.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assertions'
      AND column_name = 'fiche_revision_id'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (
    SELECT 1 FROM assertions WHERE fiche_revision_id IS NULL
  ) THEN
    ALTER TABLE assertions
      ALTER COLUMN fiche_revision_id SET NOT NULL;
  END IF;
END $$;

-- 2e. Index for FK lookups.
CREATE INDEX IF NOT EXISTS idx_assertions_fiche_revision_id
  ON assertions(fiche_revision_id);

COMMENT ON COLUMN assertions.fiche_revision_id IS 'FK to fiche_revisions(id): the specific published snapshot this assertion belongs to';

-- =============================================================================
-- 3. flags.assertion_id — typed FK, NULLABLE, cascade
-- =============================================================================

ALTER TABLE flags
  ADD COLUMN IF NOT EXISTS assertion_id UUID
    REFERENCES assertions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS assertion_field_path TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_flags_assertion_id ON flags(assertion_id);

COMMENT ON COLUMN flags.assertion_id        IS 'FK to assertions(id): specific assertion being flagged (NULL = entity-level flag)';
COMMENT ON COLUMN flags.assertion_field_path IS 'Optional field path within the assertion targeted by this flag';

-- =============================================================================
-- 4. Anchor-required CHECK — every flag must anchor to something
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'flags_has_anchor_check'
  ) THEN
    ALTER TABLE flags
      ADD CONSTRAINT flags_has_anchor_check CHECK (
        assertion_id IS NOT NULL
        OR (entity_type IS NOT NULL AND entity_id IS NOT NULL)
      );
  END IF;
END $$;
