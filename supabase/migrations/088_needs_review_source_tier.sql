-- Migration 088: needs_review is a standing the database admits and weighs
-- =============================================================================
-- `needs_review` is a deliberate fourth standing everywhere above the database:
-- ~1 000 corpus sources carry it, `FicheSource.tier` types it, the glossary
-- labels it "En attente d'examen" / "Awaiting review", and the public API
-- documents it. 041 left the database with three values, so it had nowhere to
-- go: the provenance writer stores such a source with a NULL tier.
--
-- And a NULL tier was not merely unlabelled, it was invisible to confidence.
-- recompute_confidence()'s source-quality CASE had no ELSE, so an untiered
-- source produced NULL and AVG() skipped it. A fiche citing one official
-- source and four awaiting review averaged 1.0 — the four sources that should
-- have pulled it down contributed nothing.
--
-- Why 0.4, the unverified weight. A source nobody has ruled on cannot claim
-- more authority than the lowest tier a ruling can give: weighing it higher
-- would reward leaving sources unexamined, and weighing it lower would score
-- "not yet judged" below "judged weak", a verdict nobody reached. The label
-- keeps the two apart for the reader; the score treats them alike. An absent
-- tier gets the same weight for the same reason, since that is how the loader
-- stores needs_review today.
--
-- The ai_generated x 0.5 provenance multiplier is unchanged: tier is
-- authority, source_kind is provenance, and the two still multiply.
--
-- No source row is rewritten. Admitting the value is the schema's job; which
-- rows carry it is the loader's.
--
-- Idempotent: re-running this migration must not error.
--
-- Two-step rollout: recette on merge (migrate-recette.yml), production on the
-- next published Release (deploy-production.yml, `migrate` job). See
-- docs/runbooks/migration-state.md.
-- =============================================================================

-- =============================================================================
-- 1. sources.tier — admit needs_review
-- =============================================================================

ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_tier_check;

ALTER TABLE sources
  ADD CONSTRAINT sources_tier_check
  CHECK (tier IS NULL OR tier IN ('official', 'referenced', 'unverified', 'needs_review'));

COMMENT ON COLUMN sources.tier IS
  'Authority the source carries: official | referenced | unverified, or '
  'needs_review while nobody has ruled on it. Orthogonal to source_kind, which '
  'records provenance.';

-- =============================================================================
-- 2. recompute_confidence() — a weight for every standing
-- -----------------------------------------------------------------------------
-- Reproduces 041's definition with only the source-quality expression changed.
--
-- `SET search_path` is restated because CREATE OR REPLACE rewrites a
-- function's configuration: without it, the pin 076 applied with ALTER
-- FUNCTION would be silently dropped. Owner and EXECUTE grants survive
-- CREATE OR REPLACE, so none are restated. Security stays INVOKER, as in 041.
-- =============================================================================

CREATE OR REPLACE FUNCTION recompute_confidence(
  p_entity_type TEXT,
  p_entity_id   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
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

  -- Source quality is the tier weight scaled by provenance. `s.id IS NULL`
  -- comes first: an assertion citing nothing still yields one joined row with
  -- no source in it, and that row must stay out of the average rather than be
  -- scored as an untiered source.
  SELECT
    COUNT(DISTINCT s.id)::INTEGER,
    AVG(
      CASE
        WHEN s.id IS NULL                                       THEN NULL
        WHEN s.tier = 'official'                                THEN 1.0
        WHEN s.tier = 'referenced'                              THEN 0.7
        WHEN s.tier IS NULL OR s.tier IN ('unverified', 'needs_review') THEN 0.4
      END
      * CASE WHEN s.source_kind = 'ai_generated' THEN 0.5 ELSE 1.0 END
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
  'Recomputes the derived confidence score for (entity_type, entity_id). '
  'Source quality = tier weight (official 1.0 / referenced 0.7 / unverified, '
  'needs_review or no tier 0.4) x 0.5 when source_kind = ''ai_generated''. '
  'Idempotent. ETNI-23, updated by 041 and 088.';
