-- Migration 015: Module #0 — Source Transparency Fabric triggers
-- =============================================================================
-- Story:  ETNI-23 [1.3] — Postgres triggers: assertions-required + confidence
--         recomputation
-- Epic:   ETNI-2 (Epic 1 — Source Transparency Fabric), ARs AR3 + AR15
--
-- This migration assumes migration 014 (ETNI-22 schema reconciliation) has
-- already been applied. 014 reshapes confidence_scores to use
-- (entity_type, entity_id, …) instead of the original assertion_id-keyed
-- shape defined in 008. If 014 has not run, the safety ALTER TABLE blocks at
-- the top of this file will best-effort add the columns this migration relies
-- on; they are intentionally idempotent (ADD COLUMN IF NOT EXISTS).
--
-- Table naming caveat: the Jira ticket references the tables as
--   afrik_peuples / afrik_familles_linguistiques (French names)
-- but the canonical schema (migration 006) defines them as
--   afrik_peoples / afrik_language_families (English names).
-- This migration targets the canonical English names. If a future migration
-- renames the tables, the triggers below must be re-created.
--
-- What this migration adds (none of which exists in 010):
--   1. recompute_confidence(p_entity_type TEXT, p_entity_id TEXT) function
--      that upserts a confidence_scores row derived from assertions + sources
--      + open flags + last_human_audit_at.
--   2. recompute_confidence_all() function for the nightly cron job.
--   3. enforce_assertion_required() trigger function that rejects UPDATEs to
--      demographic / classification fields on afrik_peoples and
--      afrik_language_families when no matching assertions row exists.
--   4. BEFORE UPDATE triggers wiring (3) onto the protected columns plus a
--      JSONB-aware guard on the demographic fields nested in `content`.
--   5. AFTER INSERT trigger on revisions that calls recompute_confidence for
--      the affected entity.
--   6. AFTER UPDATE trigger on flags (when status transitions into or out of
--      'open') that calls recompute_confidence.
--   7. Optional nightly schedule via pg_cron when the extension is available.
--   8. Override / integrity-bypass events logged to audit_log.
--
-- Idempotency: every function uses CREATE OR REPLACE, every trigger uses
-- DROP TRIGGER IF EXISTS … CASCADE before CREATE TRIGGER. This migration
-- can be re-run safely.
-- =============================================================================


-- =============================================================================
-- 0. Defensive column reconciliation
-- -----------------------------------------------------------------------------
-- These ALTER TABLE statements are no-ops if migration 014 (ETNI-22) has
-- already reconciled confidence_scores. They are kept as a safety net so 015
-- can apply cleanly in any environment where the new columns are missing —
-- otherwise the function body below would fail at definition time on a fresh
-- 008-only baseline.
-- =============================================================================

ALTER TABLE confidence_scores
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS source_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_source_quality DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS open_flag_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_human_audit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recomputed_at TIMESTAMPTZ DEFAULT NOW();

-- The (entity_type, entity_id) UNIQUE constraint required for ON CONFLICT
-- upserts in recompute_confidence is delivered by migration 014 (ETNI-22)
-- as a full UNIQUE constraint. 014 is a hard prerequisite for 015 — we do
-- not attempt to create the constraint defensively here.


-- =============================================================================
-- 1. Function: recompute_confidence(entity_type, entity_id)
-- -----------------------------------------------------------------------------
-- Reads the current state of the trust fabric for a given entity and writes
-- a derived row into confidence_scores. Pure read-then-upsert: it never
-- modifies the source data.
--
-- Score formula (intentionally simple — KISS, AR3):
--   score = clamp(
--     0.50 * normalize(source_count, target = 5)
--     + 0.30 * coalesce(avg_source_quality, 0)
--     + 0.20 * recency_factor(last_human_audit_at)
--     - 0.10 * open_flag_pressure(open_flag_count)
--   , 0, 1)
--
--   normalize(n, t) = LEAST(n::numeric / t, 1)
--   recency_factor : 1.0 if audited within 365 days, decays linearly to 0
--                    over the following year, 0 beyond two years (or NULL).
--   open_flag_pressure : LEAST(n::numeric / 5, 1)
--
-- The formula is deliberately documented in code so reviewers can challenge
-- the weighting in subsequent stories without spelunking through history.
-- =============================================================================

