-- Migration 038 — fix self-referential `user_roles` RLS recursion (DEC-017)
--
-- Story: ETNI-1186 — Wave 0 RLS bug, blocks the honest-states ticket, the
-- data-backed availability ticket, and the corpus load.
--
-- Root cause: 008_user_roles.sql declares "Admins can manage all roles" as
-- FOR ALL, so its USING clause is evaluated on every SELECT against
-- user_roles too — including the moderator-role EXISTS subqueries that
-- 029_names_atlas.sql and 035_migration_events.sql run against user_roles
-- from their own FOR ALL write policies. Since that USING clause itself
-- selects from user_roles, the RLS query rewriter has to re-expand the
-- user_roles reference inside its own subquery, which requires evaluating
-- the same policy again — infinite recursion, Postgres 42P17. This breaks
-- every anonymous read of name_records and migration_events, even though
-- both tables also carry a permissive public-read policy, because the
-- FOR ALL moderator policy is OR'd into the same SELECT check.
--
-- Fix (DEC-017): resolve role checks through SECURITY DEFINER helper
-- functions with a pinned search_path — the pattern already used by
-- is_protected_records_editor() in 033_rights_consent_access_controls.sql.
-- A SECURITY DEFINER function runs with the privileges of its owner (the
-- migration-applying role), which is the table owner of user_roles and
-- therefore bypasses RLS entirely (no FORCE ROW LEVEL SECURITY is set
-- anywhere in this schema) — so the helper's internal SELECT never
-- re-triggers policy evaluation. Every FOR ALL role-gated write policy
-- touched here is also split into explicit FOR INSERT / UPDATE / DELETE
-- policies, so a plain SELECT never evaluates a write-gate USING clause
-- again in the first place.
--
-- Idempotent (CREATE OR REPLACE FUNCTION, DROP POLICY IF EXISTS) — safe to
-- re-run. Human-applied via `supabase db push` per the AR45 runbook; this
-- story is not done until the migration is applied to both recette and
-- production (see the ticket's "Assumptions / open questions").

-- ────────────────────────────────────────────────────────────────────────────
-- 1. SECURITY DEFINER role-check helpers (pinned search_path, AR6 pattern)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'SECURITY DEFINER: true iff auth.uid() holds the admin role. Bypasses RLS '
  'internally so callers (including user_roles'' own write policies) never '
  'recurse into user_roles'' RLS again. ETNI-1186, DEC-017.';

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')
  );
$$;

COMMENT ON FUNCTION public.is_moderator_or_admin() IS
  'SECURITY DEFINER: true iff auth.uid() holds the moderator or admin role. '
  'Bypasses RLS internally so role-gated write policies on other tables '
  '(name_records, migration_events, migration_event_peoples, ...) never '
  'recurse into user_roles'' RLS when evaluated on a SELECT. ETNI-1186, DEC-017.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. user_roles — replace the self-referential FOR ALL admin policy
--    (008_user_roles.sql) with explicit FOR INSERT/UPDATE/DELETE policies
--    driven by is_admin(). The "Users can read their own roles" SELECT
--    policy from 008 is untouched.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

DROP POLICY IF EXISTS user_roles_admin_insert ON user_roles;
CREATE POLICY user_roles_admin_insert ON user_roles
  FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS user_roles_admin_update ON user_roles;
CREATE POLICY user_roles_admin_update ON user_roles
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS user_roles_admin_delete ON user_roles;
CREATE POLICY user_roles_admin_delete ON user_roles
  FOR DELETE
  USING (is_admin());

COMMENT ON POLICY user_roles_admin_insert ON user_roles IS
  'Only admins may insert role rows. Replaces the self-referential FOR ALL '
  'policy that caused 42P17 recursion. ETNI-1186, DEC-017.';
COMMENT ON POLICY user_roles_admin_update ON user_roles IS
  'Only admins may update role rows. Replaces the self-referential FOR ALL '
  'policy that caused 42P17 recursion. ETNI-1186, DEC-017.';
COMMENT ON POLICY user_roles_admin_delete ON user_roles IS
  'Only admins may delete role rows. Replaces the self-referential FOR ALL '
  'policy that caused 42P17 recursion. ETNI-1186, DEC-017.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. name_records (029_names_atlas.sql) — split the moderator FOR ALL write
--    policy into FOR INSERT/UPDATE/DELETE, driven by is_moderator_or_admin().
--    The public-read policy is untouched.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS name_records_write_moderator ON name_records;

