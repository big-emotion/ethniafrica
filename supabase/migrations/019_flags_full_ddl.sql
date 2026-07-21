-- Migration 019: flags — full DDL, state machine, public_slug, RLS
-- =============================================================================
-- Story: ETNI-54 [4.1] — `flags` table DDL + state machine + RLS
-- Sub-tasks: ETNI-277 (DDL), ETNI-279 (state machine), ETNI-281 (public_slug),
--            ETNI-283 (RLS policies)
--
-- Migration 008 created a skeleton flags table.  Migrations 013 and 018
-- added severity/auto_generated and assertion_id/anchor-check columns.
-- This migration ships the full ETNI-54 column set, enforces the status state
-- machine, auto-generates public_slug (Crockford base32), and replaces the
-- permissive write-denied-by-default RLS with explicit contributor policies.
--
-- Column changes (idempotent rename guards):
--   flag_type    → flag_kind  (CHECK ∈ {inaccurate|missing-source|broken-url|
--                               offensive|correction-proposal|other})
--   description  → reason_text
--   created_by   → contributor_id  (FK → auth.users, ON DELETE SET NULL)
--   status CHECK updated: old {pending|reviewed|resolved|dismissed}
--                         → new {open|under_review|accepted|rejected|withdrawn|duplicate}
--   entity_type  → nullable (was NOT NULL; anchor check still guards integrity)
--   entity_id    → nullable (was NOT NULL; same reason)
--
-- New columns added (IF NOT EXISTS — idempotent):
--   updated_at TIMESTAMPTZ
--   counter_source_url TEXT
--   counter_source_citation TEXT
--   proposed_rewrite TEXT
--   moderator_id UUID
--   moderator_notes TEXT
--   public_slug TEXT UNIQUE
--   turnstile_token_verified BOOLEAN
--
-- Triggers added:
--   BEFORE UPDATE — flags_enforce_state_machine  (state machine)
--   BEFORE INSERT — flags_set_public_slug        (Crockford base32 slug)
--   BEFORE UPDATE — flags_updated_at             (updated_at stamp)
--
-- RLS policies replaced / added (all idempotent DROP-then-CREATE):
--   flags_read_public          — SELECT: everyone (re-asserted)
--   flags_contributor_insert   — INSERT: authenticated contributor only
--                                 (contributor_id = auth.uid()
--                                  AND turnstile_token_verified = true)
--   flags_contributor_withdraw — UPDATE: contributor may only withdraw their
--                                 own open flag (status 'open' → 'withdrawn')
--   No DELETE policy           — DELETE is blocked for all roles (append-only).
--                                 Hard deletes only via DBA runbook.
--
-- Idempotency: every DDL statement uses IF NOT EXISTS / IF EXISTS / DO guards
-- or DROP-then-CREATE so re-running this migration on an already-migrated DB
-- is safe.
-- =============================================================================


-- =============================================================================
-- 0. RLS already enabled by migration 008 — re-assert idempotently.
-- =============================================================================

ALTER TABLE flags ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 1. Column renames (idempotent DO blocks)
-- =============================================================================

-- 1a. flag_type → flag_kind
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flags' AND column_name = 'flag_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flags' AND column_name = 'flag_kind'
  ) THEN
    ALTER TABLE flags RENAME COLUMN flag_type TO flag_kind;
  END IF;
END $$;

-- 1b. description → reason_text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flags' AND column_name = 'description'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flags' AND column_name = 'reason_text'
  ) THEN
    ALTER TABLE flags RENAME COLUMN description TO reason_text;
  END IF;
END $$;

-- 1c. created_by → contributor_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flags' AND column_name = 'created_by'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flags' AND column_name = 'contributor_id'
  ) THEN
    ALTER TABLE flags RENAME COLUMN created_by TO contributor_id;
  END IF;
END $$;


-- =============================================================================
-- 2. Add FK from contributor_id to auth.users (ON DELETE SET NULL)
--    Idempotent: only add if not already present.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'flags_contributor_id_fkey'
      AND conrelid = 'flags'::regclass
  ) THEN
    ALTER TABLE flags
      ADD CONSTRAINT flags_contributor_id_fkey
        FOREIGN KEY (contributor_id)
        REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;


-- =============================================================================
-- 3. Make entity_type / entity_id nullable
--    (The flags_has_anchor_check from migration 018 still enforces that every
--    flag anchors to either an assertion OR a (entity_type, entity_id) pair.)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flags'
      AND column_name = 'entity_type'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE flags ALTER COLUMN entity_type DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flags'
      AND column_name = 'entity_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE flags ALTER COLUMN entity_id DROP NOT NULL;
  END IF;
