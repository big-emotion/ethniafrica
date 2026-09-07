-- Migration 085 — afrik_translations: the translation record (REQ-142, DEC-048)
--
-- Context: the site publishes in two locales and the corpus is authored in
-- French. A machine translation is publishable on the single condition that
-- it declares itself (DEC-048), the way a fiche resting only on unverified
-- sources is published and visibly marked. This table is where a translated
-- record declares how it was translated; the reader-facing marker reads
-- `translation_kind` from here.
--
-- recompute_confidence() is deliberately untouched. Translation provenance
-- is a third axis, separate from `tier` (how much authority a source carries)
-- and `source_kind` (what kind of thing it is): a machine translation of a
-- claim resting on an official source keeps the score the source earns, and
-- the confidence function must not learn about this table.
--
-- The record is keyed (entity_type, entity_id, lang) and polymorphic over
-- the nine corpus directories, with no FK to the entity tables — the same
-- convention afrik_media (073) uses, because relations, migrations, name
-- records and naming systems have no single id column to reference.
--
-- Git wins. The sidecars under dataset/translations/<lang>/ are the editorial
-- truth and the loader (scripts/migrateAfrikToDatabase.ts) upserts them on
-- the primary key; a row disagreeing with its sidecar is a row the next load
-- rewrites. `source_hash` and `field_hashes` are what the read path uses to
-- say "the French moved since this was translated" — they are copied from
-- the sidecar, never computed here.
--
-- Two-step rollout: recette on merge (migrate-recette.yml), production on the
-- next published Release (deploy-production.yml, `migrate` job). See
-- docs/runbooks/migration-state.md.

CREATE TABLE IF NOT EXISTS afrik_translations (
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'language_family', 'language', 'people', 'country', 'patronyme',
    'relation', 'migration', 'name', 'onomastic_system'
  )),
  entity_id TEXT NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'fr')),
  -- The translated record in the fiche's own shape, minus its _translation
  -- block: invariants verbatim, prose translated, nulls carried.
  content JSONB NOT NULL,
  translation_kind TEXT NOT NULL CHECK (translation_kind IN ('human', 'machine_reviewed', 'machine')),
  translated_at TIMESTAMPTZ NOT NULL,
  reviewed_by TEXT,
  model TEXT,
  source_hash TEXT NOT NULL,
  field_hashes JSONB NOT NULL DEFAULT '{}',
  review_required JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id, lang)
);

COMMENT ON TABLE afrik_translations IS
  'One translated record per entity and locale, declaring how it was '
  'translated (human, machine_reviewed, machine). Loaded from the sidecars '
  'under dataset/translations/<lang>/. Separate axis from source tier and '
  'source_kind; recompute_confidence() does not read it. See migration 085, '
  'REQ-142, DEC-048.';

COMMENT ON COLUMN afrik_translations.source_hash IS
  'sha256 over the translatable leaves of the source fiche at translation '
  'time. The read path compares it with the served record to flag staleness.';

COMMENT ON COLUMN afrik_translations.review_required IS
  'Concrete paths of the review-required (class 3) leaves the record carries; '
  'they are withheld from the reader while translation_kind is machine.';

-- The loader reconciles one locale at a time; the read path hits the primary
-- key and needs nothing more.
CREATE INDEX IF NOT EXISTS idx_afrik_translations_lang_entity_type
  ON afrik_translations(lang, entity_type);

ALTER TABLE afrik_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS afrik_translations_read_public ON afrik_translations;
CREATE POLICY        afrik_translations_read_public ON afrik_translations
  FOR SELECT USING (true);

-- No write policy: writes go through the service-role loader only, matching
-- every other afrik_* table (019_afrik_rls.sql).
