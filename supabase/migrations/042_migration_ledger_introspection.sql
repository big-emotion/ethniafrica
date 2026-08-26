-- Migration 042 — Expose the applied-migration ledger to the service role
--
-- Context: nothing in CI could answer "is this database up to date with
-- supabase/migrations/?". The answer lives in
-- supabase_migrations.schema_migrations, a schema PostgREST does not expose, so
-- the only way to read it was a human opening the dashboard or an MCP session.
-- The cost of that gap is on record: 037 and 038 were marked Done in Jira and
-- their pull requests merged while neither was applied to any database, and
-- three corpora loaded zero rows for months because migration 003's constraint
-- had been silently dropped by a later migration.
--
-- This adds one read-only function so `scripts/ci/checkMigrationState.ts` can
-- reconcile files against reality on every pull request.
--
-- Why a SECURITY DEFINER function rather than exposing the schema: the schema
-- carries a write path (the CLI inserts into it), and exposing it through
-- PostgREST would put that write path one grant away from the anon key. A
-- function takes no arguments, runs a fixed SELECT, and is granted to
-- service_role alone — there is no argument to inject through and no row an
-- anonymous caller can reach.
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project. Idempotent — CREATE OR REPLACE plus REVOKE/GRANT.

CREATE OR REPLACE FUNCTION public.applied_migrations()
RETURNS TABLE (version TEXT, name TEXT, statements TEXT[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = supabase_migrations, pg_temp
AS $$
  SELECT m.version, m.name, m.statements
  FROM supabase_migrations.schema_migrations AS m
  ORDER BY m.version;
$$;

COMMENT ON FUNCTION public.applied_migrations() IS
  'Read-only view of supabase_migrations.schema_migrations for CI migration-state reconciliation. Service role only; see scripts/ci/checkMigrationState.ts.';

-- PUBLIC gets EXECUTE on new functions by default, which would hand the anon
-- key the schema history. Revoke first, then grant the one role that needs it.
REVOKE ALL ON FUNCTION public.applied_migrations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.applied_migrations() FROM anon;
REVOKE ALL ON FUNCTION public.applied_migrations() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.applied_migrations() TO service_role;

-- Verification (run as service_role; expect one row per applied migration):
--   SELECT count(*) FROM public.applied_migrations();
-- And as anon, expect "permission denied for function applied_migrations":
--   SELECT * FROM public.applied_migrations();
