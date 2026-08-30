-- 048_antibot.sql
-- The anti-bot control leaves Cloudflare, so the schema stops naming it.
--
-- `flags.turnstile_token_verified` (022) recorded that a submission had passed
-- a human check. The check is now a proof of work computed in the reader's own
-- browser and verified here, so the column is renamed to what it has always
-- actually meant: `human_verified`. A column carrying a vendor's name after
-- the vendor is gone is the drift this repository corrects everywhere else.
--
-- `antibot_challenges` is what makes a challenge single-use. Replay is the one
-- attack proof of work does not answer on its own: a solved challenge could be
-- resubmitted until it expires. Upstash would have been the obvious store, but
-- `src/lib/ratelimit/flagRateLimit.ts` **fails open** when Upstash is not
-- configured — and a nonce store that fails open guarantees nothing. Supabase
-- is required to run at all (see CLAUDE.md), so the hard floor rests on the
-- thing that is always there.
--
-- Applied by a human via `supabase db push`, recette first, production second
-- (AR45 runbook). Both steps are required: a deploy that renames the column on
-- one project only leaves the other serving a schema the code no longer knows.

-- =============================================================================
-- 1. flags.turnstile_token_verified → flags.human_verified
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flags' AND column_name = 'turnstile_token_verified'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flags' AND column_name = 'human_verified'
  ) THEN
    ALTER TABLE flags RENAME COLUMN turnstile_token_verified TO human_verified;
  END IF;
END $$;

COMMENT ON COLUMN flags.human_verified IS
  'True when the submission passed the anti-bot control server-side. Set by '
  'the flags service, never by a client. Was turnstile_token_verified (022) '
  'until the control stopped being a third party (048).';

-- =============================================================================
-- 2. Rewrite the policy that referenced the old name
--
--    The site writes flags through the service-role client, which does not
--    consult RLS at all — this policy guards a direct client-side insert with
--    the public anon key. It is belt and braces, and it has to keep matching
--    the column or it silently stops guarding anything.
-- =============================================================================

DROP POLICY IF EXISTS flags_contributor_insert ON flags;
CREATE POLICY flags_contributor_insert ON flags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    contributor_id = auth.uid()
    AND human_verified = true
  );

COMMENT ON POLICY flags_contributor_insert ON flags IS
  'Authenticated contributors may INSERT a flag only when contributor_id '
  'matches their own uid() and human_verified is true. Anonymous reports do '
  'not travel this path: they are written by the service-role client after '
  'the handler has verified the proof of work (048).';

-- =============================================================================
-- 3. Single-use challenges
--
--    One row per issued challenge, deleted the moment it is spent. The table
--    stays small by construction: it holds only live challenges, and expired
--    rows are swept opportunistically when the next one is issued rather than
--    by a scheduled job nobody would notice failing.
--
--    No personal data. A salt is a random string with no link to a person, an
--    address or a session — which is the whole point of leaving Cloudflare.
-- =============================================================================

CREATE TABLE IF NOT EXISTS antibot_challenges (
  salt        TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE antibot_challenges IS
  'Live anti-bot challenges, one row each, deleted on use. Makes a proof of '
  'work single-use so a solved challenge cannot be replayed until it expires. '
  'Holds no personal data (048).';

CREATE INDEX IF NOT EXISTS idx_antibot_challenges_expires_at
  ON antibot_challenges (expires_at);

-- RLS on with no policy at all: every role is denied, and the table is
-- reachable only through the service-role client. Same posture as the rest of
-- the schema, where all 37 tables carry RLS.
ALTER TABLE antibot_challenges ENABLE ROW LEVEL SECURITY;