END $$;


-- =============================================================================
-- 4. flag_kind CHECK constraint
--    Drop any old check on flag_type/flag_kind, add the canonical one.
-- =============================================================================

-- Drop old constraint by scanning pg_constraint (name may vary across envs).
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'flags'
      AND c.contype = 'c'
      AND a.attname IN ('flag_type', 'flag_kind')
      AND c.conname NOT IN ('flags_has_anchor_check')
  LOOP
    EXECUTE format('ALTER TABLE flags DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'flags_flag_kind_check'
      AND conrelid = 'flags'::regclass
  ) THEN
    ALTER TABLE flags
      ADD CONSTRAINT flags_flag_kind_check
        CHECK (flag_kind IN (
          'inaccurate',
          'missing-source',
          'broken-url',
          'offensive',
          'correction-proposal',
          'other'
        ));
  END IF;
END $$;


-- =============================================================================
-- 5. Status CHECK constraint + value migration
--    Old values: pending | reviewed | resolved | dismissed
--    New values: open | under_review | accepted | rejected | withdrawn | duplicate
-- =============================================================================

-- 5a. Drop the old status CHECK so we can migrate values without it firing.
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'flags'
      AND c.contype = 'c'
      AND a.attname = 'status'
      AND c.conname NOT IN ('flags_has_anchor_check', 'flags_flag_kind_check')
  LOOP
    EXECUTE format('ALTER TABLE flags DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

-- 5b. Migrate legacy status values to the new state-machine vocabulary.
UPDATE flags SET status = 'open'         WHERE status = 'pending';
UPDATE flags SET status = 'under_review' WHERE status = 'reviewed';
UPDATE flags SET status = 'accepted'     WHERE status = 'resolved';
UPDATE flags SET status = 'rejected'     WHERE status = 'dismissed';

-- 5c. Apply the new canonical CHECK.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'flags_status_check'
      AND conrelid = 'flags'::regclass
  ) THEN
    ALTER TABLE flags
      ADD CONSTRAINT flags_status_check
        CHECK (status IN (
          'open',
          'under_review',
          'accepted',
          'rejected',
          'withdrawn',
          'duplicate'
        ));
  END IF;
END $$;

-- 5d. Ensure default is 'open' for new rows.
ALTER TABLE flags ALTER COLUMN status SET DEFAULT 'open';


-- =============================================================================
-- 6. Add new columns (idempotent: ADD COLUMN IF NOT EXISTS)
-- =============================================================================

ALTER TABLE flags
  ADD COLUMN IF NOT EXISTS updated_at                TIMESTAMPTZ  DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS counter_source_url        TEXT,
  ADD COLUMN IF NOT EXISTS counter_source_citation   TEXT,
  ADD COLUMN IF NOT EXISTS proposed_rewrite          TEXT,
  ADD COLUMN IF NOT EXISTS moderator_id              UUID,
  ADD COLUMN IF NOT EXISTS moderator_notes           TEXT,
  ADD COLUMN IF NOT EXISTS public_slug               TEXT,
  ADD COLUMN IF NOT EXISTS turnstile_token_verified  BOOLEAN      NOT NULL DEFAULT FALSE;

-- 6a. UNIQUE constraint on public_slug (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'flags_public_slug_key'
      AND conrelid = 'flags'::regclass
  ) THEN
    ALTER TABLE flags ADD CONSTRAINT flags_public_slug_key UNIQUE (public_slug);
  END IF;
END $$;


-- =============================================================================
-- 7. Backfill public_slug for any existing rows that lack one.
--    Uses the same Crockford algorithm the trigger will use going forward.
-- =============================================================================

DO $$
DECLARE
  r         RECORD;
  hex_chars TEXT;
  n         NUMERIC;
  i         INTEGER;
  c         TEXT;
  result    TEXT;
  remainder INTEGER;
  crockford CONSTANT TEXT := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  attempt   INTEGER;
  candidate TEXT;
BEGIN
  FOR r IN SELECT id FROM flags WHERE public_slug IS NULL LOOP
    hex_chars := substring(replace(r.id::TEXT, '-', '') FROM 1 FOR 10);

    -- Hex → numeric.
    n := 0;
    FOR i IN 1..10 LOOP
      c := substring(hex_chars FROM i FOR 1);
      n := n * 16 + CASE
        WHEN c >= '0' AND c <= '9' THEN ascii(c) - 48
        ELSE                            ascii(upper(c)) - 55
      END;
    END LOOP;

    -- Encode in Crockford base32, 10 chars.
    FOR attempt IN 0..9 LOOP
      result := '';
      DECLARE tmp NUMERIC := n + attempt;
      BEGIN
        IF tmp = 0 THEN
          result := '0000000000';
        ELSE
          WHILE tmp > 0 LOOP
            remainder := (tmp % 32)::INTEGER;
            result := substring(crockford FROM remainder + 1 FOR 1) || result;
            tmp := floor(tmp / 32);
          END LOOP;
        END IF;
        candidate := lpad(result, 10, '0');
        IF NOT EXISTS (SELECT 1 FROM flags WHERE public_slug = candidate) THEN
          UPDATE flags SET public_slug = candidate WHERE id = r.id;
          EXIT;
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;


