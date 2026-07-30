-- Migration 031 — oral narrative registry (ETNI-668)
--
-- Oral narratives are attributed accounts. They remain distinct from sources
-- and factual assertions, and publication is allowed only after review and
-- rights clearance. This migration is idempotent and must be applied by a
-- human through the normal Supabase migration process.

CREATE TABLE IF NOT EXISTS oral_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  narrative_code TEXT NOT NULL UNIQUE CHECK (narrative_code ~ '^ORL_[A-Z0-9_]+$'),
  assertion_id UUID REFERENCES assertions(id) ON DELETE SET NULL,
  narrator_display_mode TEXT NOT NULL CHECK (narrator_display_mode IN ('public_name', 'pseudonym', 'withheld')),
  narrator_display_name TEXT,
  community TEXT NOT NULL,
  collector TEXT,
  narrative_date DATE,
  place_precision TEXT NOT NULL CHECK (place_precision IN ('exact', 'locality', 'region', 'country', 'withheld')),
  language_code TEXT NOT NULL CHECK (language_code ~ '^[a-z]{3}$'),
  narrative_kind TEXT NOT NULL CHECK (narrative_kind IN ('tradition', 'testimony', 'memory', 'story')),
  transcript TEXT,
  summary TEXT,
  media_locator TEXT,
  variant_of UUID REFERENCES oral_narratives(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'restricted' CHECK (visibility IN ('restricted', 'public')),
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  rights_status TEXT NOT NULL DEFAULT 'pending' CHECK (rights_status IN ('pending', 'cleared', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (narrator_display_mode = 'withheld' OR narrator_display_name IS NOT NULL),
  CHECK (transcript IS NOT NULL OR summary IS NOT NULL),
  CHECK (
    visibility = 'restricted'
    OR (visibility = 'public' AND review_status = 'approved' AND rights_status = 'cleared')
  )
);

COMMENT ON TABLE oral_narratives IS
  'Attributed oral narratives kept separate from bibliographic sources and factual assertions.';

CREATE TABLE IF NOT EXISTS oral_narrative_links (
  narrative_id UUID NOT NULL REFERENCES oral_narratives(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('language_family', 'people', 'country')),
  entity_id TEXT NOT NULL,
  PRIMARY KEY (narrative_id, entity_type, entity_id)
);

COMMENT ON TABLE oral_narrative_links IS
  'Links an oral narrative to AFRIK linguistic-family, people, or country fiches.';

CREATE INDEX IF NOT EXISTS idx_oral_narratives_assertion_id
  ON oral_narratives(assertion_id);
CREATE INDEX IF NOT EXISTS idx_oral_narratives_variant_of
  ON oral_narratives(variant_of);
CREATE INDEX IF NOT EXISTS idx_oral_narrative_links_entity
  ON oral_narrative_links(entity_type, entity_id);

ALTER TABLE oral_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE oral_narrative_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY oral_narratives_public_read ON oral_narratives
    FOR SELECT USING (
      visibility = 'public'
      AND review_status = 'approved'
      AND rights_status = 'cleared'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY oral_narrative_links_public_read ON oral_narrative_links
    FOR SELECT USING (
      EXISTS (
        SELECT 1
        FROM oral_narratives narrative
        WHERE narrative.id = oral_narrative_links.narrative_id
          AND narrative.visibility = 'public'
          AND narrative.review_status = 'approved'
          AND narrative.rights_status = 'cleared'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
