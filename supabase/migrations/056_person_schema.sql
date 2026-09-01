-- Migration 056 — the person entity: role category, joins, source-or-nothing (ARCH-018)
--
-- Story: ETNI-1382 (ARCH-018), refined into ETNI-1585 (this migration),
-- ETNI-1586 (loader), ETNI-1587 (service), ETNI-1588 (contract tests).
--
-- Introduces `persons` — an individual (ethnographer, author, informant,
-- translator, historian, etc.) — deliberately distinct from `afrik_peoples`,
-- which is the AFRIK ethnic-group entity. Naming follows 053's guidance:
-- do not reuse `people`/`afrik_peoples`, they mean ethnic groups here.
--
-- Three acceptance criteria, enforced at the DB layer:
--   AC1  role_category NOT NULL — a person without a role category is
--        refused outright by the column constraint.
--   AC2  source-or-nothing trigger — a person with no attached source is
--        refused. Unlike name_records' "source or drop" trigger (029,
--        retiered by 041), this does NOT filter by tier: the Source Tier
--        Policy is "nothing is forbidden, everything is labelled", so any
--        of official/referenced/unverified qualifies. Only the *presence*
--        of a source is enforced here; a source with no tier at all is a
--        fiche-validation concern (validateAfrikData.ts), not a DB trigger.
--   AC3  person_peoples.relation_label distinguishes MEMBERSHIP from
--        OBSERVATION, so an ethnographer's link to a people is recorded as
--        "studied the people", never as belonging to it.
--
-- The source link is indirect, through the existing Module 0 fabric
-- (assertions -> sources, 009/016/041), the same shape name_records uses
-- (029_names_atlas.sql): persons.assertion_id references a pre-existing
-- assertions row, so the trigger has something to check without a
-- chicken-and-egg dependency on a not-yet-inserted persons row.
--
-- content JSONB carries every biographical field this migration does not
-- pull out as a real column, following the afrik_patronymes convention
-- (053_name_table.sql, itself following 006_afrik_schema.sql).
--
-- Idempotent throughout (IF NOT EXISTS / DROP-then-CREATE), same discipline
-- as 029/041/053. Human-applied via `supabase db push` (AR45 runbook); this
-- migration is code-complete without production application, and this
-- automation never applies it to any database. Two-step rollout: recette
-- first, production second — both Supabase projects are labelled
-- "production", and applying one without the other has bitten before.
-- =============================================================================

-- =============================================================================
-- 1. Table: persons
-- =============================================================================
CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY CHECK (id ~ '^PER_[A-Z0-9_]+$'),
  full_name TEXT NOT NULL,
  role_category TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  assertion_id UUID REFERENCES assertions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE persons IS
  'The individual-person entity (ARCH-018): an ethnographer, author, '
  'informant, translator, historian, etc. Distinct from afrik_peoples, the '
  'AFRIK ethnic-group entity. ETNI-1382/ETNI-1585.';
COMMENT ON COLUMN persons.id IS 'Stable PER_xxxxx identifier, matching the FLG_/PPL_/PAT_ convention.';
COMMENT ON COLUMN persons.role_category IS
  'The person''s biographical role (e.g. ethnographer, author, informant). '
  'NOT NULL — a person cannot exist without a known role (AC1).';
COMMENT ON COLUMN persons.content IS
  'Remaining biographical fields not pulled out as real columns, following '
  'the afrik_patronymes/afrik_peoples content-JSONB convention.';
COMMENT ON COLUMN persons.assertion_id IS
  'Module 0 fabric assertion this person rests on (009/016/041). Checked by '
  'the persons_source_or_nothing trigger (AC2) — never null in a row that '
  'has passed the trigger.';

-- =============================================================================
-- 2. Generated search_vector column + GIN index
-- -----------------------------------------------------------------------------
-- A = full_name (the person's own name outranks a role-category mention),
-- B = role_category. Follows the weighted-tsvector pattern of 043/055.
-- =============================================================================
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('french', COALESCE(full_name, '')), 'A')
    || setweight(to_tsvector('french', COALESCE(role_category, '')), 'B')
  ) STORED;

COMMENT ON COLUMN persons.search_vector IS
  'Weighted French tsvector: A = full_name, B = role_category. ETNI-1382.';

CREATE INDEX IF NOT EXISTS idx_persons_search_vector ON persons USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_persons_role_category ON persons(role_category);

