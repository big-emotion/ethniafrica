-- Migration 073 — afrik_media: the media data model (REQ-128, DEC-032)
--
-- Context: no fiche carries an image today. Attaching one is inherently a
-- manual, subject-by-subject editorial judgment, not a bulk data operation —
-- a sample of automated category-to-fiche matches found roughly 7% pointed at
-- the wrong subject (a "Babur" category naming the Mughal emperor, not the
-- people; a "Kara" category naming the Togolese town, not the people). This
-- migration only prepares the field a media entry is recorded into; matching
-- an image to a fiche stays out of scope (ETNI-1412).
--
-- Founding gate (the ticket's only Given/When/Then): a media entry with no
-- licence is rejected at persistence. licence_uri is therefore NOT NULL and
-- checked non-blank — a value of all whitespace is not a licence either.
--
-- entity_type/entity_id follows the polymorphic Module 0 fabric convention
-- already used to attach oral narratives to fiches (oral_narrative_links,
-- migration 032): one media table can attach to a linguistic family, a
-- language, a people or a country without four near-identical tables.
--
-- Two-step rollout: recette first, production second (both Supabase projects
-- are labelled "production"; see docs/runbooks/migration-state.md).

CREATE TABLE IF NOT EXISTS afrik_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('language_family', 'language', 'people', 'country')),
  entity_id TEXT NOT NULL,
  author TEXT,
  licence_uri TEXT NOT NULL CHECK (btrim(licence_uri) <> ''),
  source_page_url TEXT,
  period TEXT,
  -- Whether the depiction was made during the subject's lifetime or is a
  -- later reconstitution — the editorial distinction DEC-032 names by hand.
  depiction_timing TEXT NOT NULL CHECK (depiction_timing IN ('contemporary', 'reconstitution')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE afrik_media IS
  'Media entries (images, videos) attached to an AFRIK fiche, each carrying '
  'a mandatory licence URI. entity_type/entity_id follow the polymorphic '
  'Module 0 fabric convention. See migration 073, REQ-128, DEC-032.';

COMMENT ON COLUMN afrik_media.licence_uri IS
  'Mandatory. NOT NULL + non-blank CHECK is the founding gate: a media entry '
  'with no licence is rejected at persistence.';

COMMENT ON COLUMN afrik_media.depiction_timing IS
  'contemporary: made during the subject''s lifetime. reconstitution: a '
  'later depiction (illustration, re-enactment, artist''s impression).';

CREATE INDEX IF NOT EXISTS idx_afrik_media_entity
  ON afrik_media(entity_type, entity_id);

ALTER TABLE afrik_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS afrik_media_read_public ON afrik_media;
CREATE POLICY        afrik_media_read_public ON afrik_media
  FOR SELECT USING (true);

-- No write policy: writes go through the service-role key only, matching
-- every other afrik_* table (019_afrik_rls.sql).