CREATE OR REPLACE FUNCTION recompute_confidence(
  p_entity_type TEXT,
  p_entity_id   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_source_count        INTEGER := 0;
  v_avg_source_quality  DECIMAL(3,2);
  v_open_flag_count     INTEGER := 0;
  v_last_audit          TIMESTAMPTZ;
  v_recency_factor      NUMERIC := 0;
  v_score               DECIMAL(3,2);
  v_now                 TIMESTAMPTZ := NOW();
BEGIN
  IF p_entity_type IS NULL OR p_entity_id IS NULL THEN
    RETURN;
  END IF;

  -- Source count + average source quality, derived from assertions linked to
  -- this entity. Post-014, assertions reference sources via source_ids UUID[]
  -- (LATERAL UNNEST) and source "quality" is derived from sources.tier
  -- (primary=1.0, secondary=0.7, tertiary=0.4, ai-enriched=0.2). The count
  -- below counts distinct sources backing this entity.
  SELECT
    COUNT(DISTINCT s.id)::INTEGER,
    AVG(
      CASE s.tier
        WHEN 'primary'     THEN 1.0
        WHEN 'secondary'   THEN 0.7
        WHEN 'tertiary'    THEN 0.4
        WHEN 'ai-enriched' THEN 0.2
      END
    )::DECIMAL(3,2)
  INTO
    v_source_count,
    v_avg_source_quality
  FROM assertions a
  LEFT JOIN LATERAL UNNEST(COALESCE(a.source_ids, '{}'::UUID[])) AS src_id ON true
  LEFT JOIN sources s ON s.id = src_id
  WHERE a.entity_type = p_entity_type
    AND a.entity_id   = p_entity_id;

  -- Open-flag pressure: every non-resolved flag is a debt against confidence.
  SELECT COUNT(*)::INTEGER
  INTO   v_open_flag_count
  FROM   flags
  WHERE  entity_type = p_entity_type
    AND  entity_id   = p_entity_id
    AND  status      = 'open';

  -- Last human audit: pulled from any pre-existing row to preserve audit
  -- continuity. If 014 has not been applied this column may not exist; the
  -- defensive ALTER TABLE above guarantees it does.
  SELECT cs.last_human_audit_at
  INTO   v_last_audit
  FROM   confidence_scores cs
  WHERE  cs.entity_type = p_entity_type
    AND  cs.entity_id   = p_entity_id
  LIMIT  1;

  -- Recency factor: 1.0 within a year, linear decay over the second year,
  -- 0 beyond two years (or never audited).
  IF v_last_audit IS NOT NULL THEN
    v_recency_factor := GREATEST(
      0,
      LEAST(
        1,
        1 - GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_last_audit)) / 86400 - 365) / 365
      )
    );
  END IF;

  v_score := GREATEST(
    0,
    LEAST(
      1,
      0.50 * LEAST(v_source_count::NUMERIC / 5, 1)
      + 0.30 * COALESCE(v_avg_source_quality, 0)
      + 0.20 * v_recency_factor
      - 0.10 * LEAST(v_open_flag_count::NUMERIC / 5, 1)
    )
  )::DECIMAL(3,2);

  -- Upsert. Uses (entity_type, entity_id) as the conflict target; the
  -- full UNIQUE constraint created by ETNI-22 (migration 014) backs this.
  -- Note: 014 removed the `methodology` column from confidence_scores.
  INSERT INTO confidence_scores (
    entity_type, entity_id, score, source_count, avg_source_quality,
    open_flag_count, last_human_audit_at, recomputed_at
  )
  VALUES (
    p_entity_type, p_entity_id, v_score, v_source_count, v_avg_source_quality,
    v_open_flag_count, v_last_audit, v_now
  )
  ON CONFLICT (entity_type, entity_id)
  DO UPDATE SET
    score               = EXCLUDED.score,
    source_count        = EXCLUDED.source_count,
    avg_source_quality  = EXCLUDED.avg_source_quality,
    open_flag_count     = EXCLUDED.open_flag_count,
    last_human_audit_at = COALESCE(EXCLUDED.last_human_audit_at, confidence_scores.last_human_audit_at),
    recomputed_at       = EXCLUDED.recomputed_at;
END;
$$;

COMMENT ON FUNCTION recompute_confidence(TEXT, TEXT) IS
  'Recomputes the derived confidence score for (entity_type, entity_id) by '
  'aggregating assertions, sources, open flags, and last human audit. '
  'Idempotent: safe to call repeatedly; upserts the result into confidence_scores. '
  'ETNI-23 (Story 1.3, AR3, AR15).';


