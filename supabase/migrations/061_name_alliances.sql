-- Migration 061 — name-granularity alliances: afrik_patronyme_alliances
--
-- Story: ETNI-1455. Sub-tasks ETNI-1642 (DDL, canonical ordering, RLS — AC1)
-- and ETNI-1643 (per-edge source + tier, source-or-drop trigger — AC2).
--
-- The Manding sanankuya is a documented, symmetric relation between two clan
-- names. Stored naively under both (A, B) and (B, A) it duplicates itself and
-- a fiche shows the same alliance twice. This migration adds a table at NAME
-- granularity (afrik_patronymes, migration 053 — this ticket's "ticket 1"
-- dependency), modelled on afrik_people_relations (030_people_relations.sql),
-- that makes the reversed pair a rejected insert rather than a second row.
--
-- The alliance registry is not closed and its terminology varies by region
-- (sinankunya, rakiré, toukpê, dendiraagal): alliance_type is a coarse
-- discriminant, not an assertion inherited by every edge. Every edge carries
-- its own source and tier — no blanket claim is inherited from the type.
--
-- Scope — out (per the parent ticket): seeding actual alliances (editorial),
-- the UI that renders them.
--
-- Fully idempotent (IF NOT EXISTS / DO-EXCEPTION / DROP-then-CREATE), same
-- discipline as 030/053. Two-step rollout: recette first, applied
-- automatically on merge via `migrate-recette.yml`; production second, by
-- hand, per the AR45 runbook. This migration is code-complete without being
-- applied to any database by this automation.
-- =============================================================================

-- =============================================================================
-- 1. Enum: alliance_type
-- -----------------------------------------------------------------------------
-- One initial value for the documented Manding sanankuya / joking-kinship
-- family. Deliberately not exhaustive — the registry is open, and a future
-- migration adds a value the day a second alliance family is sourced. The
-- type is a coarse discriminant only; it asserts nothing about any one edge.
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE alliance_type AS ENUM ('joking_kinship');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TYPE alliance_type IS
  'Coarse alliance-family discriminant (e.g. Manding sanankuya). Regional '
  'terminology for the same phenomenon varies (sinankunya, rakiré, toukpê, '
  'dendiraagal) and is recorded per edge, not encoded here. Not a closed '
  'registry — no assertion is inherited by an edge from its type. ETNI-1455.';