-- =============================================================================
-- 8. Trigger: BEFORE INSERT — flags_set_public_slug
--    Derives a 10-char Crockford base32 slug from the row id UUID.
--    If a collision occurs (extremely rare), increments the base value by 1
--    and retries up to 10 times before raising a clear error.
-- =============================================================================

CREATE OR REPLACE FUNCTION flags_compute_slug(p_id UUID, p_offset INTEGER DEFAULT 0)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  crockford CONSTANT TEXT := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  hex_chars TEXT;
  n         NUMERIC;
  i         INTEGER;
  c         TEXT;
  result    TEXT := '';
  remainder INTEGER;
BEGIN
  -- Take first 10 hex chars of the UUID (without hyphens) — 40 bits.
  -- 16^10 = 2^40 = 1 099 511 627 776 < 32^10 = 2^50, so 40 bits always
  -- fits within the 10-Crockford-char range.
  hex_chars := substring(replace(p_id::TEXT, '-', '') FROM 1 FOR 10);

  n := 0;
  FOR i IN 1..10 LOOP
    c := substring(hex_chars FROM i FOR 1);
    n := n * 16 + CASE
      WHEN c >= '0' AND c <= '9' THEN ascii(c) - 48
      ELSE                            ascii(upper(c)) - 55
    END;
  END LOOP;

  n := n + p_offset;

  IF n = 0 THEN
    RETURN '0000000000';
  END IF;

  WHILE n > 0 LOOP
    remainder := (n % 32)::INTEGER;
    result    := substring(crockford FROM remainder + 1 FOR 1) || result;
    n         := floor(n / 32);
  END LOOP;

  RETURN lpad(result, 10, '0');
END;
$$;

COMMENT ON FUNCTION flags_compute_slug(UUID, INTEGER) IS
  'Helper: compute a 10-char Crockford base32 slug from the first 40 bits of '
  'a UUID, with an optional integer offset for collision handling. ETNI-281.';


CREATE OR REPLACE FUNCTION flags_set_public_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  candidate TEXT;
  attempt   INTEGER;
BEGIN
  IF NEW.public_slug IS NOT NULL THEN
    RETURN NEW;
  END IF;

  FOR attempt IN 0..9 LOOP
    candidate := flags_compute_slug(NEW.id, attempt);
    IF NOT EXISTS (SELECT 1 FROM flags WHERE public_slug = candidate) THEN
      NEW.public_slug := candidate;
      RETURN NEW;
    END IF;
  END LOOP;

  RAISE EXCEPTION
    'flags_set_public_slug: could not find a unique public_slug for id % after 10 attempts',
    NEW.id
    USING ERRCODE = 'unique_violation';
END;
$$;

COMMENT ON FUNCTION flags_set_public_slug() IS
  'BEFORE INSERT trigger: auto-populates public_slug with a 10-char Crockford '
  'base32 code derived from the row UUID.  Retries up to 10 times on collision. '
  'ETNI-281.';

DROP TRIGGER IF EXISTS flags_before_insert_slug ON flags;
CREATE TRIGGER flags_before_insert_slug
  BEFORE INSERT ON flags
  FOR EACH ROW
  EXECUTE FUNCTION flags_set_public_slug();

COMMENT ON TRIGGER flags_before_insert_slug ON flags IS
  'Auto-populates public_slug before each INSERT. ETNI-281.';


-- =============================================================================
-- 9. Trigger: BEFORE UPDATE — flags_enforce_state_machine
--    Allowed transitions:
--      open         → under_review | withdrawn
--      under_review → accepted | rejected | duplicate
--      terminal states (accepted | rejected | withdrawn | duplicate) — no exit
-- =============================================================================

CREATE OR REPLACE FUNCTION flags_enforce_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Status unchanged — nothing to validate.
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Validate the transition.
  IF (OLD.status = 'open'         AND NEW.status IN ('under_review', 'withdrawn'))
  OR (OLD.status = 'under_review' AND NEW.status IN ('accepted', 'rejected', 'duplicate'))
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Illegal flag transition: % → %',
    OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END;
$$;

