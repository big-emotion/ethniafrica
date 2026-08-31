-- Migration 030 — Epic 11 relations model: afrik_people_relations (idempotent)
--
-- Story: ETNI-503 [11.2] Migration `030_people_relations.sql` + fabric extension
-- Epic:  11 (Hidden Links Between Peoples), FR72, FR74, AR2, AR6
--
-- Creates the relation_type / relation_direction enums and the
-- afrik_people_relations table per the Epic 11 spec Data Model sketch
-- (_bmad-output/planning-artifacts/module-specs/epic-11-hidden-links-graph.md,
-- "New Supabase table — migration sketch"), then locks it down with the same
-- public-read / service-role-only-write RLS posture as every other AFRIK
-- table (modeled on migration 019_afrik_rls.sql).
--
-- Fully idempotent — safe to re-run against an environment where it has
-- already been applied. Applied by a human via `supabase db push`, never
-- automatically (AR45 runbook).
-- =============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Enums
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE relation_type AS ENUM ('migratory', 'commercial', 'religious');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE relation_direction AS ENUM ('a_to_b', 'b_to_a', 'bidirectional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Table
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS afrik_people_relations (
  id                 TEXT PRIMARY KEY CHECK (id ~ '^REL_[A-Z0-9_]+$'),
  relation_type      relation_type NOT NULL,
  people_id_a        TEXT NOT NULL REFERENCES afrik_peoples(id),
  people_id_b        TEXT NOT NULL REFERENCES afrik_peoples(id),
  direction          relation_direction NOT NULL DEFAULT 'bidirectional',
  period_start_year  INTEGER,
  period_end_year    INTEGER,
  period_label       TEXT,
  description        TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (people_id_a <> people_id_b),
  CHECK (period_start_year IS NULL OR period_end_year IS NULL
         OR period_start_year <= period_end_year)
);

COMMENT ON TABLE afrik_people_relations IS
  'Sourced relation records (migratory, commercial, religious) linking two '
  'peoples. Linguistic proximity is derived at read time from the AFRIK '
  'hierarchy (shared languageFamilyId) and is never stored here (FR73). '
  'ETNI-503, Epic 11.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Indexes
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_people_relations_a    ON afrik_people_relations(people_id_a);
CREATE INDEX IF NOT EXISTS idx_people_relations_b    ON afrik_people_relations(people_id_b);
CREATE INDEX IF NOT EXISTS idx_people_relations_type ON afrik_people_relations(relation_type);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RLS — public read, service-role-only writes (modeled on 019_afrik_rls.sql)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE afrik_people_relations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY people_relations_public_read
    ON afrik_people_relations FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Deliberately no INSERT/UPDATE/DELETE policy for anon or authenticated —
-- writes flow only through the service-role loader (Story 11.4), which
-- bypasses RLS via SUPABASE_SERVICE_ROLE_KEY.

-- Verification (run manually against a local Supabase instance):
--   As anon key:
--     SELECT count(*) FROM afrik_people_relations;         -- expected: succeeds
--     INSERT INTO afrik_people_relations (id, relation_type, people_id_a,
--       people_id_b, description) VALUES ('REL_X', 'commercial', 'PPL_A',
--       'PPL_B', 'x');
--     -- expected: ERROR: new row violates row-level security policy

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Fabric audit (ETNI-503 sub-task: hard-coded entity-type lists)
-- ────────────────────────────────────────────────────────────────────────────
-- Audited supabase/migrations/009_module_zero_fabric.sql,
-- 011_assertions_triggers.sql, 015_module_zero_fabric_align.sql,
-- 016_module_zero_triggers.sql, 020_per_assertion_fiche_revisions.sql,
-- 021_revisions_ddl.sql, 024_pg_notify_cache_invalidation.sql for any
-- WHERE entity_type IN (...) / CASE / CHECK that enumerates a fixed
-- entity-type set on the assertions -> confidence_scores path.
--
-- Finding: CONFIRMED NO-OP. `assertions`, `confidence_scores`, `flags` and
-- `revisions` all carry entity_type as plain TEXT with no CHECK/enum
-- constraint. The recompute_confidence(p_entity_type TEXT, p_entity_id TEXT)
-- function (016_module_zero_triggers.sql) is fully polymorphic: it reads
-- assertions/flags/confidence_scores by (entity_type, entity_id) with no
-- branch on the value of entity_type. An assertion inserted with
-- entity_type = 'relation' recomputes its confidence_scores row exactly as
-- for 'people' the moment recompute_confidence('relation', <REL id>) is
-- called (the Story 11.4 loader calls this explicitly per relation, the
-- same way it does for every other entity — no automatic per-INSERT trigger
-- exists on the assertions table for any entity type).
--
-- The one enumerated list found is recompute_confidence_all() (nightly
-- pg_cron batch), which iterates only 'people' and 'language_family'.
-- Extending the nightly batch to relations is out of scope for this story:
-- the spec (Data Model & Sourcing) has the loader seed confidence_scores
-- directly at write time, so relations do not depend on the nightly batch
-- for correctness. No code change made here; documented for the record.
