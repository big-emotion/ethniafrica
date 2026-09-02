-- =============================================================================
-- Migration 081: contributions become flags
-- =============================================================================
-- The atlas had two moderation surfaces and only ever staffed one.
--
-- Reports landed in `flags`, were read on /fr/admin, and — by charter §7 — were
-- only ever decided, never applied: accepting a report says the atlas agrees,
-- not that the atlas has edited itself. Contributions landed in their own
-- `contributions` table, were read on a second admin nobody opened, and on
-- approval were written straight into `afrik_peoples` / `afrik_countries` /
-- `afrik_language_families` by an API route that never checked whether the
-- write succeeded. That second path is removed entirely: the corpus is edited
-- from `dataset/source/afrik/*.json` and nowhere else, so a database-only merge
-- was overwritten by the next `migrateAfrikToDatabase` run anyway.
--
-- One surface remains. A contribution is now a flag whose `flag_kind` says so,
-- carrying its structured proposal in `contribution_payload`.
--
-- ── Why the anchor check has to give ──────────────────────────────────────
-- `flags_has_anchor_check` (migration 020) requires every flag to point at
-- something: an assertion, or an (entity_type, entity_id) pair. That is right
-- for a report, which is always *about* an existing claim. It cannot hold for
-- a contribution proposing a people the corpus does not have yet — there is no
-- row to point at, and inventing a placeholder id to satisfy a constraint
-- would put a fictional entity in the anchor column. So the check now exempts
-- `contribution`, and only `contribution`: every other kind still has to
-- anchor, which is the property the constraint exists to guarantee.
--
-- ── Why imported rows all arrive `open` ───────────────────────────────────
-- `contributions.status` (pending/approved/rejected) does not map onto the flag
-- state machine cleanly: a flag reaching a terminal state owes a published
-- decision note (charter §7), and rows imported from a surface that never
-- required one have none. Rather than forge notes, every imported row lands
-- `open` and keeps its original status inside `contribution_payload`, where it
-- reads as what it is — a fact about the retired table, not a decision this
-- atlas has published.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. flags gains the kind and the payload column
-- -----------------------------------------------------------------------------

ALTER TABLE flags
  ADD COLUMN IF NOT EXISTS contribution_payload JSONB;

COMMENT ON COLUMN flags.contribution_payload IS
  'Structured proposal submitted through /fr/contribute. NULL for every kind but contribution.';

ALTER TABLE flags DROP CONSTRAINT IF EXISTS flags_flag_kind_check;

ALTER TABLE flags
  ADD CONSTRAINT flags_flag_kind_check
    CHECK (flag_kind IN (
      'inaccurate',
      'missing-source',
      'broken-url',
      'offensive',
      'correction-proposal',
      'other',
      'contribution'
    ));

-- -----------------------------------------------------------------------------
-- 2. A contribution may stand without an anchor; nothing else may
-- -----------------------------------------------------------------------------

ALTER TABLE flags DROP CONSTRAINT IF EXISTS flags_has_anchor_check;

ALTER TABLE flags
  ADD CONSTRAINT flags_has_anchor_check CHECK (
    flag_kind = 'contribution'
    OR assertion_id IS NOT NULL
    OR (entity_type IS NOT NULL AND entity_id IS NOT NULL)
  );

-- -----------------------------------------------------------------------------
-- 3. Carry the existing contributions over, then retire the table
-- -----------------------------------------------------------------------------
-- Guarded on the table's existence so the migration replays on a database that
-- never had it. `public_slug` is left to the BEFORE INSERT trigger from 022.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contributions'
  ) THEN
    INSERT INTO flags (
      entity_type,
      entity_id,
      flag_kind,
      reason_text,
      contribution_payload,
      status,
      human_verified,
      created_at
    )
    SELECT
      NULL,
      NULL,
      'contribution',
      COALESCE(
        NULLIF(TRIM(c.notes), ''),
        'Contribution reprise de la table contributions, sans note du contributeur.'
      ),
      jsonb_build_object(
        'contribution_type', c.type::TEXT,
        'proposed_payload', c.proposed_payload,
        'contributor_name', c.contributor_name,
        'contributor_email', c.contributor_email,
        'imported_status', c.status::TEXT,
        'imported_from', 'contributions',
        'moderator_notes', c.moderator_notes
      ),
      'open',
      TRUE,
      c.created_at
    FROM contributions c;

    DROP TABLE contributions;
  END IF;
END $$;

DROP TYPE IF EXISTS contribution_type;
DROP TYPE IF EXISTS contribution_status;
