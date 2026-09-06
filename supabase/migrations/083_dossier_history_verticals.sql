-- Historical and spiritual dossiers reuse the existing chapter model.
ALTER TYPE dossier_vertical_type ADD VALUE IF NOT EXISTS 'histoires';
ALTER TYPE dossier_vertical_type ADD VALUE IF NOT EXISTS 'spiritualites';

COMMENT ON TABLE afrik_dossiers IS
  'Shared sourced dossiers with narrative chapters, optional numerical figures and optional paired perspectives. Source of truth: dataset/source/afrik/dossiers/.';
COMMENT ON COLUMN afrik_dossiers.vertical IS
  'Internal corpus classification retained for compatibility. Public navigation is organised through the shared editorial theme catalog.';