COMMENT ON FUNCTION flags_enforce_state_machine() IS
  'BEFORE UPDATE trigger: enforces the flags state machine. '
  'Valid: open→under_review|withdrawn; under_review→accepted|rejected|duplicate. '
  'Terminal states have no valid outgoing transitions. ETNI-279.';

DROP TRIGGER IF EXISTS flags_state_machine ON flags;
CREATE TRIGGER flags_state_machine
  BEFORE UPDATE OF status ON flags
  FOR EACH ROW
  EXECUTE FUNCTION flags_enforce_state_machine();

COMMENT ON TRIGGER flags_state_machine ON flags IS
  'Enforces the flag status state machine (ETNI-279).';


-- =============================================================================
-- 10. Trigger: BEFORE UPDATE — updated_at stamp
--     Reuses update_updated_at_column() from migration 010.
-- =============================================================================

DROP TRIGGER IF EXISTS flags_updated_at ON flags;
CREATE TRIGGER flags_updated_at
  BEFORE UPDATE ON flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER flags_updated_at ON flags IS
  'Stamps updated_at on every flags UPDATE. ETNI-54.';


-- =============================================================================
-- 11. RLS policies (idempotent DROP-then-CREATE)
-- =============================================================================

-- 11a. Public SELECT — everyone (FR14, FR17).
DROP POLICY IF EXISTS flags_read_public ON flags;
CREATE POLICY flags_read_public ON flags
  FOR SELECT
  USING (true);

COMMENT ON POLICY flags_read_public ON flags IS
  'Any client (anon or authenticated) may SELECT all flags — public audit '
  'trail (FR14, FR17). ETNI-283.';

-- 11b. Contributor INSERT — contributor_id must match the caller's uid()
--      AND turnstile_token_verified must be true.
DROP POLICY IF EXISTS flags_contributor_insert ON flags;
CREATE POLICY flags_contributor_insert ON flags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    contributor_id = auth.uid()
    AND turnstile_token_verified = true
  );

COMMENT ON POLICY flags_contributor_insert ON flags IS
  'Authenticated contributors may INSERT a flag only when contributor_id '
  'matches their own uid() and turnstile_token_verified is true. ETNI-283.';

-- 11c. Contributor UPDATE — only: withdraw their own open flag.
--      Any other update (e.g. moderator transitions) must go through the
--      service-role admin client (Epic 5).
DROP POLICY IF EXISTS flags_contributor_withdraw ON flags;
CREATE POLICY flags_contributor_withdraw ON flags
  FOR UPDATE
  TO authenticated
  USING (
    contributor_id = auth.uid()
    AND status = 'open'
  )
  WITH CHECK (
    contributor_id = auth.uid()
    AND status = 'withdrawn'
  );

COMMENT ON POLICY flags_contributor_withdraw ON flags IS
  'Authenticated contributors may only change their own open flags to '
  'withdrawn. All other updates require the service-role admin client '
  '(Epic 5 — moderator flow). ETNI-283.';

-- No DELETE policy — all deletes are rejected (append-only).
-- Hard deletes are a DBA-only operation performed outside RLS.


-- =============================================================================
-- 12. Column comments
-- =============================================================================

COMMENT ON COLUMN flags.flag_kind IS
  'Reason category: inaccurate | missing-source | broken-url | offensive | '
  'correction-proposal | other';
COMMENT ON COLUMN flags.reason_text IS
  'Contributor-authored explanation of the flag';
COMMENT ON COLUMN flags.contributor_id IS
  'auth.users.id of the contributor who filed this flag';
COMMENT ON COLUMN flags.counter_source_url IS
  'URL of a source that contradicts the flagged claim (correction-proposal path)';
COMMENT ON COLUMN flags.counter_source_citation IS
  'Full citation for the counter-source';
COMMENT ON COLUMN flags.proposed_rewrite IS
  'Contributor-suggested replacement text for the flagged assertion';
COMMENT ON COLUMN flags.status IS
  'State-machine status: open | under_review | accepted | rejected | '
  'withdrawn | duplicate';
COMMENT ON COLUMN flags.moderator_id IS
  'auth.users.id of the moderator who resolved this flag';
COMMENT ON COLUMN flags.moderator_notes IS
  'Moderator-authored notes explaining the resolution';
COMMENT ON COLUMN flags.public_slug IS
  '10-character Crockford base32 code; stable, URL-safe public identifier';
COMMENT ON COLUMN flags.turnstile_token_verified IS
  'Set to true by the server after verifying the Cloudflare Turnstile token';
COMMENT ON COLUMN flags.updated_at IS
  'Timestamp of the most recent UPDATE on this row';
