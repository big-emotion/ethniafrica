-- Migration 054 — afrik_people_languages: relate a people to its languages
-- through a table, not a JSON field.
--
-- Story: ETNI-1501 (REQ-136, ARCH-020).
--
-- A people currently declares its languages inside content.languages.isoCodes,
-- a JSONB array on afrik_peoples. That field cannot be indexed as a relation,
-- cannot be traversed from the language side, and cannot carry a per-relation
-- source. This migration adds the join table the queries read; the JSONB
-- field stays the editorial source of truth on the fiche. Populating the
-- table from the JSONB field is explicitly out of scope (ticket 2) — this
-- migration only creates the structure.
--
-- Modelled exactly on afrik_people_countries (006_afrik_schema.sql,
-- 019_afrik_rls.sql): a composite primary key on (people_id, language_id)
-- both enforces "a relation can be inserted only once" (AC2) and doubles as
-- the people-side index, an explicit index on language_id alone answers
-- "who speaks this language" without ever reading content (AC1), and both
-- foreign keys cascade so a deleted people or language cannot leave an
-- orphaned relation row behind.

CREATE TABLE IF NOT EXISTS afrik_people_languages (
  people_id VARCHAR(50) NOT NULL REFERENCES afrik_peoples(id) ON DELETE CASCADE,
  language_id VARCHAR(10) NOT NULL REFERENCES afrik_languages(id) ON DELETE CASCADE,
  PRIMARY KEY (people_id, language_id)
);

COMMENT ON TABLE afrik_people_languages IS
  'Many-to-many relation between peoples and languages. The editorial source '
  'of truth stays content.languages.isoCodes on afrik_peoples; this table is '
  'what relational queries (e.g. "who speaks this language") read. ETNI-1501.';

CREATE INDEX IF NOT EXISTS idx_afrik_people_languages_people_id ON afrik_people_languages(people_id);
CREATE INDEX IF NOT EXISTS idx_afrik_people_languages_language_id ON afrik_people_languages(language_id);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS — public read, service-role-only writes (pattern from 019_afrik_rls.sql)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE afrik_people_languages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS afrik_people_languages_read_public ON afrik_people_languages;
CREATE POLICY afrik_people_languages_read_public ON afrik_people_languages
  FOR SELECT USING (true);

-- Deliberately no INSERT/UPDATE/DELETE policy for anon or authenticated —
-- writes flow only through the service-role loader, which bypasses RLS via
-- SUPABASE_SERVICE_ROLE_KEY (same posture as afrik_people_countries).