-- =============================================================================
-- 2. Table: afrik_patronyme_alliances
-- -----------------------------------------------------------------------------
-- Canonical ordering (AC1): name_id_a < name_id_b is enforced by CHECK, so
-- the symmetric alliance (A, B) can only ever be stored one way — inserting
-- it as (B, A) violates the ordering CHECK directly, and inserting the same
-- ordered pair twice violates the UNIQUE constraint.
--
-- Per-edge source and tier (AC2): source_id is NOT NULL and tier follows the
-- one three-value vocabulary from migration 041 (official / referenced /
-- unverified) — no other tier value is legal. The BEFORE INSERT trigger
-- below (section 4) gives a source-or-drop rejection its own readable
-- message, the same posture as enforce_name_record_sources() (029, retiered
-- by 041) for name_records.assertion_id.
-- =============================================================================
CREATE TABLE IF NOT EXISTS afrik_patronyme_alliances (
  id             TEXT NOT NULL PRIMARY KEY CHECK (id ~ '^ALL_[A-Z0-9_]+$'),
  alliance_type  alliance_type NOT NULL,
  name_id_a      TEXT NOT NULL REFERENCES afrik_patronymes(id),
  name_id_b      TEXT NOT NULL REFERENCES afrik_patronymes(id),
  source_id      UUID NOT NULL REFERENCES sources(id),
  tier           TEXT NOT NULL CHECK (tier IN ('official', 'referenced', 'unverified')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (name_id_a <> name_id_b),
  CHECK (name_id_a < name_id_b),
  UNIQUE (name_id_a, name_id_b)
);

COMMENT ON TABLE afrik_patronyme_alliances IS
  'Sourced, symmetric alliance edges between two names (afrik_patronymes), '
  'e.g. the Manding sanankuya. Canonical ordering (name_id_a < name_id_b) '
  'makes the reversed pair a rejected insert, not a duplicate row. ETNI-1455.';
COMMENT ON COLUMN afrik_patronyme_alliances.id IS 'Stable ALL_xxxxx identifier, matching the FLG_/PPL_/PAT_ convention.';
COMMENT ON COLUMN afrik_patronyme_alliances.alliance_type IS 'Coarse alliance-family discriminant — see the alliance_type comment.';
COMMENT ON COLUMN afrik_patronyme_alliances.name_id_a IS 'Lower id of the canonically ordered pair (name_id_a < name_id_b).';
COMMENT ON COLUMN afrik_patronyme_alliances.name_id_b IS 'Higher id of the canonically ordered pair (name_id_a < name_id_b).';
COMMENT ON COLUMN afrik_patronyme_alliances.source_id IS 'The source this specific edge rests on — never inherited from alliance_type (source or drop, AC2).';
COMMENT ON COLUMN afrik_patronyme_alliances.tier IS 'Authority of source_id, restated on the edge per the one three-value vocabulary (migration 041).';

CREATE INDEX IF NOT EXISTS idx_patronyme_alliances_name_a  ON afrik_patronyme_alliances(name_id_a);
CREATE INDEX IF NOT EXISTS idx_patronyme_alliances_name_b  ON afrik_patronyme_alliances(name_id_b);
CREATE INDEX IF NOT EXISTS idx_patronyme_alliances_type    ON afrik_patronyme_alliances(alliance_type);
CREATE INDEX IF NOT EXISTS idx_patronyme_alliances_source  ON afrik_patronyme_alliances(source_id);

-- =============================================================================
-- 3. RLS — public read, service-role-only writes (pattern from 019_afrik_rls.sql)
-- =============================================================================
ALTER TABLE afrik_patronyme_alliances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS afrik_patronyme_alliances_read_public ON afrik_patronyme_alliances;
CREATE POLICY afrik_patronyme_alliances_read_public ON afrik_patronyme_alliances
  FOR SELECT USING (true);

-- Deliberately no INSERT/UPDATE/DELETE policy for anon or authenticated —
-- writes flow only through the service-role loader, which bypasses RLS via
-- SUPABASE_SERVICE_ROLE_KEY (same posture as afrik_people_relations and
-- afrik_patronymes).

-- =============================================================================
-- 4. Trigger: source-or-drop enforcement (AC2)
-- -----------------------------------------------------------------------------
-- source_id is already NOT NULL; the trigger exists to give a rejection a
-- readable, on-brand message ("source or drop") and to be the mechanism this
-- ticket's acceptance criterion names explicitly, the same way
-- enforce_name_record_sources() (029/041) does for name_records.
-- =============================================================================
CREATE OR REPLACE FUNCTION enforce_alliance_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_id IS NULL THEN
    RAISE EXCEPTION
      'afrik_patronyme_alliances row rejected: source_id is required (source or drop, ETNI-1455 AC2).'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enforce_alliance_source() IS
  'BEFORE INSERT OR UPDATE trigger function: rejects afrik_patronyme_alliances '
  'rows with a null source_id (source or drop, ETNI-1455 AC2).';

DROP TRIGGER IF EXISTS afrik_patronyme_alliances_source_or_drop ON afrik_patronyme_alliances;
CREATE TRIGGER afrik_patronyme_alliances_source_or_drop
  BEFORE INSERT OR UPDATE ON afrik_patronyme_alliances
  FOR EACH ROW EXECUTE FUNCTION enforce_alliance_source();

COMMENT ON TRIGGER afrik_patronyme_alliances_source_or_drop ON afrik_patronyme_alliances IS
  'Enforces "source or drop": rejects alliance edges without a source. ETNI-1455 AC2.';

-- Verification (run manually against a local Supabase instance):
--   INSERT INTO afrik_patronyme_alliances (id, alliance_type, name_id_a,
--     name_id_b, source_id, tier)
--     VALUES ('ALL_TEST_AB', 'joking_kinship', 'PAT_A', 'PAT_B', <uuid>, 'referenced');
--   -- expected: succeeds
--   INSERT INTO afrik_patronyme_alliances (id, alliance_type, name_id_a,
--     name_id_b, source_id, tier)
--     VALUES ('ALL_TEST_BA', 'joking_kinship', 'PAT_B', 'PAT_A', <uuid>, 'referenced');
--   -- expected: ERROR: new row for relation "afrik_patronyme_alliances"
--   -- violates check constraint (name_id_a < name_id_b) — AC1
--   INSERT INTO afrik_patronyme_alliances (id, alliance_type, name_id_a,
--     name_id_b, source_id, tier)
--     VALUES ('ALL_TEST_NOSRC', 'joking_kinship', 'PAT_C', 'PAT_D', NULL, 'referenced');
--   -- expected: ERROR: afrik_patronyme_alliances row rejected: source_id is
--   -- required (source or drop, ETNI-1455 AC2) — AC2
