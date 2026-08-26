-- Migration 041: one source-tier vocabulary
-- =============================================================================
-- Collapses the three overlapping tier vocabularies onto one three-value scale:
--
--   official   (1.0)  UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA,
--                     national statistics institutes
--   referenced (0.7)  published, identifiable, verifiable work
--   unverified (0.4)  aggregators, tertiary encyclopedias, blogs, community
--                     accounts, AI-generated text
--
-- Nothing is forbidden any more; the tier carries the signal. What used to be
-- refused is now published and labelled.
--
-- Retired by this migration:
--   * sources.tier IN ('primary','secondary','tertiary','ai-enriched')  (015)
--   * sources.evidence_tier SMALLINT IN (1,2)                           (031)
--
-- Kept: sources.source_kind. Tier is authority, source_kind is provenance, and
-- they are orthogonal. 'ai-enriched' was a fusion of the two; it splits into
-- tier 'unverified' + source_kind 'ai_generated', and recompute_confidence()
-- multiplies rather than branches — 0.4 x 0.5 = 0.2 reproduces the old weight.
--
-- Idempotent: re-running this migration must not error.
--
-- Two-step rollout: recette first, production second (both Supabase projects
-- are labelled "production"; applying one and calling it done has bitten
-- before).
-- =============================================================================

-- =============================================================================
-- 1. sources.tier — widen, migrate, narrow
-- =============================================================================

-- 1a. Widen: drop the 015 CHECK so both vocabularies are briefly legal.
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_tier_check;

-- 1b. Preserve AI provenance before the tier that carried it disappears.
--     Rows already carrying a source_kind keep it: source_kind is authoritative
--     for provenance, tier never was.
UPDATE sources
SET    source_kind = 'ai_generated'
WHERE  tier = 'ai-enriched'
  AND  source_kind IS NULL;

-- 1c. Migrate the tier values themselves.
UPDATE sources SET tier = 'official'   WHERE tier = 'primary';
UPDATE sources SET tier = 'referenced' WHERE tier = 'secondary';
UPDATE sources SET tier = 'unverified' WHERE tier IN ('tertiary', 'ai-enriched');

-- 1d. Fold the numeric axis in before dropping it (see section 2). A row that
--     was never given a text tier but does carry an evidence_tier keeps that
--     information: 1 -> official, 2 -> referenced.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sources' AND column_name = 'evidence_tier'
  ) THEN
    EXECUTE $sql$
      UPDATE sources
      SET    tier = CASE evidence_tier
                      WHEN 1 THEN 'official'
                      WHEN 2 THEN 'referenced'
                    END
      WHERE  tier IS NULL
        AND  evidence_tier IN (1, 2)
    $sql$;
  END IF;
END $$;

-- 1e. Narrow: only the three new values from here on.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sources_tier_check'
  ) THEN
    ALTER TABLE sources
      ADD CONSTRAINT sources_tier_check
      CHECK (tier IS NULL OR tier IN ('official', 'referenced', 'unverified'));
  END IF;
END $$;

COMMENT ON COLUMN sources.tier IS
  'Authority the source carries: official | referenced | unverified. '
  'Orthogonal to source_kind, which records provenance.';

-- =============================================================================
-- 2. sources.evidence_tier — drop the competing column
-- -----------------------------------------------------------------------------
-- Added by 031 as a second tier axis that cannot express "unverified": every
-- weak citation had to be NULL, which is indistinguishable from "not yet
-- classified". Its information was folded into sources.tier at 1d.
-- =============================================================================

ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_evidence_tier_check;
ALTER TABLE sources DROP COLUMN IF EXISTS evidence_tier;

-- =============================================================================
-- 3. recompute_confidence() — three-branch CASE x provenance multiplier
-- -----------------------------------------------------------------------------
-- Replaces the four-branch CASE from 016. Only the source-quality expression
-- changes; the rest of the function is reproduced verbatim so the whole body
-- stays readable in one place, as CREATE OR REPLACE requires.
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

  -- Source quality is the tier weight scaled by provenance: machine-written
  -- text halves the weight of whatever tier it sits at, so an AI source scores
  -- 0.4 x 0.5 = 0.2 — the weight the retired 'ai-enriched' tier carried.
  SELECT
    COUNT(DISTINCT s.id)::INTEGER,
    AVG(
      CASE s.tier
        WHEN 'official'   THEN 1.0
        WHEN 'referenced' THEN 0.7
        WHEN 'unverified' THEN 0.4
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
  'Source quality = tier weight (official 1.0 / referenced 0.7 / unverified 0.4) '
  'x 0.5 when source_kind = ''ai_generated''. Idempotent. ETNI-23, updated by 041.';

-- =============================================================================
-- 4. enforce_name_record_sources() — recreate with the new literals
-- -----------------------------------------------------------------------------
-- 029 embedded tier IN ('primary', 'secondary') in this trigger function's
-- body. Left as-is, section 1 would make the predicate match nothing and the
-- trigger would reject every name_records insert and update. The rule itself
-- is unchanged: a name record must rest on an assertion cited to a source that
-- carries authority of its own.
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_name_record_sources()
RETURNS TRIGGER AS $$
DECLARE
  v_qualifying_source_count INTEGER;
BEGIN
  IF NEW.assertion_id IS NULL THEN
    RAISE EXCEPTION
      'name_records row rejected: assertion_id is required (source or drop, FR57).'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(DISTINCT s.id)
  INTO v_qualifying_source_count
  FROM assertions a
  LEFT JOIN LATERAL UNNEST(COALESCE(a.source_ids, '{}'::UUID[])) AS src_id ON true
  LEFT JOIN sources s ON s.id = src_id
  WHERE a.id = NEW.assertion_id
    AND s.tier IN ('official', 'referenced');

  IF COALESCE(v_qualifying_source_count, 0) = 0 THEN
    RAISE EXCEPTION
      'name_records row rejected: assertion % cites no official or referenced source (source or drop, FR57).',
      NEW.assertion_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enforce_name_record_sources() IS
  'BEFORE INSERT OR UPDATE trigger function: rejects name_records rows with a '
  'null assertion_id or whose assertion cites no official or referenced source. '
  'ETNI-465 (Epic 8, FR57, AR3 pattern), retiered by 041.';

COMMENT ON TABLE name_records IS
  'Structured per-name etymology records (endonyms, exonyms, historical '
  'spellings, surnames) attached to Module 0 assertions cited to an official '
  'or referenced source. entity_type/entity_id follow the polymorphic Module 0 '
  'fabric convention; v1 populates entity_type=''people'' only. ETNI-465.';

COMMENT ON TRIGGER name_records_source_or_drop ON name_records IS
  'Enforces "source or drop": rejects rows without an official- or '
  'referenced-sourced assertion. ETNI-465.';
