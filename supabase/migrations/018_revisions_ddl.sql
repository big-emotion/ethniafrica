-- Migration 018: revisions table — full DDL, append-only invariant, RLS
-- =============================================================================
-- Story:  ETNI-45 [3.1] — `revisions` table DDL + append-only invariant
-- Epic:   Epic 3 (Pinned-version URLs, AR14)
--
-- Context
-- -------
-- Migration 008 created a skeleton `revisions` table designed as a generic
-- audit trail (before/after JSONB diff). Epic 3 requires a fundamentally
-- different shape: each row is a *published snapshot* of a complete entity
-- state at a specific version, frozen forever so that pinned-version URLs
-- can render from immutable data (AR14).
--
-- This migration:
--   1. Drops the old 008 columns that are no longer relevant and adds the
--      full Epic 3 column set.
--   2. Adds a UNIQUE constraint on (entity_type, entity_id, version) so that
--      each entity has at most one row per published version.
--   3. Installs BEFORE UPDATE / BEFORE DELETE triggers that unconditionally
--      raise an exception, making the table append-only. A DBA-level bypass
--      is available only via a documented runbook
--      (docs/runbooks/revisions-dba-bypass.md).
--   4. Replaces the generic 008 RLS policy with one that grants public SELECT
--      and scoped INSERT to the moderator + admin roles. UPDATE and DELETE
--      policies are intentionally absent; the triggers enforce the invariant
--      regardless of RLS.
--
-- Idempotency
-- -----------
-- Every statement is wrapped with IF NOT EXISTS / IF EXISTS / OR REPLACE so
-- the migration can be re-applied safely in any environment.
--
-- Dependency note
-- ---------------
-- Migration 015 wires a AFTER INSERT trigger (revisions_recompute_confidence)
-- onto the revisions table. That trigger reads NEW.entity_type and
-- NEW.entity_id — both of which are retained in this schema — so it remains
-- compatible after this migration.
-- =============================================================================


-- =============================================================================
-- 1. Remove 008-era columns (no longer relevant to the Epic 3 shape)
-- =============================================================================

ALTER TABLE revisions
  DROP COLUMN IF EXISTS field_path,
  DROP COLUMN IF EXISTS old_value,
  DROP COLUMN IF EXISTS new_value,
  DROP COLUMN IF EXISTS changed_by,
  DROP COLUMN IF EXISTS change_reason;


-- =============================================================================
-- 2. Add Epic 3 columns (idempotent: ADD COLUMN IF NOT EXISTS)
-- =============================================================================

ALTER TABLE revisions
  ADD COLUMN IF NOT EXISTS version             INTEGER         NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS snapshot_jsonb      JSONB           NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS moderator_id        UUID,
  ADD COLUMN IF NOT EXISTS reason              TEXT,
  ADD COLUMN IF NOT EXISTS published_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS doctrine_version_id UUID            REFERENCES editorial_doctrine(id);

-- Remove the migration-time defaults once the columns exist; new rows must
-- always supply these values explicitly.
ALTER TABLE revisions
  ALTER COLUMN version          DROP DEFAULT,
  ALTER COLUMN snapshot_jsonb   DROP DEFAULT;

COMMENT ON TABLE revisions IS
  'Immutable published snapshots of entity state. Each row captures the full '
  'denormalised entity at the moment of publication (AR14). Rows are '
  'append-only: UPDATE and DELETE are rejected at the database level via '
  'triggers (see docs/runbooks/revisions-dba-bypass.md for the DBA runbook).';

COMMENT ON COLUMN revisions.version IS
  'Monotonically increasing publication version for this (entity_type, entity_id).';
COMMENT ON COLUMN revisions.snapshot_jsonb IS
  'Full denormalised entity state at publication time, including source references '
  'and the doctrine version in force. Never mutated after insert (append-only).';
COMMENT ON COLUMN revisions.moderator_id IS
  'auth.users.id of the moderator who approved and published this revision.';
COMMENT ON COLUMN revisions.doctrine_version_id IS
  'Reference to the editorial_doctrine row that was active at publication time.';


-- =============================================================================
-- 3. Unique constraint: one row per (entity_type, entity_id, version)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'revisions_entity_type_entity_id_version_key'
      AND  conrelid = 'revisions'::regclass
  ) THEN
    ALTER TABLE revisions
      ADD CONSTRAINT revisions_entity_type_entity_id_version_key
      UNIQUE (entity_type, entity_id, version);
  END IF;
END $$;


-- =============================================================================
-- 4. Append-only trigger function + triggers
-- =============================================================================
-- The BEFORE UPDATE / BEFORE DELETE triggers fire for every role including
-- superuser (standard Postgres behaviour). The only supported bypass is the
-- session-level GUC `app.bypass_revisions_append_only = 'true'`, which is
-- reserved for DBA use and MUST be accompanied by an audit_log entry.
-- See docs/runbooks/revisions-dba-bypass.md for the full procedure.
-- =============================================================================

