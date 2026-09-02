-- =============================================================================
-- Migration 077: take privileged functions off the PostgREST RPC surface
-- =============================================================================
-- The security linter reported six SECURITY DEFINER functions in `public` as
-- callable by `anon` — that is, by anyone holding the publishable key, which
-- ships in the browser bundle and is public by construction. PostgREST turns
-- every function in an exposed schema into `/rest/v1/rpc/<name>`; `public` is
-- the only exposed schema here, so "lives in public" and "is a public HTTP
-- endpoint" are the same statement.
--
-- The obvious remedy is wrong for half of them
-- --------------------------------------------
-- Revoking EXECUTE from all six was measured against recette before this
-- migration was written, and it breaks moderation. An RLS policy expression is
-- evaluated with the privileges of the querying role, so a role that cannot
-- execute `is_admin()` cannot be checked by a policy that calls it: the query
-- fails with 42501 `permission denied for function is_admin` rather than
-- returning no rows. Fifteen live policies call these three predicates. They
-- have to stay executable.
--
-- The same probe showed the opposite for trigger functions: a trigger checks
-- EXECUTE when it is created, never when it fires, so a revoked trigger
-- function still runs. Revoking there costs nothing.
--
-- So the six split three ways:
--
--   • two trigger functions (`audit_log_enforce_append_only`,
--     `log_protected_record_state_change`) — revoke, along with the twelve
--     other trigger functions that were never SECURITY DEFINER but were just
--     as reachable;
--   • `update_api_key_last_used` — revoke. Nothing calls it: `src/lib/api/
--     auth.ts` updates `last_used_at` directly. Left exposed it is a write
--     plus an oracle, answering true/false for a guessed key hash;
--   • the three RLS predicates — move to a schema PostgREST does not expose,
--     which is the linter's own third remedy. They keep working inside
--     policies and stop being HTTP endpoints.
--
-- `publish_revision` is deliberately untouched. Its grant to `authenticated`
-- is real, but the body (051) raises unless the caller is a senior_editor or
-- admin, and `publishRevision.ts` calls it through the SSR client under the
-- reader's own session — revoking it would break admin publication and close
-- nothing.
--
-- Audit trail: "Ce qu'un clone donne", axis 2 finding A2-02.
-- =============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. A schema PostgREST does not serve.
--    Exposure is configured per project (`public`, `graphql_public`); USAGE
--    here lets a policy resolve the predicate without adding an endpoint.
-- ────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS private;

COMMENT ON SCHEMA private IS
  'Functions that RLS policies must call but no HTTP client should. Never add '
  'this schema to the PostgREST exposed-schema list.';

GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. The three predicates, unchanged in body, rehomed.
--    SECURITY DEFINER for the reason 038 gives: the helper reads user_roles
--    while user_roles' own policies call the helper, and only a definer's
--    RLS bypass breaks that recursion (DEC-017).
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION private.is_admin() IS
  'SECURITY DEFINER: true iff auth.uid() holds the admin role. Lives outside '
  'public so PostgREST cannot serve it as an RPC. ETNI-1186, DEC-017.';

CREATE OR REPLACE FUNCTION private.is_moderator_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')
  );
$$;

COMMENT ON FUNCTION private.is_moderator_or_admin() IS
  'SECURITY DEFINER: true iff auth.uid() holds the moderator or admin role. '
  'Lives outside public so PostgREST cannot serve it as an RPC. ETNI-1186, '
  'DEC-017.';

CREATE OR REPLACE FUNCTION private.is_protected_records_editor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')
  );
$$;

COMMENT ON FUNCTION private.is_protected_records_editor() IS
  'SECURITY DEFINER: true iff auth.uid() may read protected records. Lives '
  'outside public so PostgREST cannot serve it as an RPC. ETNI-963.';