-- =============================================================================
-- 3. Join: person_peoples — membership vs observation (AC3)
-- -----------------------------------------------------------------------------
-- Composite primary key on (person_id, people_id): one relation label per
-- pair, following the afrik_patronyme_peoples convention (053) rather than
-- allowing a pair to carry both labels at once.
-- =============================================================================
CREATE TABLE IF NOT EXISTS person_peoples (
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  people_id VARCHAR(50) NOT NULL REFERENCES afrik_peoples(id) ON DELETE CASCADE,
  relation_label TEXT NOT NULL CHECK (relation_label IN ('membership', 'observation')),
  PRIMARY KEY (person_id, people_id)
);

COMMENT ON TABLE person_peoples IS
  'Many-to-many relation between persons and peoples, labelled membership '
  '(the person belongs to the people) or observation (the person studied '
  'the people — e.g. an ethnographer). An ethnographer is always observation, '
  'never membership (AC3). ETNI-1382.';
COMMENT ON COLUMN person_peoples.relation_label IS
  'membership | observation. Never inferred — always the value the fiche declares.';

CREATE INDEX IF NOT EXISTS idx_person_peoples_person_id ON person_peoples(person_id);
CREATE INDEX IF NOT EXISTS idx_person_peoples_people_id ON person_peoples(people_id);

-- =============================================================================
-- 4. Join: person_countries
-- =============================================================================
CREATE TABLE IF NOT EXISTS person_countries (
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  country_id CHAR(3) NOT NULL REFERENCES afrik_countries(id) ON DELETE CASCADE,
  PRIMARY KEY (person_id, country_id)
);

COMMENT ON TABLE person_countries IS 'Many-to-many relation between persons and countries. ETNI-1382.';

CREATE INDEX IF NOT EXISTS idx_person_countries_person_id ON person_countries(person_id);
CREATE INDEX IF NOT EXISTS idx_person_countries_country_id ON person_countries(country_id);

-- =============================================================================
-- 5. Trigger: source-or-nothing (AC2)
-- -----------------------------------------------------------------------------
-- Mirrors enforce_name_record_sources() (029, retiered by 041) but WITHOUT
-- its tier filter: name_records requires tier IN ('official','referenced'),
-- persons only requires a source to be attached, of any tier — "nothing is
-- forbidden, everything is labelled" (Source Tier Policy).
-- =============================================================================
CREATE OR REPLACE FUNCTION enforce_person_sources()
RETURNS TRIGGER AS $$
DECLARE
  v_source_count INTEGER;
BEGIN
  IF NEW.assertion_id IS NULL THEN
    RAISE EXCEPTION
      'persons row rejected: assertion_id is required (source or nothing, ARCH-018).'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(DISTINCT s.id)
  INTO v_source_count
  FROM assertions a
  LEFT JOIN LATERAL UNNEST(COALESCE(a.source_ids, '{}'::UUID[])) AS src_id ON true
  LEFT JOIN sources s ON s.id = src_id
  WHERE a.id = NEW.assertion_id;

  IF COALESCE(v_source_count, 0) = 0 THEN
    RAISE EXCEPTION
      'persons row rejected: assertion % cites no source (source or nothing, ARCH-018).',
      NEW.assertion_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enforce_person_sources() IS
  'BEFORE INSERT OR UPDATE trigger function: rejects persons rows with a '
  'null assertion_id or whose assertion cites zero sources. No tier filter — '
  'any tier qualifies (Source Tier Policy). ETNI-1382 (AC2).';

DROP TRIGGER IF EXISTS persons_source_or_nothing ON persons;
CREATE TRIGGER persons_source_or_nothing
  BEFORE INSERT OR UPDATE ON persons
  FOR EACH ROW
  EXECUTE FUNCTION enforce_person_sources();

COMMENT ON TRIGGER persons_source_or_nothing ON persons IS
  'Enforces "source or nothing": rejects rows without a sourced assertion. ETNI-1382.';

-- =============================================================================
-- 6. RLS — public read, service-role-only writes
-- -----------------------------------------------------------------------------
-- Same posture as afrik_patronymes (053) and afrik_people_countries: no
-- INSERT/UPDATE/DELETE policy for anon or authenticated, writes flow only
-- through the service-role loader (SUPABASE_SERVICE_ROLE_KEY bypasses RLS).
-- =============================================================================
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_peoples ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS persons_read_public ON persons;
CREATE POLICY persons_read_public ON persons
  FOR SELECT USING (true);

DROP POLICY IF EXISTS person_peoples_read_public ON person_peoples;
CREATE POLICY person_peoples_read_public ON person_peoples
  FOR SELECT USING (true);

DROP POLICY IF EXISTS person_countries_read_public ON person_countries;
CREATE POLICY person_countries_read_public ON person_countries
  FOR SELECT USING (true);