DROP POLICY IF EXISTS name_records_write_moderator_insert ON name_records;
CREATE POLICY name_records_write_moderator_insert ON name_records
  FOR INSERT
  WITH CHECK (is_moderator_or_admin());

DROP POLICY IF EXISTS name_records_write_moderator_update ON name_records;
CREATE POLICY name_records_write_moderator_update ON name_records
  FOR UPDATE
  USING (is_moderator_or_admin())
  WITH CHECK (is_moderator_or_admin());

DROP POLICY IF EXISTS name_records_write_moderator_delete ON name_records;
CREATE POLICY name_records_write_moderator_delete ON name_records
  FOR DELETE
  USING (is_moderator_or_admin());

COMMENT ON POLICY name_records_write_moderator_insert ON name_records IS
  'Only moderator and admin roles may INSERT name_records. ETNI-1186, DEC-017.';
COMMENT ON POLICY name_records_write_moderator_update ON name_records IS
  'Only moderator and admin roles may UPDATE name_records. ETNI-1186, DEC-017.';
COMMENT ON POLICY name_records_write_moderator_delete ON name_records IS
  'Only moderator and admin roles may DELETE name_records. ETNI-1186, DEC-017.';

-- ────────────────────────────────────────────────────────────────────────────
-- 4. migration_events (035_migration_events.sql) — same split.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS migration_events_write_moderator ON migration_events;

DROP POLICY IF EXISTS migration_events_write_moderator_insert ON migration_events;
CREATE POLICY migration_events_write_moderator_insert ON migration_events
  FOR INSERT
  WITH CHECK (is_moderator_or_admin());

DROP POLICY IF EXISTS migration_events_write_moderator_update ON migration_events;
CREATE POLICY migration_events_write_moderator_update ON migration_events
  FOR UPDATE
  USING (is_moderator_or_admin())
  WITH CHECK (is_moderator_or_admin());

DROP POLICY IF EXISTS migration_events_write_moderator_delete ON migration_events;
CREATE POLICY migration_events_write_moderator_delete ON migration_events
  FOR DELETE
  USING (is_moderator_or_admin());

COMMENT ON POLICY migration_events_write_moderator_insert ON migration_events IS
  'Only moderator and admin roles may INSERT migration_events. ETNI-1186, DEC-017.';
COMMENT ON POLICY migration_events_write_moderator_update ON migration_events IS
  'Only moderator and admin roles may UPDATE migration_events. ETNI-1186, DEC-017.';
COMMENT ON POLICY migration_events_write_moderator_delete ON migration_events IS
  'Only moderator and admin roles may DELETE migration_events. ETNI-1186, DEC-017.';

-- ────────────────────────────────────────────────────────────────────────────
-- 5. migration_event_peoples (035_migration_events.sql) — same split.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS migration_event_peoples_write_moderator ON migration_event_peoples;

DROP POLICY IF EXISTS migration_event_peoples_write_moderator_insert ON migration_event_peoples;
CREATE POLICY migration_event_peoples_write_moderator_insert ON migration_event_peoples
  FOR INSERT
  WITH CHECK (is_moderator_or_admin());

DROP POLICY IF EXISTS migration_event_peoples_write_moderator_update ON migration_event_peoples;
CREATE POLICY migration_event_peoples_write_moderator_update ON migration_event_peoples
  FOR UPDATE
  USING (is_moderator_or_admin())
  WITH CHECK (is_moderator_or_admin());

DROP POLICY IF EXISTS migration_event_peoples_write_moderator_delete ON migration_event_peoples;
CREATE POLICY migration_event_peoples_write_moderator_delete ON migration_event_peoples
  FOR DELETE
  USING (is_moderator_or_admin());

COMMENT ON POLICY migration_event_peoples_write_moderator_insert ON migration_event_peoples IS
  'Only moderator and admin roles may INSERT migration_event_peoples. ETNI-1186, DEC-017.';
COMMENT ON POLICY migration_event_peoples_write_moderator_update ON migration_event_peoples IS
  'Only moderator and admin roles may UPDATE migration_event_peoples. ETNI-1186, DEC-017.';
COMMENT ON POLICY migration_event_peoples_write_moderator_delete ON migration_event_peoples IS
  'Only moderator and admin roles may DELETE migration_event_peoples. ETNI-1186, DEC-017.';
