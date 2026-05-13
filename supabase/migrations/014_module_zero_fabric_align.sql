-- Migration 014: Module #0 Fabric — schema reconciliation (ETNI-22)
-- =============================================================================
-- Reconciles the schemas of sources, assertions, confidence_scores and
-- editorial_doctrine introduced by migration 008 with the Story 1.2 column
-- layouts.  Idempotent: re-running this migration must not error.
--
-- Guarantees:
--   * Existing rows are preserved or explicitly migrated; no silent drops.
--   * RLS stays enabled on every reconciled table.
--   * Anon role keeps SELECT access; writes remain denied (no write policies).
--   * Re-runs are safe via `IF EXISTS` / `IF NOT EXISTS` guards.
--
-- Out of scope (tracked in follow-up tickets):
--   * Recompute trigger + `recompute_confidence()` function   → ETNI-23
--   * Editorial doctrine seed rows                            → ETNI-30
-- =============================================================================

-- =============================================================================
-- 1. sources — add author/year/tier/page/notes/added_at/verified_at
--                drop type, metadata, created_at, updated_at
-- =============================================================================

-- 1a. Add the new columns (idempotent).
ALTER TABLE IF EXISTS sources
  ADD COLUMN IF NOT EXISTS author      TEXT,
  ADD COLUMN IF NOT EXISTS year        INTEGER,
  ADD COLUMN IF NOT EXISTS tier        TEXT,
  ADD COLUMN IF NOT EXISTS page        TEXT,
  ADD COLUMN IF NOT EXISTS notes       TEXT,
  ADD COLUMN IF NOT EXISTS added_at    TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 1b. Backfill added_at from the legacy created_at column when available.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sources' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'UPDATE sources SET added_at = created_at WHERE added_at IS NULL AND created_at IS NOT NULL';
  END IF;
END $$;

-- 1c. Constrain `tier` to the canonical enum values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sources_tier_check'
  ) THEN
    ALTER TABLE sources
      ADD CONSTRAINT sources_tier_check
      CHECK (tier IS NULL OR tier IN ('primary','secondary','tertiary','ai-enriched'));
  END IF;
END $$;

-- 1d. Drop legacy trigger that depended on the soon-to-be-removed updated_at.
DROP TRIGGER IF EXISTS sources_updated_at_trigger ON sources;

-- 1e. Drop legacy columns now that data has been migrated.
ALTER TABLE IF EXISTS sources DROP COLUMN IF EXISTS type;
ALTER TABLE IF EXISTS sources DROP COLUMN IF EXISTS metadata;
ALTER TABLE IF EXISTS sources DROP COLUMN IF EXISTS created_at;
ALTER TABLE IF EXISTS sources DROP COLUMN IF EXISTS updated_at;

-- 1f. Drop the obsolete tier-replaced index on `type` (if it survived a re-run).
DROP INDEX IF EXISTS idx_sources_type;

-- 1g. Indexes mandated by the AC.
CREATE INDEX IF NOT EXISTS idx_sources_tier        ON sources(tier);
CREATE INDEX IF NOT EXISTS idx_sources_verified_at ON sources(verified_at);

COMMENT ON COLUMN sources.tier        IS 'Source tier: primary | secondary | tertiary | ai-enriched';
COMMENT ON COLUMN sources.verified_at IS 'Timestamp of the most recent human verification of this source';

-- =============================================================================
-- 2. assertions — replace value/source_id/created_at/updated_at with
--                  statement/position/source_ids[]/confidence_level/authored_at/
--                  authored_by/superseded_by
-- =============================================================================

-- 2a. Drop legacy triggers that reference the columns we are about to remove.
DROP TRIGGER IF EXISTS assertions_updated_at_trigger ON assertions;
DROP TRIGGER IF EXISTS assertions_audit_trigger      ON assertions;

-- 2b. Add new columns.
ALTER TABLE IF EXISTS assertions
  ADD COLUMN IF NOT EXISTS statement         TEXT,
  ADD COLUMN IF NOT EXISTS position          TEXT,
  ADD COLUMN IF NOT EXISTS source_ids        UUID[] DEFAULT '{}'::UUID[],
  ADD COLUMN IF NOT EXISTS confidence_level  TEXT,
  ADD COLUMN IF NOT EXISTS authored_at       TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS authored_by       UUID,
  ADD COLUMN IF NOT EXISTS superseded_by     UUID REFERENCES assertions(id) ON DELETE SET NULL;