-- =============================================================================
-- 2. Function: recompute_confidence_all()
-- -----------------------------------------------------------------------------
-- Iterates over every people + language-family and recomputes their score.
-- Intended for the nightly cron job. Returns the number of entities touched.
-- =============================================================================

CREATE OR REPLACE FUNCTION recompute_confidence_all()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_row    RECORD;
  v_count  INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT 'people'::TEXT AS entity_type, id::TEXT AS entity_id
    FROM   afrik_peoples
    UNION ALL
    SELECT 'language_family'::TEXT AS entity_type, id::TEXT AS entity_id
    FROM   afrik_language_families
  LOOP
    PERFORM recompute_confidence(v_row.entity_type, v_row.entity_id);
    v_count := v_count + 1;
  END LOOP;

  -- Trace the batch run in audit_log so operators can confirm the cron job
  -- ran. Action name doubles as a grep target in dashboards.
  INSERT INTO audit_log (action, entity_type, entity_id, actor_id, metadata)
  VALUES (
    'confidence_recompute_all',
    NULL, NULL, NULL,
    jsonb_build_object('entities_recomputed', v_count, 'completed_at', NOW())
  );

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION recompute_confidence_all() IS
  'Nightly batch: recomputes confidence for every people + language family. '
  'Returns the number of entities recomputed. Logs a summary row in audit_log. '
  'ETNI-23 (Story 1.3, AR3, AR15).';


-- =============================================================================
-- 3. Function: enforce_assertion_required()
-- -----------------------------------------------------------------------------
-- BEFORE UPDATE trigger function. Rejects any UPDATE that mutates a protected
-- demographic or classification field unless a matching assertions row exists
-- for the (entity_type, entity_id, field_path) tuple.
--
-- Two flavours of protected field:
--   (a) Top-level columns (e.g. classification_status). Detected by comparing
--       NEW vs OLD column values via TG_ARGV (field name and json path).
--   (b) JSONB-nested demographic fields inside `content` (e.g.
--       content.generalInfo.population, content.demographics.total_population).
--       Detected by extracting the JSONB path from NEW.content vs OLD.content.
--
-- Required assertions are matched on (entity_type, entity_id, field_path).
-- A bypass is possible only when the session-level GUC
-- `app.bypass_assertion_check` is set to 'true' (a DBA-only escape hatch),
-- which is itself logged to audit_log as an integrity override.
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_assertion_required()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_entity_type   TEXT;
  v_entity_id     TEXT;
  v_field_path    TEXT;
  v_changed_paths TEXT[] := ARRAY[]::TEXT[];
  v_bypass        TEXT;
  v_has_assertion BOOLEAN;
