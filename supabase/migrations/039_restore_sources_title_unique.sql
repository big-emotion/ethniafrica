-- Migration 039 — restore the UNIQUE constraint on sources.title (idempotent)
--
-- Story: ETNI-1199 — the migrations, names and relations corpora loaded 0 rows
-- against recette even though the loaders and the source files were correct.
--
-- Root cause: 003_add_unique_constraint_sources_title.sql added
-- `sources_title_key UNIQUE (title)` precisely so the loaders could upsert with
-- `onConflict: "title"`. The V1 removal then ran `DROP TABLE IF EXISTS sources
-- CASCADE` (007_remove_v1_add_v2_contribution_types.sql), taking the constraint
-- with it, and 009_module_zero_fabric.sql recreated the table with
-- `CREATE TABLE IF NOT EXISTS sources` without restoring it. Migration 003 is
-- still recorded as applied, so nothing flagged the loss.
--
-- Effect: every `upsertSource` in migrationJsonLoader, relationJsonLoader and
-- nameRecordJsonLoader failed with "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification", which aborts the enclosing fiche.
-- migration_events, migration_event_peoples, name_records and
-- afrik_people_relations therefore stayed empty while the loader reported the
-- per-fiche errors and exited non-zero.
--
-- The three loaders treat `title` as the deduplication key for a citation, so
-- restoring 003's constraint keeps that contract rather than re-keying the
-- loaders onto the additive `source_key` column introduced by
-- 031_normalized_sources.sql (ETNI-666), which they never populate.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sources_title_key'
      AND conrelid = 'public.sources'::regclass
  ) THEN
    ALTER TABLE sources ADD CONSTRAINT sources_title_key UNIQUE (title);
  END IF;
END $$;

COMMENT ON CONSTRAINT sources_title_key ON sources IS
  'Deduplication key for citations. The AFRIK loaders upsert sources with '
  'onConflict: "title"; without this constraint every such upsert fails. '
  'Originally added by migration 003, lost to the V1 DROP TABLE in 007, '
  'restored by 039. ETNI-1199.';