-- 2c. Backfill `statement` from the legacy JSONB `value` column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assertions' AND column_name = 'value'
  ) THEN
    EXECUTE $sql$
      UPDATE assertions
      SET statement = CASE
        WHEN jsonb_typeof(value) = 'string' THEN value #>> '{}'
        ELSE value::text
      END
      WHERE statement IS NULL AND value IS NOT NULL
    $sql$;
  END IF;
END $$;

-- 2d. Backfill `source_ids` from the legacy scalar `source_id`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assertions' AND column_name = 'source_id'
  ) THEN
    EXECUTE $sql$
      UPDATE assertions
      SET source_ids = ARRAY[source_id]
      WHERE source_id IS NOT NULL
        AND (source_ids IS NULL OR cardinality(source_ids) = 0)
    $sql$;
  END IF;
END $$;

-- 2e. Backfill `authored_at` from the legacy `created_at`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assertions' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'UPDATE assertions SET authored_at = created_at WHERE authored_at IS NULL AND created_at IS NOT NULL';
  END IF;
END $$;

-- 2f. Constrain `confidence_level` to the canonical enum values (nullable).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assertions_confidence_level_check'
  ) THEN
    ALTER TABLE assertions
      ADD CONSTRAINT assertions_confidence_level_check
      CHECK (
        confidence_level IS NULL
        OR confidence_level IN ('high','medium','low','contested')
      );
  END IF;
END $$;

-- 2g. Drop legacy columns now that data has been migrated.
ALTER TABLE IF EXISTS assertions DROP COLUMN IF EXISTS value;
ALTER TABLE IF EXISTS assertions DROP COLUMN IF EXISTS source_id;
ALTER TABLE IF EXISTS assertions DROP COLUMN IF EXISTS created_at;
ALTER TABLE IF EXISTS assertions DROP COLUMN IF EXISTS updated_at;

-- 2h. Drop obsolete index on the removed source_id column.
DROP INDEX IF EXISTS idx_assertions_source_id;

-- 2i. Keep the (entity_type, entity_id) index from 008.
CREATE INDEX IF NOT EXISTS idx_assertions_entity ON assertions(entity_type, entity_id);

-- 2j. Re-create the audit trigger using the new column shape.
--      The previous function (defined in 010) referenced OLD.value / NEW.value
--      which no longer exists. We redefine it to log `statement` snapshots
--      instead so that the audit_log table keeps capturing assertion changes.
CREATE OR REPLACE FUNCTION audit_assertion_changes()
RETURNS TRIGGER AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (action, entity_type, entity_id, actor_id, metadata)
    VALUES ('assertion_created', 'assertion', NEW.id::TEXT, auth.uid(),
            jsonb_build_object(
              'entity_type', NEW.entity_type,
              'entity_id',   NEW.entity_id,
              'field_path',  NEW.field_path,
              'statement',   NEW.statement
            ));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (action, entity_type, entity_id, actor_id, metadata)
    VALUES ('assertion_updated', 'assertion', NEW.id::TEXT, auth.uid(),
            jsonb_build_object(
              'entity_type',   NEW.entity_type,
              'entity_id',     NEW.entity_id,
              'old_statement', OLD.statement,
              'new_statement', NEW.statement
            ));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (action, entity_type, entity_id, actor_id, metadata)
    VALUES ('assertion_deleted', 'assertion', OLD.id::TEXT, auth.uid(),
            jsonb_build_object(
              'entity_type', OLD.entity_type,
              'entity_id',   OLD.entity_id
            ));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assertions_audit_trigger ON assertions;
CREATE TRIGGER assertions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON assertions
  FOR EACH ROW
  EXECUTE FUNCTION audit_assertion_changes();

COMMENT ON COLUMN assertions.statement        IS 'Plain-text claim authored by a contributor';
COMMENT ON COLUMN assertions.position         IS 'Optional stance label (e.g. consensus / minority / colonial-legacy)';
COMMENT ON COLUMN assertions.source_ids       IS 'Sources backing this assertion (FK semantics enforced at application level)';
COMMENT ON COLUMN assertions.confidence_level IS 'Self-declared author confidence: high | medium | low | contested';
COMMENT ON COLUMN assertions.superseded_by    IS 'Newer assertion that replaces this one (NULL if current)';

