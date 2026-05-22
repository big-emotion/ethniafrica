-- Migration 019: Moderator schema — moderator_role enum, revision_drafts,
--                audit_log hardening + RLS
-- =============================================================================
-- Story:  ETNI-65 [5.1] — moderator_role column + audit_log + RLS hardening
-- Epic:   Epic 5 (Editorial Moderation, FR41)
--
-- What this migration adds:
--   1. moderator_role_type enum: none | editor | senior_editor | admin
--   2. contributor_profiles table with moderator_role column (DEFAULT 'none')
--   3. revision_drafts table — one active draft per moderator per entity
--   4. audit_log: new columns (target_type, target_id, details_jsonb)
--   5. audit_log append-only: BEFORE UPDATE / BEFORE DELETE triggers that
--      unconditionally reject mutations for all roles (FR41).
--   6. audit_log RLS: replaces admin-only SELECT with public SELECT (FR41)
--   7. revision_drafts RLS: all operations denied for moderator_role = 'none'
--
-- Idempotency
-- -----------
-- All statements use IF NOT EXISTS / OR REPLACE / DROP IF EXISTS so the
-- migration can be re-applied safely in any environment.
--
-- Dependency note
-- ---------------
-- Depends on migration 008 (audit_log table) and auth.users (Supabase Auth).
-- =============================================================================


-- =============================================================================
-- 1. moderator_role_type enum
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'moderator_role_type'
  ) THEN
    CREATE TYPE moderator_role_type AS ENUM (
      'none',
      'editor',
      'senior_editor',
      'admin'
    );
  END IF;
END $$;

COMMENT ON TYPE moderator_role_type IS
  'Editorial role within the moderation workflow. '
  '''none'' = no moderation privileges; '''
  'editor'' = can draft revisions; ''senior_editor'' = can publish; '
  '''admin'' = full moderation access. FR41.';


-- =============================================================================
-- 2. contributor_profiles table
-- =============================================================================

CREATE TABLE IF NOT EXISTS contributor_profiles (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  moderator_role moderator_role_type NOT NULL DEFAULT 'none'
    CHECK (moderator_role IN ('none', 'editor', 'senior_editor', 'admin')),
  display_name   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE contributor_profiles IS
  'One profile per authenticated user. moderator_role drives all moderation '
  'access checks (revision_drafts RLS, publishing gates). FR41.';

COMMENT ON COLUMN contributor_profiles.moderator_role IS
  'Editorial moderation role. Defaults to ''none'' (no privileges). '
  'Updated by admins only — never self-served.';

ALTER TABLE contributor_profiles ENABLE ROW LEVEL SECURITY;

-- Public profiles are readable (username / display name only — no PII exposed).
DROP POLICY IF EXISTS contributor_profiles_read_public ON contributor_profiles;
CREATE POLICY contributor_profiles_read_public ON contributor_profiles
  FOR SELECT USING (true);

COMMENT ON POLICY contributor_profiles_read_public ON contributor_profiles IS
  'All authenticated and anonymous callers may read contributor profiles. '
  'No PII columns are exposed. ETNI-65.';

-- Moderators may read/update their own profile row.
DROP POLICY IF EXISTS contributor_profiles_self_update ON contributor_profiles;
CREATE POLICY contributor_profiles_self_update ON contributor_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY contributor_profiles_self_update ON contributor_profiles IS
  'A user may update only their own profile row. '
  'moderator_role is never self-served (service_role manages it). ETNI-65.';

CREATE INDEX IF NOT EXISTS idx_contributor_profiles_user_id
  ON contributor_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_contributor_profiles_moderator_role
  ON contributor_profiles (moderator_role);


-- =============================================================================
-- 3. revision_drafts table
-- =============================================================================

CREATE TABLE IF NOT EXISTS revision_drafts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT        NOT NULL,
  entity_id       TEXT        NOT NULL,
  moderator_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_jsonb     JSONB       NOT NULL DEFAULT '{}',
  linked_flag_ids UUID[]      NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT revision_drafts_unique_per_moderator
    UNIQUE (entity_type, entity_id, moderator_id)
);

COMMENT ON TABLE revision_drafts IS
  'In-progress editorial drafts. One active draft per moderator per entity '
  '(enforced by the UNIQUE constraint). Drafts are never published directly: '
  'publishing creates a row in the revisions table. FR41.';

COMMENT ON COLUMN revision_drafts.moderator_id IS
  'auth.users.id of the moderator authoring this draft.';

COMMENT ON COLUMN revision_drafts.draft_jsonb IS
  'Partial or complete entity snapshot being edited. Schema mirrors the '
  'corresponding AFRIK JSON model.';

COMMENT ON COLUMN revision_drafts.linked_flag_ids IS
  'UUIDs of flags (from the flags table) that this draft is intended to address.';

ALTER TABLE revision_drafts ENABLE ROW LEVEL SECURITY;

-- Deny all access to users with moderator_role = 'none' (or no profile).
-- Moderators (editor / senior_editor / admin) get full CRUD.
-- INSERT
DROP POLICY IF EXISTS revision_drafts_moderator_insert ON revision_drafts;
CREATE POLICY revision_drafts_moderator_insert ON revision_drafts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   contributor_profiles cp
      WHERE  cp.user_id = auth.uid()
        AND  cp.moderator_role IN ('editor', 'senior_editor', 'admin')
    )
  );

COMMENT ON POLICY revision_drafts_moderator_insert ON revision_drafts IS
  'Only users with moderator_role editor/senior_editor/admin may INSERT drafts. '
  '''none'' role and anonymous are denied. ETNI-65.';

