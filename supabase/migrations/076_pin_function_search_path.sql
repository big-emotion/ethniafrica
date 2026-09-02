-- =============================================================================
-- Migration 076: pin the search_path of every function that still resolves
--                names at call time
-- =============================================================================
-- The Supabase security linter reported twenty functions in `public` with a
-- role-mutable search_path on the recette project (shmrjtnfbqzceovroqjj,
-- 2026-09-02). A function that resolves its own identifiers through whatever
-- search_path the caller happens to hold runs the code of the first schema on
-- that list — so a role able to create a schema and put `user_roles` or
-- `digest` in front of `public` gets the function's body to call its objects
-- instead of ours. On a SECURITY DEFINER function that is a privilege
-- escalation; on the rest it is still a correctness hazard.
--
-- Why `public, extensions, pg_temp` and not the tighter `public, pg_temp`
-- ---------------------------------------------------------------------
-- It is the list 052 and every `afrik_search_*` function already pin, and it
-- matches the search_path Supabase gives `anon` and `authenticated`, so no
-- body changes meaning. Bodies were checked for unqualified calls into
-- `extensions` (unaccent, pgcrypto, uuid-ossp) and for a bare `uid()`: there
-- are none, but keeping `extensions` on the list means a later edit that adds
-- one does not fail in production. `pg_temp` stays last, which is the point of
-- naming it at all — a temp schema searched first is the escalation.
--
-- This migration changes no function body. It only sets a property, so it is
-- idempotent and re-runnable, and it can be reverted by re-running the same
-- statements with `RESET search_path`.
--
-- Audit trail: "Ce qu'un clone donne", axis 2 finding A2-03.
-- =============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Trigger functions
-- ────────────────────────────────────────────────────────────────────────────
ALTER FUNCTION public.audit_assertion_changes() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.audit_log_enforce_append_only() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.enforce_alliance_source() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.enforce_assertion_required() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.enforce_name_record_sources() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.enforce_person_sources() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.flags_enforce_state_machine() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.flags_set_public_slug() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.protected_record_audit_append_only() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.revisions_enforce_append_only() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.revisions_notify_cache_invalidation() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.trg_flags_recompute_confidence() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.trg_revisions_recompute_confidence() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, extensions, pg_temp;

-- ────────────────────────────────────────────────────────────────────────────
-- Callable helpers. `update_api_key_last_used` is the one that matters most:
-- it is SECURITY DEFINER and it writes.
-- ────────────────────────────────────────────────────────────────────────────
ALTER FUNCTION public.flags_compute_slug(UUID, INTEGER) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.protected_record_public_state(protected_records) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.recompute_confidence(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.recompute_confidence_all() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.update_api_key_last_used(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.validate_people_historical_affiliation(JSONB) SET search_path = public, extensions, pg_temp;