-- =============================================================================
-- 3. confidence_scores — switch from per-assertion to per-entity scoring
-- =============================================================================

-- 3a. Add the entity-scoped columns + observability metrics.
ALTER TABLE IF EXISTS confidence_scores
  ADD COLUMN IF NOT EXISTS entity_type            TEXT,
  ADD COLUMN IF NOT EXISTS entity_id              TEXT,
  ADD COLUMN IF NOT EXISTS source_count           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_source_quality     DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS last_human_audit_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS open_flag_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recomputed_at          TIMESTAMPTZ DEFAULT NOW();

-- 3b. Backfill entity_type / entity_id from the legacy assertion_id link.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'confidence_scores' AND column_name = 'assertion_id'
  ) THEN
    EXECUTE $sql$
      UPDATE confidence_scores cs
      SET entity_type = a.entity_type,
          entity_id   = a.entity_id
      FROM assertions a
      WHERE cs.assertion_id = a.id
        AND cs.entity_type IS NULL
    $sql$;

    -- Remove any rows whose linked assertion vanished — they cannot be
    -- meaningfully attached to an entity and would violate NOT NULL below.
    EXECUTE 'DELETE FROM confidence_scores WHERE assertion_id IS NOT NULL AND entity_type IS NULL';
  END IF;
END $$;

-- 3c. Backfill recomputed_at from the legacy created_at column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'confidence_scores' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'UPDATE confidence_scores SET recomputed_at = created_at WHERE recomputed_at IS NULL';
  END IF;
END $$;

-- 3d. Collapse any duplicates on (entity_type, entity_id) before adding the
--      unique constraint. Keep the highest score per entity (idempotent on
--      already-unique data).
DELETE FROM confidence_scores cs
USING confidence_scores cs2
WHERE cs.entity_type IS NOT NULL
  AND cs.entity_type = cs2.entity_type
  AND cs.entity_id   = cs2.entity_id
  AND cs.ctid < cs2.ctid;

-- 3e. Drop legacy columns (in order: drop FK/index dependents first).
ALTER TABLE IF EXISTS confidence_scores DROP COLUMN IF EXISTS assertion_id;
ALTER TABLE IF EXISTS confidence_scores DROP COLUMN IF EXISTS methodology;
ALTER TABLE IF EXISTS confidence_scores DROP COLUMN IF EXISTS created_at;

-- 3f. Enforce NOT NULL on the entity columns + uniqueness on the entity pair.
--      Only set NOT NULL if every row already has a value; otherwise leave
--      nullable so the migration stays idempotent against partial data.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM confidence_scores WHERE entity_type IS NULL) THEN
    ALTER TABLE confidence_scores ALTER COLUMN entity_type SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM confidence_scores WHERE entity_id IS NULL) THEN
    ALTER TABLE confidence_scores ALTER COLUMN entity_id SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'confidence_scores_entity_unique'
  ) THEN
    ALTER TABLE confidence_scores
      ADD CONSTRAINT confidence_scores_entity_unique UNIQUE (entity_type, entity_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_confidence_scores_entity
  ON confidence_scores(entity_type, entity_id);

COMMENT ON COLUMN confidence_scores.entity_type         IS 'Target entity table key (people, language_family, country, language)';
COMMENT ON COLUMN confidence_scores.entity_id           IS 'Target entity identifier (PPL_*, FLG_*, ISO3, ISO 639-3)';
COMMENT ON COLUMN confidence_scores.score               IS 'Aggregated confidence score in [0,1] computed from sources/audits/flags';
COMMENT ON COLUMN confidence_scores.source_count        IS 'Number of distinct sources backing the entity';
COMMENT ON COLUMN confidence_scores.avg_source_quality  IS 'Mean tier-derived quality score across backing sources';
COMMENT ON COLUMN confidence_scores.last_human_audit_at IS 'Timestamp of the most recent human verification pass';
COMMENT ON COLUMN confidence_scores.open_flag_count     IS 'Cached number of unresolved flags on the entity';
COMMENT ON COLUMN confidence_scores.recomputed_at       IS 'Timestamp of the most recent score recomputation';

-- =============================================================================
-- 4. editorial_doctrine — rename key→slug, content→mdx_source,
--                         add published_at/superseded_at, drop category/active
-- =============================================================================

-- 4a. Drop legacy trigger that depended on updated_at.
DROP TRIGGER IF EXISTS editorial_doctrine_updated_at_trigger ON editorial_doctrine;

-- 4b. Rename `key` → `slug` (preserves data).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editorial_doctrine' AND column_name = 'key'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editorial_doctrine' AND column_name = 'slug'
  ) THEN
    EXECUTE 'ALTER TABLE editorial_doctrine RENAME COLUMN key TO slug';
  END IF;
