-- Migration 035 — Epic 12 spatio-temporal event model: migration_events (idempotent)
--
-- Story: ETNI-516 [12.3] `migration_events` schema — Supabase migrations
-- Epic:  12 (African Migrations Timeline), FR80, AR2/AR6/AR45
--
-- Creates the migration_event_type enum, migration_events, and
-- migration_event_peoples tables per the Epic 12 spec Data Model sketch
-- (_bmad-output/planning-artifacts/module-specs/epic-12-migrations-timeline.md,
-- "New Supabase tables + migration sketch"), then locks both tables down
-- with public-read / moderator-admin-write RLS (AR6), modeled on
-- 029_names_atlas.sql.
--
-- The Module 0 fabric (assertions, confidence_scores, flags, revisions —
-- 009_module_zero_fabric.sql) stores entity_type as plain TEXT, so
-- entity_type = 'migration' needs zero DDL here; fabric acceptance is a
-- code-level Zod-union extension (src/api/v2/schemas/confidence.ts,
-- src/api/v2/services/confidence.ts, ETNI-516) — see the "Fabric audit"
-- note at the bottom of this file.
--
-- Fully idempotent — safe to re-run against an environment where it has
-- already been applied. Applied by a human via `supabase db push`, never
-- automatically (AR45 runbook).
-- =============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Enum: migration_event_type (MVP launch set — open enum, Extension
--    contract: Epic 13 adds values via `ALTER TYPE ... ADD VALUE` in its own
--    migration file, since ADD VALUE cannot run in the same transaction as
--    statements referencing the new value; do not model event families as
--    separate tables)
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE migration_event_type AS ENUM
    ('expansion', 'trade_route', 'forced_displacement', 'pastoral_movement');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Table: migration_events
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS migration_events (
  id                    text PRIMARY KEY CHECK (id ~ '^MGR_[A-Z0-9_]+$'),
  slug                  text UNIQUE NOT NULL,
  name                  text NOT NULL,
  migration_group       text,
  event_type            migration_event_type NOT NULL,
  classification_status classification_status NOT NULL,
  time_start_year       int NOT NULL,
  time_end_year         int NOT NULL CHECK (time_end_year >= time_start_year),
  dating_note           text,
  geometry_geojson      jsonb NOT NULL,
  summary               text NOT NULL,
  narrative             text NOT NULL,
  debate                text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE migration_events IS
  'Spatio-temporal migration events (Bantu expansion phases, trade routes, '
  '...) per the Epic 12 Data Model sketch. classification_status reuses the '
  'AR32 enum from 010_classification_status.sql. ETNI-516, Epic 12.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Table: migration_event_peoples
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS migration_event_peoples (
  migration_id text NOT NULL REFERENCES migration_events(id) ON DELETE CASCADE,
  people_id    text NOT NULL REFERENCES afrik_peoples(id),
  role         text,
  PRIMARY KEY (migration_id, people_id)
);

COMMENT ON TABLE migration_event_peoples IS
  'Peoples involved in a migration event (role: origin | in-movement | '
  'destination-formed, free text at MVP). Composite PK, FKs afrik_peoples(id) '
  '(canonical English table name per migration 006). ETNI-516, Epic 12.';

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Indexes
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_migration_events_time
  ON migration_events (time_start_year, time_end_year);
CREATE INDEX IF NOT EXISTS idx_migration_event_peoples_people
  ON migration_event_peoples (people_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. RLS — public read, moderator/admin write (AR6)
-- Read pattern from 019_afrik_rls.sql; write-gate pattern from
-- 029_names_atlas.sql (EXISTS against user_roles).
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE migration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_event_peoples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS migration_events_read_public ON migration_events;
CREATE POLICY migration_events_read_public ON migration_events
  FOR SELECT USING (true);

COMMENT ON POLICY migration_events_read_public ON migration_events IS
  'Anonymous and authenticated callers may SELECT all migration events. ETNI-516.';

DROP POLICY IF EXISTS migration_events_write_moderator ON migration_events;
CREATE POLICY migration_events_write_moderator ON migration_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('moderator', 'admin')
    )
  );

COMMENT ON POLICY migration_events_write_moderator ON migration_events IS
  'Only moderator and admin roles may INSERT/UPDATE/DELETE migration_events. ETNI-516 (AR6).';

DROP POLICY IF EXISTS migration_event_peoples_read_public ON migration_event_peoples;
CREATE POLICY migration_event_peoples_read_public ON migration_event_peoples
  FOR SELECT USING (true);

COMMENT ON POLICY migration_event_peoples_read_public ON migration_event_peoples IS
  'Anonymous and authenticated callers may SELECT all migration_event_peoples rows. ETNI-516.';

DROP POLICY IF EXISTS migration_event_peoples_write_moderator ON migration_event_peoples;
CREATE POLICY migration_event_peoples_write_moderator ON migration_event_peoples
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('moderator', 'admin')
    )
  );

COMMENT ON POLICY migration_event_peoples_write_moderator ON migration_event_peoples IS
  'Only moderator and admin roles may INSERT/UPDATE/DELETE migration_event_peoples. ETNI-516 (AR6).';

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Fabric audit (ETNI-516 sub-task: hard-coded entity-type lists)
-- ────────────────────────────────────────────────────────────────────────────
-- Audited supabase/migrations/009_module_zero_fabric.sql,
-- 011_assertions_triggers.sql, 015_module_zero_fabric_align.sql,
-- 016_module_zero_triggers.sql, 020_per_assertion_fiche_revisions.sql,
-- 021_revisions_ddl.sql, 024_pg_notify_cache_invalidation.sql for any
-- WHERE entity_type IN (...) / CASE / CHECK that enumerates a fixed
-- entity-type set on the assertions -> confidence_scores path.
--
-- Finding: CONFIRMED NO-OP, same conclusion as 030_people_relations.sql's
-- audit for entity_type = 'relation'. `assertions`, `confidence_scores`,
-- `flags` and `revisions` all carry entity_type as plain TEXT with no
-- CHECK/enum constraint. The recompute_confidence(p_entity_type TEXT,
-- p_entity_id TEXT) function (016_module_zero_triggers.sql) is fully
-- polymorphic: it reads assertions/flags/confidence_scores by
-- (entity_type, entity_id) with no branch on the value of entity_type. An
-- assertion inserted with entity_type = 'migration' recomputes its
-- confidence_scores row exactly as for 'people' the moment
-- recompute_confidence('migration', <MGR id>) is called (the Story 12.4
-- loader calls this explicitly per event, the same way every other entity
-- loader does — no automatic per-INSERT trigger exists on the assertions
-- table for any entity type).
--
-- The one enumerated list found is recompute_confidence_all() (nightly
-- pg_cron batch), which iterates only 'people' and 'language_family' — it
-- was already out of scope for 'relation' (ETNI-503) for the same reason:
-- the spec has the loader seed confidence_scores directly at write time, so
-- migration events do not depend on the nightly batch for correctness. No
-- code change made here; documented for the record.
--
-- Code-level union extension (this story): confidenceEntityTypeSchema in
-- src/api/v2/schemas/confidence.ts gains 'migration' (prefix MGR_), and
-- internalEntityTypes in src/api/v2/services/confidence.ts maps it to the
-- internal 'migration' entity_type — covered by
-- src/api/v2/__tests__/migrations.test.ts (test-first, mirrors
-- src/api/v2/__tests__/relations.test.ts from Epic 11 Story 11.2).