BEGIN
  -- Resolve entity_type from the table the trigger is attached to.
  IF TG_TABLE_NAME = 'afrik_peoples' THEN
    v_entity_type := 'people';
  ELSIF TG_TABLE_NAME = 'afrik_language_families' THEN
    v_entity_type := 'language_family';
  ELSE
    -- Trigger attached to an unexpected table: do not block, just return.
    RETURN NEW;
  END IF;

  v_entity_id := NEW.id::TEXT;

  -- ---------------------------------------------------------------------------
  -- Detect changes to protected top-level columns.
  -- classification_status is currently the only one (added in migration 009).
  -- ---------------------------------------------------------------------------
  IF (NEW.classification_status IS DISTINCT FROM OLD.classification_status) THEN
    v_changed_paths := array_append(v_changed_paths, 'classification_status');
  END IF;

  -- ---------------------------------------------------------------------------
  -- Detect changes to protected JSONB demographic paths inside `content`.
  -- The list intentionally covers both modern (demographics.total_population)
  -- and legacy (generalInfo.population) shapes that appear in current AFRIK
  -- JSON. Any change to a protected path requires a matching assertion.
  -- ---------------------------------------------------------------------------
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    -- Helper inline checks: only flag a path as changed when the value
    -- actually differs (a no-op JSONB rewrite of the same value passes).
    IF (NEW.content #> '{demographics,total_population}')
       IS DISTINCT FROM (OLD.content #> '{demographics,total_population}') THEN
      v_changed_paths := array_append(v_changed_paths, 'content.demographics.total_population');
    END IF;

    IF (NEW.content #> '{demographics,distribution}')
       IS DISTINCT FROM (OLD.content #> '{demographics,distribution}') THEN
      v_changed_paths := array_append(v_changed_paths, 'content.demographics.distribution');
    END IF;

    IF (NEW.content #> '{generalInfo,population}')
       IS DISTINCT FROM (OLD.content #> '{generalInfo,population}') THEN
      v_changed_paths := array_append(v_changed_paths, 'content.generalInfo.population');
    END IF;

    IF (NEW.content #> '{classification}')
       IS DISTINCT FROM (OLD.content #> '{classification}') THEN
      v_changed_paths := array_append(v_changed_paths, 'content.classification');
    END IF;
  END IF;

  -- Nothing protected changed → allow.
  IF array_length(v_changed_paths, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- ---------------------------------------------------------------------------
  -- DBA override path. Setting the session GUC
  --   SET LOCAL app.bypass_assertion_check = 'true';
  -- allows a one-off bulk operation to proceed, but the bypass MUST be logged
  -- so audits can find it. This is the explicit DBA action mentioned in the
  -- ticket ("no override without explicit DBA action, logged in audit_log").
  -- ---------------------------------------------------------------------------
  BEGIN
    v_bypass := current_setting('app.bypass_assertion_check', true);
  EXCEPTION WHEN OTHERS THEN
    v_bypass := NULL;
  END;

  IF v_bypass = 'true' THEN
    INSERT INTO audit_log (action, entity_type, entity_id, actor_id, metadata)
    VALUES (
      'integrity_override_assertion_required',
      v_entity_type,
      v_entity_id,
      auth.uid(),
      jsonb_build_object(
        'changed_paths',  to_jsonb(v_changed_paths),
        'override_reason','app.bypass_assertion_check=true',
        'overridden_at',  NOW()
      )
    );
    RETURN NEW;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Enforce: every changed protected path must have a backing assertion.
  -- We short-circuit on the first missing path to surface a precise error.
  -- ---------------------------------------------------------------------------
  FOREACH v_field_path IN ARRAY v_changed_paths LOOP
    SELECT EXISTS (
      SELECT 1
      FROM   assertions
      WHERE  entity_type = v_entity_type
        AND  entity_id   = v_entity_id
        AND  field_path  = v_field_path
    )
    INTO v_has_assertion;

    IF NOT v_has_assertion THEN
      RAISE EXCEPTION
        'Integrity check failed: UPDATE on %.% requires an assertion row '
        'for field_path "%". Insert into assertions(entity_type, entity_id, '
        'field_path, statement, source_ids) first, or set LOCAL '
        'app.bypass_assertion_check = ''true'' for a logged DBA override.',
        TG_TABLE_NAME, v_entity_id, v_field_path
        USING ERRCODE = 'check_violation',
              HINT    = 'Every demographic or classification change must be '
                        'backed by a sourced assertion (AR3, ETNI-23).';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION enforce_assertion_required() IS
  'BEFORE UPDATE trigger function: blocks demographic / classification mutations '
  'on afrik_peoples + afrik_language_families unless a matching assertions row '
  'exists. DBA override via session GUC app.bypass_assertion_check is logged to '
  'audit_log. ETNI-23 (Story 1.3, AR3).';


-- =============================================================================
-- 4. Triggers wiring enforce_assertion_required onto the protected tables
-- -----------------------------------------------------------------------------
-- Note on OF column lists: we cannot use `BEFORE UPDATE OF content` plus
-- `BEFORE UPDATE OF classification_status` in one trigger reliably, because
-- Postgres fires `OF` triggers only when the listed columns are mentioned in
-- the UPDATE — even if a JSONB path changes inside `content`, the trigger
-- still fires because the `content` column itself is updated. Using one
-- trigger per protected column-set keeps the wiring explicit.
-- =============================================================================

DROP TRIGGER IF EXISTS afrik_peoples_assertion_required ON afrik_peoples CASCADE;
CREATE TRIGGER afrik_peoples_assertion_required
  BEFORE UPDATE OF classification_status, content
  ON afrik_peoples
  FOR EACH ROW
  EXECUTE FUNCTION enforce_assertion_required();

COMMENT ON TRIGGER afrik_peoples_assertion_required ON afrik_peoples IS
  'Blocks demographic / classification UPDATEs without a matching assertions row. '
  'ETNI-23.';

DROP TRIGGER IF EXISTS afrik_language_families_assertion_required ON afrik_language_families CASCADE;
CREATE TRIGGER afrik_language_families_assertion_required
  BEFORE UPDATE OF classification_status, content
  ON afrik_language_families
  FOR EACH ROW
  EXECUTE FUNCTION enforce_assertion_required();

COMMENT ON TRIGGER afrik_language_families_assertion_required ON afrik_language_families IS
  'Blocks demographic / classification UPDATEs without a matching assertions row. '
  'ETNI-23.';


-- =============================================================================
-- 5. Trigger: revisions → recompute_confidence
-- -----------------------------------------------------------------------------
-- Whenever a new revision is recorded for an entity, recompute its confidence.
-- AFTER INSERT keeps the recompute outside the writer's transaction-critical
-- path; if recompute itself errors, the revision insert still rolls back.
-- =============================================================================

CREATE OR REPLACE FUNCTION trg_revisions_recompute_confidence()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.entity_type IS NOT NULL AND NEW.entity_id IS NOT NULL THEN
    PERFORM recompute_confidence(NEW.entity_type, NEW.entity_id);
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trg_revisions_recompute_confidence() IS
  'AFTER INSERT trigger function on revisions: recomputes confidence for the '
  'affected entity. ETNI-23.';

DROP TRIGGER IF EXISTS revisions_recompute_confidence ON revisions CASCADE;
CREATE TRIGGER revisions_recompute_confidence
  AFTER INSERT ON revisions
  FOR EACH ROW
  EXECUTE FUNCTION trg_revisions_recompute_confidence();

COMMENT ON TRIGGER revisions_recompute_confidence ON revisions IS
  'Calls recompute_confidence for the entity whenever a new revision is recorded. '
  'ETNI-23.';


-- =============================================================================
-- 6. Trigger: flags status change → recompute_confidence
-- -----------------------------------------------------------------------------
-- Fires only when `status` transitions into or out of 'open'. Other status
-- changes (e.g. 'resolved' → 'dismissed') do not move the open_flag_count
-- and so do not need a recompute.
-- =============================================================================

CREATE OR REPLACE FUNCTION trg_flags_recompute_confidence()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_was_open BOOLEAN := (OLD.status IS NOT DISTINCT FROM 'open');
  v_is_open  BOOLEAN := (NEW.status IS NOT DISTINCT FROM 'open');
BEGIN
  IF v_was_open IS DISTINCT FROM v_is_open
     AND NEW.entity_type IS NOT NULL
     AND NEW.entity_id   IS NOT NULL
  THEN
    PERFORM recompute_confidence(NEW.entity_type, NEW.entity_id);
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trg_flags_recompute_confidence() IS
  'AFTER UPDATE trigger function on flags: recomputes confidence when status '
  'transitions into or out of "open". ETNI-23.';

DROP TRIGGER IF EXISTS flags_recompute_confidence ON flags CASCADE;
CREATE TRIGGER flags_recompute_confidence
  AFTER UPDATE OF status ON flags
  FOR EACH ROW
  EXECUTE FUNCTION trg_flags_recompute_confidence();

COMMENT ON TRIGGER flags_recompute_confidence ON flags IS
  'Recomputes confidence when a flag transitions into or out of "open". '
  'ETNI-23.';


-- =============================================================================
-- 7. Optional nightly schedule via pg_cron
-- -----------------------------------------------------------------------------
-- If the pg_cron extension is installed (Supabase: yes), schedule the nightly
-- batch at 03:17 UTC. If unavailable, this block is a no-op and the deploy
-- environment must wire `SELECT recompute_confidence_all();` to its own
-- scheduler (e.g. GitHub Actions cron, a Supabase Edge Function on a timer).
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
  ) THEN
    BEGIN
      -- Ensure the extension exists. Wrapped in a sub-block so a missing
      -- privilege does not abort the whole migration.
      CREATE EXTENSION IF NOT EXISTS pg_cron;

      -- Unschedule a previous incarnation, if any, so re-running this
      -- migration does not pile duplicate cron rows. cron.unschedule accepts
      -- a jobname in recent pg_cron versions; we wrap in a sub-block to make
      -- the unschedule no-op when the job is not yet present.
      BEGIN
        PERFORM cron.unschedule('recompute_confidence_nightly');
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      PERFORM cron.schedule(
        'recompute_confidence_nightly',
        '17 3 * * *',
        $cron$ SELECT recompute_confidence_all(); $cron$
      );

      RAISE NOTICE 'Scheduled recompute_confidence_nightly via pg_cron at 03:17 UTC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron available but scheduling failed (%); '
                   'fall back to external scheduler.', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pg_cron not available — schedule recompute_confidence_all() '
                 'externally (e.g. Supabase Edge Function cron, GitHub Actions).';
  END IF;
END $$;
