-- Migration 001: Schéma initial complet
-- Création des enums, tables de base, relations, contributions, RLS et indexes

-- ============================================
-- 1. ENUMS
-- ============================================

CREATE TYPE contribution_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE contribution_type AS ENUM ('new_region', 'new_country', 'new_ethnicity', 'update_region', 'update_country', 'update_ethnicity', 'new_presence', 'update_presence');

-- ============================================
-- 2. TABLES DE BASE
-- ============================================

-- Table: african_regions
CREATE TABLE african_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- Clé normalisée (ex: "afrique_australe")
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  name_pt TEXT,
  total_population BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Table: countries
CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL, -- Clé normalisée (ex: "afriqueDuSud")
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  name_pt TEXT,
  iso_code_2 CHAR(2),
  iso_code_3 CHAR(3),
  region_id UUID NOT NULL REFERENCES african_regions(id) ON DELETE CASCADE,
  population_2025 BIGINT NOT NULL,
  percentage_in_region NUMERIC(10,4), -- Corrigé: numeric(10,4) au lieu de numeric(5,4)
  percentage_in_africa NUMERIC(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Table: languages
CREATE TABLE languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL, -- Code ISO 639-1 ou 639-2
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  name_pt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: ethnic_groups
CREATE TABLE ethnic_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL, -- Clé normalisée (ex: "adjaApparentes")
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  name_pt TEXT,
  parent_id UUID REFERENCES ethnic_groups(id) ON DELETE SET NULL, -- Pour les sous-groupes
  total_population BIGINT,
  percentage_in_africa NUMERIC(10,4), -- Corrigé: numeric(10,4)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT check_no_self_parent CHECK (id != parent_id)
);

-- ============================================
-- 3. TABLES DE RELATIONS
-- ============================================

-- Table: ethnic_group_presence
-- Représente la présence d'une ethnie dans un pays avec ses statistiques
CREATE TABLE ethnic_group_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ethnic_group_id UUID NOT NULL REFERENCES ethnic_groups(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  population BIGINT NOT NULL,
  percentage_in_country NUMERIC(10,4), -- Corrigé: numeric(10,4)
  percentage_in_region NUMERIC(10,4), -- Corrigé: numeric(10,4)
  percentage_in_africa NUMERIC(10,4), -- Corrigé: numeric(10,4)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ethnic_group_id, country_id) -- Une ethnie ne peut être présente qu'une fois par pays
);

-- Table: ethnic_group_languages
-- Relation many-to-many entre ethnies et langues
CREATE TABLE ethnic_group_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ethnic_group_id UUID NOT NULL REFERENCES ethnic_groups(id) ON DELETE CASCADE,
  language_id UUID NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ethnic_group_id, language_id)
);

-- Table: sources
-- Sources de données pour les statistiques
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  url TEXT,
  author TEXT,
  publication_year INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: ethnic_group_sources
-- Relation many-to-many entre ethnies et sources
CREATE TABLE ethnic_group_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ethnic_group_id UUID NOT NULL REFERENCES ethnic_groups(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ethnic_group_id, source_id)
);

-- ============================================
-- 4. TABLE CONTRIBUTIONS
-- ============================================

-- Table: contributions
-- Stocke les contributions publiques en attente de modération
CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type contribution_type NOT NULL,
  status contribution_status DEFAULT 'pending',
  proposed_payload JSONB NOT NULL, -- Données proposées (flexible)
  contributor_email TEXT,
  contributor_name TEXT,
  notes TEXT, -- Notes du contributeur
  moderator_notes TEXT, -- Notes du modérateur
  reviewed_by UUID, -- ID du modérateur (si authentification ajoutée)
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TRIGGERS POUR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_african_regions_updated_at
  BEFORE UPDATE ON african_regions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_countries_updated_at
  BEFORE UPDATE ON countries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ethnic_groups_updated_at
  BEFORE UPDATE ON ethnic_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ethnic_group_presence_updated_at
  BEFORE UPDATE ON ethnic_group_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contributions_updated_at
  BEFORE UPDATE ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. RLS (Row Level Security)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE african_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethnic_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethnic_group_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethnic_group_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethnic_group_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Politiques SELECT publiques pour les tables officielles (lecture seule)
CREATE POLICY "Public read access for african_regions"
  ON african_regions FOR SELECT
  USING (true);

CREATE POLICY "Public read access for countries"
  ON countries FOR SELECT
  USING (true);

CREATE POLICY "Public read access for languages"
  ON languages FOR SELECT
  USING (true);

CREATE POLICY "Public read access for ethnic_groups"
  ON ethnic_groups FOR SELECT
  USING (true);

CREATE POLICY "Public read access for ethnic_group_presence"
  ON ethnic_group_presence FOR SELECT
  USING (true);

CREATE POLICY "Public read access for ethnic_group_languages"
  ON ethnic_group_languages FOR SELECT
  USING (true);

CREATE POLICY "Public read access for sources"
  ON sources FOR SELECT
  USING (true);

CREATE POLICY "Public read access for ethnic_group_sources"
  ON ethnic_group_sources FOR SELECT
  USING (true);

-- Politiques pour contributions : INSERT public, SELECT/UPDATE pour modérateurs
CREATE POLICY "Public insert access for contributions"
  ON contributions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public read own contributions"
  ON contributions FOR SELECT
  USING (true); -- Pour l'instant, lecture publique (peut être restreint plus tard)

-- ============================================
-- 7. INDEXES
-- ============================================

-- Indexes sur les foreign keys
CREATE INDEX idx_countries_region_id ON countries(region_id);
CREATE INDEX idx_ethnic_groups_parent_id ON ethnic_groups(parent_id);
CREATE INDEX idx_ethnic_group_presence_ethnic_group_id ON ethnic_group_presence(ethnic_group_id);
CREATE INDEX idx_ethnic_group_presence_country_id ON ethnic_group_presence(country_id);
CREATE INDEX idx_ethnic_group_languages_ethnic_group_id ON ethnic_group_languages(ethnic_group_id);
CREATE INDEX idx_ethnic_group_languages_language_id ON ethnic_group_languages(language_id);
CREATE INDEX idx_ethnic_group_sources_ethnic_group_id ON ethnic_group_sources(ethnic_group_id);
CREATE INDEX idx_ethnic_group_sources_source_id ON ethnic_group_sources(source_id);

-- Indexes sur les colonnes fréquemment recherchées
CREATE INDEX idx_african_regions_code ON african_regions(code);
CREATE INDEX idx_countries_slug ON countries(slug);
CREATE INDEX idx_countries_iso_code_2 ON countries(iso_code_2);
CREATE INDEX idx_countries_iso_code_3 ON countries(iso_code_3);
CREATE INDEX idx_ethnic_groups_slug ON ethnic_groups(slug);
CREATE INDEX idx_languages_code ON languages(code);

-- Indexes pour les contributions
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_contributions_type ON contributions(type);
CREATE INDEX idx_contributions_created_at ON contributions(created_at);

-- Index composite pour les recherches fréquentes
CREATE INDEX idx_ethnic_group_presence_country_ethnic ON ethnic_group_presence(country_id, ethnic_group_id);
CREATE INDEX idx_countries_region_population ON countries(region_id, population_2025 DESC);

