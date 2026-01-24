-- Migration 006: AFRIK Schema v2
-- Creates tables for AFRIK API v2 with stable identifiers and JSONB content

-- Countries (stable ID: ISO 3166-1 alpha-3)
CREATE TABLE IF NOT EXISTS afrik_countries (
  id CHAR(3) PRIMARY KEY,
  name_fr TEXT NOT NULL,
  etymology TEXT,
  name_origin_actor TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Language Families (stable ID: FLG_xxxxx)
CREATE TABLE IF NOT EXISTS afrik_language_families (
  id VARCHAR(50) PRIMARY KEY,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Languages (stable ID: ISO 639-3)
CREATE TABLE IF NOT EXISTS afrik_languages (
  id VARCHAR(10) PRIMARY KEY,
  name TEXT NOT NULL,
  family_id VARCHAR(50) REFERENCES afrik_language_families(id),
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Peoples (stable ID: PPL_xxxxx)
CREATE TABLE IF NOT EXISTS afrik_peoples (
  id VARCHAR(50) PRIMARY KEY,
  name_main TEXT NOT NULL,
  language_family_id VARCHAR(50) REFERENCES afrik_language_families(id),
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relations: People ↔ Country
CREATE TABLE IF NOT EXISTS afrik_people_countries (
  people_id VARCHAR(50) REFERENCES afrik_peoples(id) ON DELETE CASCADE,
  country_id CHAR(3) REFERENCES afrik_countries(id) ON DELETE CASCADE,
  PRIMARY KEY (people_id, country_id)
);

-- Indexes for full-text search on JSONB content
CREATE INDEX IF NOT EXISTS idx_afrik_countries_content_gin ON afrik_countries USING gin(content);
CREATE INDEX IF NOT EXISTS idx_afrik_peoples_content_gin ON afrik_peoples USING gin(content);
CREATE INDEX IF NOT EXISTS idx_afrik_language_families_content_gin ON afrik_language_families USING gin(content);
CREATE INDEX IF NOT EXISTS idx_afrik_languages_content_gin ON afrik_languages USING gin(content);

-- Indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_afrik_peoples_family_id ON afrik_peoples(language_family_id);
CREATE INDEX IF NOT EXISTS idx_afrik_languages_family_id ON afrik_languages(family_id);
CREATE INDEX IF NOT EXISTS idx_afrik_people_countries_people_id ON afrik_people_countries(people_id);
CREATE INDEX IF NOT EXISTS idx_afrik_people_countries_country_id ON afrik_people_countries(country_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_afrik_countries_name_fr ON afrik_countries(name_fr);
CREATE INDEX IF NOT EXISTS idx_afrik_peoples_name_main ON afrik_peoples(name_main);
CREATE INDEX IF NOT EXISTS idx_afrik_language_families_name_fr ON afrik_language_families(name_fr);

-- Comments for documentation
COMMENT ON TABLE afrik_countries IS 'Countries with stable ISO 3166-1 alpha-3 identifiers';
COMMENT ON TABLE afrik_language_families IS 'Language families with stable FLG_xxxxx identifiers';
COMMENT ON TABLE afrik_languages IS 'Languages with stable ISO 639-3 identifiers';
COMMENT ON TABLE afrik_peoples IS 'Peoples with stable PPL_xxxxx identifiers';
COMMENT ON TABLE afrik_people_countries IS 'Many-to-many relation between peoples and countries';

COMMENT ON COLUMN afrik_countries.content IS 'Evolutionary content stored as JSONB - can be extended without schema migration';
COMMENT ON COLUMN afrik_language_families.content IS 'Evolutionary content stored as JSONB - can be extended without schema migration';
COMMENT ON COLUMN afrik_languages.content IS 'Evolutionary content stored as JSONB - can be extended without schema migration';
COMMENT ON COLUMN afrik_peoples.content IS 'Evolutionary content stored as JSONB - can be extended without schema migration';