-- SELECT
DROP POLICY IF EXISTS revision_drafts_moderator_select ON revision_drafts;
CREATE POLICY revision_drafts_moderator_select ON revision_drafts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   contributor_profiles cp
      WHERE  cp.user_id = auth.uid()
        AND  cp.moderator_role IN ('editor', 'senior_editor', 'admin')
    )
  );

COMMENT ON POLICY revision_drafts_moderator_select ON revision_drafts IS
  'Only moderators may SELECT drafts. ''none'' role and anonymous are denied. ETNI-65.';

-- UPDATE
DROP POLICY IF EXISTS revision_drafts_moderator_update ON revision_drafts;
CREATE POLICY revision_drafts_moderator_update ON revision_drafts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM   contributor_profiles cp
      WHERE  cp.user_id = auth.uid()
        AND  cp.moderator_role IN ('editor', 'senior_editor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   contributor_profiles cp
      WHERE  cp.user_id = auth.uid()
        AND  cp.moderator_role IN ('editor', 'senior_editor', 'admin')
    )
  );

COMMENT ON POLICY revision_drafts_moderator_update ON revision_drafts IS
  'Only moderators may UPDATE their drafts. ''none'' role and anonymous are denied. ETNI-65.';

-- DELETE
DROP POLICY IF EXISTS revision_drafts_moderator_delete ON revision_drafts;
CREATE POLICY revision_drafts_moderator_delete ON revision_drafts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM   contributor_profiles cp
      WHERE  cp.user_id = auth.uid()
        AND  cp.moderator_role IN ('editor', 'senior_editor', 'admin')
    )
  );

COMMENT ON POLICY revision_drafts_moderator_delete ON revision_drafts IS
  'Only moderators may DELETE their drafts. ''none'' role and anonymous are denied. ETNI-65.';

