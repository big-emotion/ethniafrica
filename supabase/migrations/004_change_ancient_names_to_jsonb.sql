-- Migration 004: Changer ancient_names de TEXT à JSONB
-- Convertit les anciennes appellations d'un format texte séparé par virgules vers un format JSON structuré

-- ============================================
-- 1. CRÉER UNE COLONNE TEMPORAIRE JSONB
-- ============================================

ALTER TABLE countries 
ADD COLUMN IF NOT EXISTS ancient_names_jsonb JSONB;

-- ============================================
-- 2. MIGRER LES DONNÉES EXISTANTES
-- ============================================

-- Convertir les anciennes données (chaînes séparées par virgules) en format JSON
-- Format: [{"period": "Période", "names": ["Nom1", "Nom2"]}]
UPDATE countries
SET ancient_names_jsonb = CASE
  WHEN ancient_names IS NULL OR ancient_names = '' THEN NULL
  WHEN ancient_names::text LIKE '[%' THEN 
    -- Déjà au format JSON, essayer de le parser
    ancient_names::text::jsonb
  ELSE
    -- Ancien format: chaîne séparée par virgules
    -- Convertir en format structuré avec période vide
    (
      SELECT jsonb_build_array(
        jsonb_build_object(
          'period', '',
          'names', jsonb_agg(trim(elem))
        )
      )
      FROM unnest(string_to_array(trim(ancient_names), ',')) AS elem
      WHERE trim(elem) != ''
    )
END
WHERE ancient_names IS NOT NULL;

-- ============================================
-- 3. SUPPRIMER L'ANCIENNE COLONNE ET RENOMMER
-- ============================================

ALTER TABLE countries 
DROP COLUMN IF EXISTS ancient_names;

ALTER TABLE countries 
RENAME COLUMN ancient_names_jsonb TO ancient_names;

-- ============================================
-- 4. METTRE À JOUR LES INDEX
-- ============================================

-- Supprimer l'ancien index sur TEXT
DROP INDEX IF EXISTS idx_countries_ancient_names;

-- Créer un nouvel index GIN pour JSONB (recherche dans le JSON)
CREATE INDEX IF NOT EXISTS idx_countries_ancient_names_jsonb 
ON countries USING gin(ancient_names) 
WHERE ancient_names IS NOT NULL;

-- Index pour recherche dans le champ 'names' du JSON
CREATE INDEX IF NOT EXISTS idx_countries_ancient_names_names 
ON countries USING gin((ancient_names -> 'names')) 
WHERE ancient_names IS NOT NULL;
