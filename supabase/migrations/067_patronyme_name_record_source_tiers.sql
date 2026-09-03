-- Migration 067 — source-tier gate for patronyme name records (REQ-133)
--
-- Per-name PAT_* fiches publish explicitly labelled weak evidence instead of
-- hiding it. Their spelling rows therefore accept all three source tiers.
-- PPL_* ethnonym name records keep the older official/referenced source gate.
-- This migration replaces only the existing trigger function; the trigger
-- installed by migration 029 continues to call it.
--
-- Idempotent: CREATE OR REPLACE changes no data and can be run repeatedly.
-- Rollout remains manual: recette first, production second.

CREATE OR REPLACE FUNCTION enforce_name_record_sources()
RETURNS TRIGGER AS $$
DECLARE
  v_qualifying_source_count INTEGER;
BEGIN
  IF NEW.assertion_id IS NULL THEN
    RAISE EXCEPTION
      'name_records row rejected: assertion_id is required (source or drop).'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(DISTINCT s.id)
  INTO v_qualifying_source_count
  FROM assertions a
  LEFT JOIN LATERAL UNNEST(COALESCE(a.source_ids, '{}'::UUID[])) AS src_id ON true
  LEFT JOIN sources s ON s.id = src_id
  WHERE a.id = NEW.assertion_id
    AND (
      (
        NEW.entity_type = 'patronyme'
        AND s.tier IN ('official', 'referenced', 'unverified')
      )
      OR (
        NEW.entity_type <> 'patronyme'
        AND s.tier IN ('official', 'referenced')
      )
    );

  IF COALESCE(v_qualifying_source_count, 0) = 0 THEN
    RAISE EXCEPTION
      'name_records row rejected: assertion % cites no qualifying explicitly tiered source for entity_type %.',
      NEW.assertion_id,
      NEW.entity_type
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enforce_name_record_sources() IS
  'BEFORE INSERT OR UPDATE trigger function. Patronyme name records accept '
  'official, referenced, or unverified sources when explicitly tiered; all '
  'other name records continue to require official or referenced evidence. '
  'REQ-133, ETNI-1705.';

COMMENT ON TRIGGER name_records_source_or_drop ON name_records IS
  'Enforces source-or-drop. Patronyme spellings accept every explicit source '
  'tier; other name records require official or referenced evidence. REQ-133.';