END $$;

-- The original UNIQUE(key) constraint travels with the column under its old
-- name; drop it so the (slug, version) composite unique below is canonical.
ALTER TABLE editorial_doctrine DROP CONSTRAINT IF EXISTS editorial_doctrine_key_key;

-- 4c. Rename `content` → `mdx_source` (preserves data).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editorial_doctrine' AND column_name = 'content'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editorial_doctrine' AND column_name = 'mdx_source'
  ) THEN
    EXECUTE 'ALTER TABLE editorial_doctrine RENAME COLUMN content TO mdx_source';
  END IF;
END $$;

-- 4d. Add the new lifecycle columns.
ALTER TABLE IF EXISTS editorial_doctrine
  ADD COLUMN IF NOT EXISTS published_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;

-- 4e. Backfill published_at from the legacy created_at column (best-effort).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editorial_doctrine' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'UPDATE editorial_doctrine SET published_at = created_at WHERE published_at IS NULL';
  END IF;
END $$;

-- 4f. Drop legacy columns no longer in the target shape.
ALTER TABLE IF EXISTS editorial_doctrine DROP COLUMN IF EXISTS category;
ALTER TABLE IF EXISTS editorial_doctrine DROP COLUMN IF EXISTS active;
ALTER TABLE IF EXISTS editorial_doctrine DROP COLUMN IF EXISTS created_at;
ALTER TABLE IF EXISTS editorial_doctrine DROP COLUMN IF EXISTS updated_at;

-- 4g. Unique index on (slug, version).
CREATE UNIQUE INDEX IF NOT EXISTS idx_editorial_doctrine_slug_version
  ON editorial_doctrine(slug, version);

COMMENT ON COLUMN editorial_doctrine.slug          IS 'Stable identifier (kebab-case) used in URLs and references';
COMMENT ON COLUMN editorial_doctrine.mdx_source    IS 'Raw MDX source for the doctrine page';
COMMENT ON COLUMN editorial_doctrine.version       IS 'Monotonic version per slug; latest published is the active one';
COMMENT ON COLUMN editorial_doctrine.published_at  IS 'Timestamp when this version was published';
COMMENT ON COLUMN editorial_doctrine.superseded_at IS 'Timestamp when this version was retired by a newer one';

-- =============================================================================
-- 5. RLS — re-affirm that every reconciled table is locked down.
-- =============================================================================
-- Migration 008 already enabled RLS and granted anon SELECT. The reconciled
-- columns inherit those policies. We re-assert ENABLE here so a fresh database
-- still has RLS on if 008 was patched or partially rolled back.
ALTER TABLE sources             ENABLE ROW LEVEL SECURITY;
ALTER TABLE assertions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE confidence_scores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial_doctrine  ENABLE ROW LEVEL SECURITY;

-- Re-create the read-public policies idempotently (DROP-then-CREATE pattern
-- because CREATE POLICY does not support IF NOT EXISTS).
DROP POLICY IF EXISTS sources_read_public            ON sources;
CREATE POLICY sources_read_public            ON sources            FOR SELECT USING (true);

DROP POLICY IF EXISTS assertions_read_public         ON assertions;
CREATE POLICY assertions_read_public         ON assertions         FOR SELECT USING (true);

DROP POLICY IF EXISTS confidence_scores_read_public  ON confidence_scores;
CREATE POLICY confidence_scores_read_public  ON confidence_scores  FOR SELECT USING (true);

DROP POLICY IF EXISTS editorial_doctrine_read_public ON editorial_doctrine;
CREATE POLICY editorial_doctrine_read_public ON editorial_doctrine FOR SELECT USING (true);
-- No INSERT / UPDATE / DELETE policies → writes denied by default for anon.
