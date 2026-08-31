-- Migration 052 — the name entity: afrik_patronymes and its nameSystem discriminant
--
-- Story: ETNI-1454 (Epic ETNI-1453, DEC-038, DEC-039, ARCH-019).
-- ETNI-1452's LOT 1 originally allocated migration 051 to this ticket. By
-- the time this branch was cut, 050 and 051 were already claimed on recette
-- by two unrelated, already-merged tickets outside that plan's LOT 1 —
-- ETNI-1419 (050_search_query_log.sql) and ETNI-70
-- (051_revision_publication.sql) — so the plan's number allocation for this
-- position is stale. This migration claims 052, the next number actually
-- free on recette, rather than colliding with either.
--
-- DEC-038 makes the name a first-class dimension of the corpus, alongside
-- people and country. DEC-038 also names it deliberately: internally the
-- entity is the *patronyme*, to stay distinct from two other things already
-- called "nom" in this repository — the ethnonym dossier (name_records,
-- 029_names_atlas.sql, unchanged by this migration) and the future person
-- entity of ARCH-018.
--
-- DEC-039 gives the entity a `nameSystem` discriminant with five initial
-- subtypes and states that the caste/social-function axis must never share
-- a column with a person's future biographical role category. Both of those
-- are enforced here as real, typed columns (AC1, AC2). Every other DEC-039
-- field — transmission mode, social unit, sourced origin, and the
-- subtype-specific fields (totem prohibition, permitted given names,
-- patronymic chain depth, nisba subtype) — follows the existing AFRIK
-- convention (afrik_peoples, afrik_countries, 006_afrik_schema.sql) and
-- lives in `content JSONB`. Per-subtype strict-model validation of that
-- JSON shape is ETNI-1460's separate ticket, not this migration's.
--
-- Deferred: a join table to persons. ARCH-018's persons table is migration
-- 055 (LOT 3 of ETNI-1452), four lots after this one — an FK to it cannot
-- exist here. No acceptance criterion of ETNI-1454 tests a name-to-person
-- join, and no ticket in the implementation plan allocates a migration for
-- it either, so afrik_patronyme_persons is left to whichever ticket lands
-- once the persons table exists, rather than inventing an FK-less table now.
--
-- Idempotent throughout (IF NOT EXISTS / DO-EXCEPTION / DROP-then-CREATE),
-- same discipline as 029_names_atlas.sql and 030_people_relations.sql.
-- Human-applied via `supabase db push` (AR45 runbook); this migration is
-- code-complete without production application, and this automation never
-- applies it to any database.
-- =============================================================================