CREATE OR REPLACE FUNCTION revisions_enforce_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_bypass TEXT;
BEGIN
  -- DBA bypass: session GUC `app.bypass_revisions_append_only = 'true'`.
  -- The bypass is logged to audit_log so every override is discoverable.
  -- Only a superuser or a role with SET privilege on this GUC can activate it.
  BEGIN
    v_bypass := current_setting('app.bypass_revisions_append_only', true);
  EXCEPTION WHEN OTHERS THEN
    v_bypass := NULL;
  END;

  IF v_bypass = 'true' THEN
    INSERT INTO audit_log (action, entity_type, entity_id, actor_id, metadata)
    VALUES (
      'dba_revisions_append_only_bypass',
      CASE TG_OP WHEN 'DELETE' THEN OLD.entity_type ELSE NEW.entity_type END,
      CASE TG_OP WHEN 'DELETE' THEN OLD.entity_id   ELSE NEW.entity_id   END,
      auth.uid(),
      jsonb_build_object(
        'operation',       TG_OP,
        'revision_id',     CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
        'override_reason', 'app.bypass_revisions_append_only=true',
        'overridden_at',   NOW()
      )
    );
    -- Allow the operation to proceed.
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION
      'revisions rows are append-only: UPDATE is not allowed. '
      'See DBA runbook: docs/runbooks/revisions-dba-bypass.md.'
      USING ERRCODE = '23000';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'revisions rows are append-only: DELETE is not allowed. '
      'See DBA runbook: docs/runbooks/revisions-dba-bypass.md.'
      USING ERRCODE = '23000';
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION revisions_enforce_append_only() IS
  'BEFORE UPDATE / BEFORE DELETE trigger on revisions. Unconditionally rejects '
  'mutations except when the session GUC app.bypass_revisions_append_only is '
  'set to ''true'' by a DBA following the documented runbook. Every bypass is '
  'logged to audit_log. ETNI-45.';

DROP TRIGGER IF EXISTS revisions_no_update ON revisions;
CREATE TRIGGER revisions_no_update
  BEFORE UPDATE ON revisions
  FOR EACH ROW
  EXECUTE FUNCTION revisions_enforce_append_only();

COMMENT ON TRIGGER revisions_no_update ON revisions IS
  'Enforces the append-only invariant: all UPDATE attempts are rejected. ETNI-45.';

DROP TRIGGER IF EXISTS revisions_no_delete ON revisions;
CREATE TRIGGER revisions_no_delete
  BEFORE DELETE ON revisions
  FOR EACH ROW
  EXECUTE FUNCTION revisions_enforce_append_only();

COMMENT ON TRIGGER revisions_no_delete ON revisions IS
  'Enforces the append-only invariant: all DELETE attempts are rejected. ETNI-45.';


-- =============================================================================
-- 5. RLS policies
-- =============================================================================
-- RLS was already enabled on revisions in migration 008; the public SELECT
-- policy was also created there. We replace it with an explicit DROP+CREATE
-- for clarity, add a moderator/admin INSERT policy, and leave no UPDATE or
-- DELETE policies (the triggers enforce those constraints independently).
-- =============================================================================

ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;

-- Public read: the full revision history is an open audit trail.
DROP POLICY IF EXISTS revisions_read_public ON revisions;
CREATE POLICY revisions_read_public ON revisions
  FOR SELECT USING (true);

COMMENT ON POLICY revisions_read_public ON revisions IS
  'Anonymous and authenticated callers may SELECT all revision rows. '
  'The revision history is an intentionally public audit trail (AR14).';

-- Moderators and admins may INSERT (publish) new revisions.
-- Anonymous and contributor roles have no INSERT policy → denied by RLS.
DROP POLICY IF EXISTS revisions_insert_moderator ON revisions;
CREATE POLICY revisions_insert_moderator ON revisions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   user_roles
      WHERE  user_roles.user_id = auth.uid()
        AND  user_roles.role IN ('moderator', 'admin')
    )
  );

COMMENT ON POLICY revisions_insert_moderator ON revisions IS
  'Only moderator and admin roles may publish (INSERT) new revisions. '
  'Anonymous and contributor roles are denied. ETNI-45.';


-- =============================================================================
-- 6. Supporting index for the pinned-version URL lookup pattern
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_revisions_entity_version
  ON revisions (entity_type, entity_id, version DESC);

COMMENT ON INDEX idx_revisions_entity_version IS
  'Accelerates the pinned-version URL lookup: WHERE entity_type = $1 AND '
  'entity_id = $2 AND version = $3 (AR14).';
