-- Migration 002: Ajout des champs enrichis pour pays et ethnies
-- Ajout des colonnes pour descriptions, anciens noms, et informations culturelles

-- ============================================
-- 1. MODIFICATIONS TABLE countries
-- ============================================

ALTER TABLE countries 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS ancient_names TEXT; -- Max 3 noms séparés par virgules

-- ============================================
-- 2. MODIFICATIONS TABLE ethnic_groups
-- ============================================

ALTER TABLE ethnic_groups
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS ancient_name TEXT, -- Max 3 noms séparés par virgules
ADD COLUMN IF NOT EXISTS society_type TEXT,
ADD COLUMN IF NOT EXISTS religion TEXT,
ADD COLUMN IF NOT EXISTS linguistic_family TEXT,
ADD COLUMN IF NOT EXISTS historical_status TEXT,
ADD COLUMN IF NOT EXISTS regional_presence TEXT;

-- ============================================
-- 3. MODIFICATIONS TABLE ethnic_group_presence
-- ============================================

ALTER TABLE ethnic_group_presence
ADD COLUMN IF NOT EXISTS region TEXT; -- Région géographique précise du pays

-- ============================================
-- 4. INDEXES POUR RECHERCHE FULL-TEXT
-- ============================================

-- Indexes pour recherche full-text sur descriptions (PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_countries_description_fts 
ON countries USING gin(to_tsvector('french', description)) 
WHERE description IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ethnic_groups_description_fts 
ON ethnic_groups USING gin(to_tsvector('french', description)) 
WHERE description IS NOT NULL;

-- Indexes simples pour recherches sur anciens noms
CREATE INDEX IF NOT EXISTS idx_countries_ancient_names 
ON countries(ancient_names) 
WHERE ancient_names IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ethnic_groups_ancient_name 
ON ethnic_groups(ancient_name) 
WHERE ancient_name IS NOT NULL;

-- Index pour recherche par région géographique
CREATE INDEX IF NOT EXISTS idx_ethnic_group_presence_region 
ON ethnic_group_presence(region) 
WHERE region IS NOT NULL;

-- Index pour recherche par parent_id (sous-groupes)
CREATE INDEX IF NOT EXISTS idx_ethnic_groups_parent_id_enriched 
ON ethnic_groups(parent_id) 
WHERE parent_id IS NOT NULL;