-- =============================================================================
-- 1. Enum: name_system_type (DEC-039's five initial subtypes)
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE name_system_type AS ENUM (
    'clan_name',
    'non_hereditary_patronymic',
    'nisba',
    'praise_name',
    'totemic_clan'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TYPE name_system_type IS
  'The nameSystem discriminant (DEC-039): clan_name (Manding jamu, Xhosa '
  'isiduko, western Fulɓe clans), non_hereditary_patronymic (Ethiopian and '
  'Eritrean, eastern Fulɓe), nisba (Arabo-Berber tribal sense), praise_name '
  '(Yoruba oríkì, Nguni izibongo), totemic_clan (Baganda ekika closed list). '
  'ETNI-1454.';

-- =============================================================================
-- 2. Table: afrik_patronymes
-- -----------------------------------------------------------------------------
-- Follows the afrik_peoples / afrik_countries convention (006_afrik_schema.sql):
-- a stable typed id, the columns an acceptance criterion or an index needs
-- as real columns, and a content JSONB column for everything else. Only
-- name_system (AC1) and caste_or_social_function (AC2) are pulled out of
-- content here — both are directly gated by this ticket's acceptance
-- criteria; every other DEC-039 field stays in content until ETNI-1460
-- defines its per-subtype strict shape.
-- =============================================================================
CREATE TABLE IF NOT EXISTS afrik_patronymes (
  id TEXT PRIMARY KEY CHECK (id ~ '^PAT_[A-Z0-9_]+$'),
  name_system name_system_type NOT NULL,
  caste_or_social_function TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE afrik_patronymes IS
  'The name entity (DEC-038''s fifth corpus dimension; internally the '
  'patronyme). Distinct from name_records (the ethnonym dossier) and from '
  'the future ARCH-018 person entity. ETNI-1454.';
COMMENT ON COLUMN afrik_patronymes.id IS 'Stable PAT_xxxxx identifier, matching the FLG_/PPL_ convention.';
COMMENT ON COLUMN afrik_patronymes.name_system IS
  'The nameSystem discriminant (DEC-039). Gates every other field: never a decorative label. NOT NULL — AC1.';
COMMENT ON COLUMN afrik_patronymes.caste_or_social_function IS
  'Caste or social function (e.g. numu, jeli, horon, rimɓe, nyeeybe). A '
  'different axis from a person''s future biographical role category '
  '(ARCH-018) and must never share a column with it — AC2, DEC-039.';
COMMENT ON COLUMN afrik_patronymes.content IS
  'Remaining DEC-039 fields — transmission mode, social unit, sourced '
  'origin, and the subtype-specific fields gated by name_system (totem '
  'food prohibition, permitted given names, patronymic chain depth, nisba '
  'subtype). Strict per-subtype shape is ETNI-1460''s job, not this migration''s.';

CREATE INDEX IF NOT EXISTS idx_afrik_patronymes_name_system ON afrik_patronymes(name_system);
CREATE INDEX IF NOT EXISTS idx_afrik_patronymes_content_gin ON afrik_patronymes USING gin(content);

-- =============================================================================
-- 3. Joins: afrik_patronyme_peoples, afrik_patronyme_countries
-- -----------------------------------------------------------------------------
-- n-to-n, following the afrik_people_countries pattern exactly (006 / 019):
-- composite primary key, no unique constraint on patronyme_id alone, so a
-- name associated with several peoples is never forced to one — AC3.
-- =============================================================================
CREATE TABLE IF NOT EXISTS afrik_patronyme_peoples (
  patronyme_id TEXT NOT NULL REFERENCES afrik_patronymes(id) ON DELETE CASCADE,
  people_id VARCHAR(50) NOT NULL REFERENCES afrik_peoples(id) ON DELETE CASCADE,
  PRIMARY KEY (patronyme_id, people_id)
);

COMMENT ON TABLE afrik_patronyme_peoples IS 'Many-to-many relation between names and peoples. ETNI-1454.';

CREATE TABLE IF NOT EXISTS afrik_patronyme_countries (
  patronyme_id TEXT NOT NULL REFERENCES afrik_patronymes(id) ON DELETE CASCADE,
  country_id CHAR(3) NOT NULL REFERENCES afrik_countries(id) ON DELETE CASCADE,
  PRIMARY KEY (patronyme_id, country_id)
);

COMMENT ON TABLE afrik_patronyme_countries IS 'Many-to-many relation between names and countries. ETNI-1454.';

-- Note: a join to persons (afrik_patronyme_persons) is deferred. The
-- persons table (ARCH-018) is migration 055, four lots after this one in
-- the ETNI-1452 implementation plan, so the FK cannot exist yet. No
-- acceptance criterion of ETNI-1454 requires it at this migration.

CREATE INDEX IF NOT EXISTS idx_afrik_patronyme_peoples_patronyme_id ON afrik_patronyme_peoples(patronyme_id);
CREATE INDEX IF NOT EXISTS idx_afrik_patronyme_peoples_people_id ON afrik_patronyme_peoples(people_id);
CREATE INDEX IF NOT EXISTS idx_afrik_patronyme_countries_patronyme_id ON afrik_patronyme_countries(patronyme_id);
CREATE INDEX IF NOT EXISTS idx_afrik_patronyme_countries_country_id ON afrik_patronyme_countries(country_id);

-- =============================================================================
-- 4. RLS — public read, service-role-only writes (pattern from 019_afrik_rls.sql)
-- =============================================================================
ALTER TABLE afrik_patronymes ENABLE ROW LEVEL SECURITY;
ALTER TABLE afrik_patronyme_peoples ENABLE ROW LEVEL SECURITY;
ALTER TABLE afrik_patronyme_countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS afrik_patronymes_read_public ON afrik_patronymes;
CREATE POLICY afrik_patronymes_read_public ON afrik_patronymes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS afrik_patronyme_peoples_read_public ON afrik_patronyme_peoples;
CREATE POLICY afrik_patronyme_peoples_read_public ON afrik_patronyme_peoples
  FOR SELECT USING (true);

DROP POLICY IF EXISTS afrik_patronyme_countries_read_public ON afrik_patronyme_countries;
CREATE POLICY afrik_patronyme_countries_read_public ON afrik_patronyme_countries
  FOR SELECT USING (true);

-- Deliberately no INSERT/UPDATE/DELETE policy for anon or authenticated —
-- writes flow only through the service-role loader, which bypasses RLS via
-- SUPABASE_SERVICE_ROLE_KEY (same posture as afrik_people_countries and
-- afrik_people_relations).
