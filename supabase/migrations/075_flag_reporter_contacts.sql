-- =============================================================================
-- Migration 075: flag_reporter_contacts — an optional address, verified by link
-- =============================================================================
-- Moderation charter §2 keeps reporting at two actions and no account. This
-- adds a third thing the reader *may* do and is never required to: leave an
-- address, so the decision can come back to them. The report is created and
-- published exactly as before whether or not they do.
--
-- The address is verified by a single-use link rather than a password, which
-- is what makes §6 finally true — until now the confirmation panel promised
-- "vous recevrez un email" while no address was ever collected.
--
-- Why a separate table rather than two columns on `flags`
-- ------------------------------------------------------
-- `flags` carries `flags_read_public` — SELECT USING (true). Our own API hides
-- the address behind PUBLIC_FLAG_COLUMNS, an explicit column allowlist, but
-- PostgREST does not go through our API: a column on `flags` would be readable
-- by anyone who asks the REST endpoint for it. So the address never lands on a
-- publicly-readable table. This one has RLS with no policy at all, which denies
-- every role but service_role.
--
-- One row per flag: the address, the pending token, and the moment it was
-- proven. The token is stored only as a SHA-256 hash — a leaked backup must not
-- hand anyone a working verification link.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS flag_reporter_contacts (
  flag_id     UUID        PRIMARY KEY REFERENCES flags(id) ON DELETE CASCADE,
  email       CITEXT      NOT NULL,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE flag_reporter_contacts IS
  'Optional reply address for an accountless report, plus its single-use '
  'verification token. Never publicly readable — see the RLS note below.';

COMMENT ON COLUMN flag_reporter_contacts.token_hash IS
  'SHA-256 hex of the link token. The raw token exists only in the e-mail.';

COMMENT ON COLUMN flag_reporter_contacts.verified_at IS
  'Set when the link is followed. Also the single-use marker: a token whose '
  'row already carries a stamp is spent. Only a verified address is ever '
  'written to — an unverified one may belong to someone who never asked.';

CREATE INDEX IF NOT EXISTS idx_flag_reporter_contacts_email
  ON flag_reporter_contacts (email);

ALTER TABLE flag_reporter_contacts ENABLE ROW LEVEL SECURITY;

-- Deliberately no policy. RLS enabled with none denies every role but
-- service_role, which is the only correct exposure for a reader's address.