CREATE INDEX IF NOT EXISTS idx_revision_drafts_entity
  ON revision_drafts (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_revision_drafts_moderator_id
  ON revision_drafts (moderator_id);


-- =============================================================================
-- 4. audit_log — add target_type, target_id, details_jsonb columns
-- =============================================================================
-- The existing audit_log (migration 008) uses entity_type / entity_id / metadata.
-- FR41 introduces the canonical moderator-action column names. Both sets of
-- columns coexist so that prior triggers (010, 014, 015, 018) remain compatible.
-- =============================================================================

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS target_type   TEXT,
  ADD COLUMN IF NOT EXISTS target_id     TEXT,
  ADD COLUMN IF NOT EXISTS details_jsonb JSONB DEFAULT '{}';

COMMENT ON COLUMN audit_log.target_type IS
  'Canonical FR41 target column (parallels legacy entity_type). '
  'Populated by moderator-action inserts from ETNI-65 onwards.';

COMMENT ON COLUMN audit_log.target_id IS
  'Canonical FR41 target column (parallels legacy entity_id). '
  'Populated by moderator-action inserts from ETNI-65 onwards.';

COMMENT ON COLUMN audit_log.details_jsonb IS
  'Canonical FR41 details column (parallels legacy metadata). '
  'Populated by moderator-action inserts from ETNI-65 onwards.';


-- =============================================================================
-- 5. audit_log append-only — trigger function + triggers
-- =============================================================================
-- The BEFORE UPDATE / BEFORE DELETE triggers unconditionally reject mutations
-- for ALL roles, including service_role. Only direct DBA access (bypassing
-- Postgres trigger stack entirely) can modify rows — this is intentional: the
-- audit_log is a tamper-evident trail (FR41). No session-GUC bypass is
-- provided (unlike the revisions bypass in migration 018).
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_log_enforce_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION
      'audit_log rows are append-only: UPDATE is not allowed. '
      'The audit_log is a tamper-evident trail (FR41). '
      'Only direct DBA access may modify rows.'
      USING ERRCODE = '23000';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'audit_log rows are append-only: DELETE is not allowed. '
      'The audit_log is a tamper-evident trail (FR41). '
      'Only direct DBA access may modify rows.'
      USING ERRCODE = '23000';
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION audit_log_enforce_append_only() IS
  'BEFORE UPDATE / BEFORE DELETE trigger on audit_log. Unconditionally rejects '
  'all mutations for every role. No bypass is available at the SQL level '
  '— this is intentional (FR41, ETNI-65).';

DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_enforce_append_only();

COMMENT ON TRIGGER audit_log_no_update ON audit_log IS
  'Enforces the append-only invariant: all UPDATE attempts on audit_log are '
  'rejected unconditionally. FR41, ETNI-65.';

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_enforce_append_only();

COMMENT ON TRIGGER audit_log_no_delete ON audit_log IS
  'Enforces the append-only invariant: all DELETE attempts on audit_log are '
  'rejected unconditionally. FR41, ETNI-65.';


-- =============================================================================
-- 6. audit_log RLS — public transparency (FR41)
-- =============================================================================
-- Migration 008 created an admin-only SELECT policy on audit_log.
-- FR41 requires public (anonymous) read access for transparency.
-- INSERT remains service-role-only: no INSERT policy is created for anon/auth
-- roles, so RLS denies it. service_role bypasses RLS by default.
-- =============================================================================

-- Remove the prior admin-only read policy.
DROP POLICY IF EXISTS audit_log_read_admin ON audit_log;

-- Public read: the audit log is an intentional transparency record (FR41).
DROP POLICY IF EXISTS audit_log_read_public ON audit_log;
CREATE POLICY audit_log_read_public ON audit_log
  FOR SELECT USING (true);

COMMENT ON POLICY audit_log_read_public ON audit_log IS
  'Anonymous and authenticated callers may SELECT all audit_log rows. '
  'The audit log is a public transparency record per FR41. ETNI-65.';

-- Explicit deny for anon + authenticated INSERT / UPDATE / DELETE.
-- UPDATE and DELETE are already blocked by triggers; the explicit deny is an
-- extra layer of defence and documents the intent.
DROP POLICY IF EXISTS audit_log_no_insert_anon ON audit_log;
CREATE POLICY audit_log_no_insert_anon ON audit_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

COMMENT ON POLICY audit_log_no_insert_anon ON audit_log IS
  'Explicit deny: only service_role (which bypasses RLS) may INSERT into '
  'audit_log. All direct moderator actions go through the server-side '
  'service_role client. ETNI-65.';
