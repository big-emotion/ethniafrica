-- Restores the COMMENT ON statements that migration 038 declares but the
-- database never received.
--
-- `npm run migrations:diff` reported three drifted migrations on recette. Two of
-- them are not drift at all:
--
--   018 — the file ends `do nothing;` and the ledger `do nothing`. A trailing
--         terminator. The two produce identical state.
--   039 — the file writes the constraint comment as adjacent string literals
--         across several lines; the ledger stored the concatenated result.
--         SQL concatenates adjacent literals separated by a newline, so again
--         the two produce identical state.
--
-- 038 is the real one, and it is narrower than "drifted" suggests: every
-- function and every policy is byte-identical between the file and the
-- database. What is missing is the documentation — fourteen COMMENT ON
-- statements explaining *why* `is_admin()` and `is_moderator_or_admin()` are
-- SECURITY DEFINER, which is the non-obvious part of DEC-017 and the reason the
-- 42P17 recursion is gone.
--
-- Comments carry no behaviour, so this migration cannot change how anything
-- runs. It exists because a security-definer function whose rationale lives
-- only in a file nobody reads at query time is how the next person removes it.
--
-- Re-running 038 would not close the gap: the ledger already counts it as done.
-- Hence a new migration rather than an edit.
--
-- ETNI-1186, DEC-017.

COMMENT ON FUNCTION public.is_admin() IS
  'SECURITY DEFINER: true iff auth.uid() holds the admin role. Bypasses RLS '
  'internally so callers (including user_roles'' own write policies) never '
  'recurse into user_roles'' RLS again. ETNI-1186, DEC-017.';

COMMENT ON FUNCTION public.is_moderator_or_admin() IS
  'SECURITY DEFINER: true iff auth.uid() holds the moderator or admin role. '
  'Bypasses RLS internally so role-gated write policies on other tables '
  '(name_records, migration_events, migration_event_peoples, ...) never '
  'recurse into user_roles'' RLS when evaluated on a select. ETNI-1186, DEC-017.';

COMMENT ON POLICY user_roles_admin_insert ON user_roles IS
  'Only admins may insert role rows. Replaces the self-referential FOR ALL '
  'policy that caused 42P17 recursion. ETNI-1186, DEC-017.';

COMMENT ON POLICY user_roles_admin_update ON user_roles IS
  'Only admins may update role rows. Replaces the self-referential FOR ALL '
  'policy that caused 42P17 recursion. ETNI-1186, DEC-017.';

COMMENT ON POLICY user_roles_admin_delete ON user_roles IS
  'Only admins may delete role rows. Replaces the self-referential FOR ALL '
  'policy that caused 42P17 recursion. ETNI-1186, DEC-017.';

COMMENT ON POLICY name_records_write_moderator_insert ON name_records IS
  'Only moderator and admin roles may insert name_records. ETNI-1186, DEC-017.';

COMMENT ON POLICY name_records_write_moderator_update ON name_records IS
  'Only moderator and admin roles may update name_records. ETNI-1186, DEC-017.';

COMMENT ON POLICY name_records_write_moderator_delete ON name_records IS
  'Only moderator and admin roles may delete name_records. ETNI-1186, DEC-017.';

COMMENT ON POLICY migration_events_write_moderator_insert ON migration_events IS
  'Only moderator and admin roles may insert migration_events. ETNI-1186, DEC-017.';

COMMENT ON POLICY migration_events_write_moderator_update ON migration_events IS
  'Only moderator and admin roles may update migration_events. ETNI-1186, DEC-017.';

COMMENT ON POLICY migration_events_write_moderator_delete ON migration_events IS
  'Only moderator and admin roles may delete migration_events. ETNI-1186, DEC-017.';

COMMENT ON POLICY migration_event_peoples_write_moderator_insert ON migration_event_peoples IS
  'Only moderator and admin roles may insert migration_event_peoples. ETNI-1186, DEC-017.';

COMMENT ON POLICY migration_event_peoples_write_moderator_update ON migration_event_peoples IS
  'Only moderator and admin roles may update migration_event_peoples. ETNI-1186, DEC-017.';

COMMENT ON POLICY migration_event_peoples_write_moderator_delete ON migration_event_peoples IS
  'Only moderator and admin roles may delete migration_event_peoples. ETNI-1186, DEC-017.';
