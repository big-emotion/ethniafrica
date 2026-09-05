-- Migration 082 — the dossier entity: afrik_dossiers
--
-- 081_contributions_into_flags.sql is the highest number applied on recette
-- at the time this branch was cut, so this migration claims 082, the next
-- number actually free, following the convention 053's header sets out.
--
-- WHY A TABLE AND NOT A CONSTANT
--
-- The four dossiers that exist today are TypeScript constants — the Nommer
-- pillar and its five chapters, the anecdote bank, the migration frieze, the
-- colonisation page. That was the right call for each of them on its own and
-- the wrong one four times over: nothing outside the Next build can read a
-- dossier, /api/v2 cannot serve one, and the corpus the site publishes under
-- CC BY-SA stops at the fiches. A dossier is editorial long-form, but it is
-- also sourced claims about the same peoples and countries the atlas already
-- serves, and a reuser who can cite a fiche cannot cite the argument built on
-- it.
--
-- So the dossier follows the AFRIK pipeline rather than inventing a fifth
-- shape: JSON fiches in dataset/source/afrik/dossiers/ are the editorial
-- source of truth in git, this table is the serving layer, and
-- scripts/migrateAfrikToDatabase.ts is the one road between them. Same
-- doctrine as afrik_peoples and afrik_patronymes.
--
-- WHAT IS A COLUMN AND WHAT IS CONTENT
--
-- The AFRIK convention (006_afrik_schema.sql, 053) is that only the
-- discriminants get real columns; the rest lives in `content JSONB` and is
-- shape-checked by the strict model and the parser, not by the DB. Three
-- discriminants here: the editorial vertical the dossier belongs to, its
-- URL slug, and its publication date. Everything a page renders — thesis,
-- chapters, readings, illustrations, sources, gaps — is content.
--
-- Vertical is a real, typed column because it is what the Dossiers menu
-- groups by, and a menu that groups on a JSONB path is a menu that breaks
-- silently when a fiche misspells it.
--
-- Idempotent throughout (IF NOT EXISTS / DO-EXCEPTION / DROP-then-CREATE),
-- the same discipline as 053 and 081.

-- =============================================================================
-- 1. The vertical discriminant
-- -----------------------------------------------------------------------------
-- An enum rather than a free TEXT column: the two values are the editorial
-- verticals the axis is divided into, and a third one is a decision somebody
-- takes, not a string somebody types into a fiche.
-- =============================================================================
DO $$
BEGIN
  CREATE TYPE dossier_vertical_type AS ENUM ('realites', 'nommer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- =============================================================================
-- 2. afrik_dossiers
-- =============================================================================
CREATE TABLE IF NOT EXISTS afrik_dossiers (
  id TEXT PRIMARY KEY CHECK (id ~ '^DOS_[A-Z0-9_]+$'),
  vertical dossier_vertical_type NOT NULL,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  published_on DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE afrik_dossiers IS
  'Long-form sourced dossiers. The one AFRIK entity that argues rather than '
  'describes: each chapter carries an authoritative reading and a '
  'counter-reading of the same fact, both cited. Source of truth is '
  'dataset/source/afrik/dossiers/; this table is the serving layer.';
COMMENT ON COLUMN afrik_dossiers.id IS 'Stable DOS_xxxxx identifier, matching the FLG_/PPL_/PAT_ convention.';
COMMENT ON COLUMN afrik_dossiers.vertical IS
  'The editorial vertical the Dossiers menu groups by. A real column, not a '
  'content path, because a menu that groups on JSONB breaks silently on a typo.';
COMMENT ON COLUMN afrik_dossiers.slug IS 'The URL segment under /fr/dossiers/. Unique across verticals.';
COMMENT ON COLUMN afrik_dossiers.content IS
  'Thesis, chapters, readings, illustrations, sources and declared gaps. '
  'Shape is fixed by public/modele-dossier.json and enforced by '
  'src/lib/afrik/parsers/dossierParser.ts, which refuses a chapter carrying '
  'only one of the two readings.';

CREATE INDEX IF NOT EXISTS idx_afrik_dossiers_vertical ON afrik_dossiers(vertical);
CREATE INDEX IF NOT EXISTS idx_afrik_dossiers_published_on ON afrik_dossiers(published_on DESC);
CREATE INDEX IF NOT EXISTS idx_afrik_dossiers_content_gin ON afrik_dossiers USING gin(content);

-- =============================================================================
-- 3. RLS — public read, service-role-only writes (pattern from 019 / 053)
-- =============================================================================
ALTER TABLE afrik_dossiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS afrik_dossiers_read_public ON afrik_dossiers;
CREATE POLICY afrik_dossiers_read_public ON afrik_dossiers
  FOR SELECT USING (true);

-- Deliberately no INSERT/UPDATE/DELETE policy for anon or authenticated.
-- Writes flow only through the service-role loader, which bypasses RLS via
-- SUPABASE_SERVICE_ROLE_KEY — same posture as every other afrik_* table.
