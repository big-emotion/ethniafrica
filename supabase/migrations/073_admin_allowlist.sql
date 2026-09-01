-- =============================================================================
-- Migration 073: admin_allowlist — the only authorization model for the console
-- =============================================================================
-- The atlas no longer has public accounts: reporting costs no account
-- (moderation charter §2) and the sign-up, sign-in and SSO surfaces are gone.
-- Authorization therefore has to attach to something that exists before anyone
-- signs in, and an e-mail address is the only such thing.
--
-- This replaces contributor_profiles.moderator_role as the admin gate. That
-- column could only be set on a row created by a successful sign-in, and the
-- callback wrote that row on `id` while every reader queried `user_id` — so no
-- profile was ever found and no role was ever held. Measured on recette before
-- this migration: 0 rows in contributor_profiles.
--
-- The column is not dropped here. It still describes editorial standing for
-- revision_drafts RLS (migration 023); it simply stops opening the console.
--
-- Security
-- --------
-- RLS is enabled and *no policy is created*. With RLS on and no policy, every
-- role except service_role is denied — which is the intent: the list of people
-- who may moderate is not public information. Reads go through
-- `src/lib/auth/adminAllowlist.ts` on the service-role client.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS admin_allowlist (
  email      CITEXT      PRIMARY KEY,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE admin_allowlist IS
  'Addresses allowed to request a moderation-console sign-in link. '
  'The sole admin authorization check — see src/lib/auth/adminAllowlist.ts.';

COMMENT ON COLUMN admin_allowlist.email IS
  'CITEXT so that casing never decides whether a moderator gets in.';

COMMENT ON COLUMN admin_allowlist.note IS
  'Who this is and who vouched for them. Free text, for the humans.';

ALTER TABLE admin_allowlist ENABLE ROW LEVEL SECURITY;

-- Deliberately no policy: RLS enabled with none denies every role but
-- service_role. Adding a public SELECT here would publish the moderator roster.