-- Every role a policy can be evaluated under needs EXECUTE, anon included:
-- an anonymous SELECT on protected_records still evaluates the predicate.
GRANT EXECUTE ON FUNCTION private.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_moderator_or_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_protected_records_editor() TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Repoint every policy that names a predicate. ALTER POLICY rewrites the
--    expression and leaves the command and the roles alone, so nothing here
--    can silently widen a policy the way DROP + CREATE can.
--    This must precede the drops: the drops are what proves the list is
--    complete, since a missed policy makes DROP FUNCTION fail loudly.
-- ────────────────────────────────────────────────────────────────────────────
ALTER POLICY user_roles_admin_insert ON public.user_roles
  WITH CHECK (private.is_admin());
ALTER POLICY user_roles_admin_update ON public.user_roles
  USING (private.is_admin())
  WITH CHECK (private.is_admin());
ALTER POLICY user_roles_admin_delete ON public.user_roles
  USING (private.is_admin());

ALTER POLICY name_records_write_moderator_insert ON public.name_records
  WITH CHECK (private.is_moderator_or_admin());
ALTER POLICY name_records_write_moderator_update ON public.name_records
  USING (private.is_moderator_or_admin())
  WITH CHECK (private.is_moderator_or_admin());
ALTER POLICY name_records_write_moderator_delete ON public.name_records
  USING (private.is_moderator_or_admin());

ALTER POLICY migration_events_write_moderator_insert ON public.migration_events
  WITH CHECK (private.is_moderator_or_admin());
ALTER POLICY migration_events_write_moderator_update ON public.migration_events
  USING (private.is_moderator_or_admin())
  WITH CHECK (private.is_moderator_or_admin());
ALTER POLICY migration_events_write_moderator_delete ON public.migration_events
  USING (private.is_moderator_or_admin());

ALTER POLICY migration_event_peoples_write_moderator_insert ON public.migration_event_peoples
  WITH CHECK (private.is_moderator_or_admin());
ALTER POLICY migration_event_peoples_write_moderator_update ON public.migration_event_peoples
  USING (private.is_moderator_or_admin())
  WITH CHECK (private.is_moderator_or_admin());
ALTER POLICY migration_event_peoples_write_moderator_delete ON public.migration_event_peoples
  USING (private.is_moderator_or_admin());

ALTER POLICY protected_records_editorial_select ON public.protected_records
  USING (private.is_protected_records_editor());
ALTER POLICY protected_record_audit_editorial_select ON public.protected_record_audit
  USING (private.is_protected_records_editor());

-- The fifteenth. 033 put a predicate call on the storage bucket too, which is
-- easy to miss because it is the only one outside `public`.
ALTER POLICY protected_records_storage_editorial_select ON storage.objects
  USING (
    bucket_id = 'protected-records'
    AND private.is_protected_records_editor()
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Drop the exposed copies. Any policy still calling one makes this fail,
--    which is the intended safety net rather than a hazard.
-- ────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_moderator_or_admin();
DROP FUNCTION IF EXISTS public.is_protected_records_editor();

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Revoke EXECUTE where nothing needs it.
--    FROM PUBLIC first: these functions were created with the default grant
--    to PUBLIC, so revoking from anon and authenticated alone — the remedy the
--    audit proposed — would have left every one of them callable.
-- ────────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.audit_assertion_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_log_enforce_append_only() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_alliance_source() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_assertion_required() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_name_record_sources() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_person_sources() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.flags_enforce_state_machine() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.flags_set_public_slug() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_protected_record_state_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protected_record_audit_append_only() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revisions_enforce_append_only() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revisions_notify_cache_invalidation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_flags_recompute_confidence() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_revisions_recompute_confidence() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Dead since 012: `src/lib/api/auth.ts` writes last_used_at itself. Exposed,
-- it answers whether a guessed key hash is a live key, and writes on the way.
REVOKE EXECUTE ON FUNCTION public.update_api_key_last_used(TEXT) FROM PUBLIC, anon, authenticated;
