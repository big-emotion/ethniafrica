-- Migration 005: Ajout des sections 4 et 6 pour les pays
-- Ajout des colonnes pour résumé détaillé des groupes ethniques et notes

-- ============================================
-- 1. MODIFICATIONS TABLE countries
-- ============================================

ALTER TABLE countries 
ADD COLUMN IF NOT EXISTS ethnic_groups_summary TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- 2. INDEXES POUR RECHERCHE FULL-TEXT
-- ============================================

-- Indexes pour recherche full-text sur ethnic_groups_summary et notes
CREATE INDEX IF NOT EXISTS idx_countries_ethnic_groups_summary_fts 
ON countries USING gin(to_tsvector('french', ethnic_groups_summary)) 
WHERE ethnic_groups_summary IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_countries_notes_fts 
ON countries USING gin(to_tsvector('french', notes)) 
WHERE notes IS NOT NULL;

