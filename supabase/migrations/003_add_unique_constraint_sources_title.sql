-- Migration 003: Ajout de la contrainte UNIQUE sur sources.title
-- Cette contrainte permet d'utiliser onConflict dans les upserts

-- Ajouter la contrainte UNIQUE si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sources_title_key'
    AND conrelid = 'sources'::regclass
  ) THEN
    ALTER TABLE sources ADD CONSTRAINT sources_title_key UNIQUE (title);
  END IF;
END $$;

