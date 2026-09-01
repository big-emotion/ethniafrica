-- Migration 072 — shape gate for people.content.historicalAffiliation (REQ-127)
--
-- Peoples with no defensible linguistic-family affiliation to an African
-- family (e.g. Creole-speaking groups, whose language Glottolog classifies
-- under its lexifier) carry a distinct historicalAffiliation section in
-- their fiche content, sourced and tiered independently of the rest of the
-- fiche's sources array. This mirrors, at the database boundary, the same
-- shape checkHistoricalAffiliationModel (FR111) enforces on the JSON corpus:
-- when the section is present, it must carry a non-empty description and a
-- non-empty sources array whose every entry has a valid tier.
--
-- historicalAffiliation is a fiche-content field, not a normalized source
-- row, so it is deliberately outside recompute_confidence() and the
-- assertions/sources tables — this constraint only guards content shape.
--
-- Idempotent: CREATE OR REPLACE plus DROP CONSTRAINT IF EXISTS / ADD
-- CONSTRAINT can be run repeatedly. Rollout remains manual: recette first,
-- production second.

CREATE OR REPLACE FUNCTION validate_people_historical_affiliation(p_content JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  v_section JSONB;
  v_source JSONB;
BEGIN
  v_section := p_content -> 'historicalAffiliation';

  IF v_section IS NULL OR v_section = 'null'::JSONB THEN
    RETURN TRUE;
  END IF;

  IF jsonb_typeof(v_section -> 'description') <> 'string'
    OR length(trim(v_section ->> 'description')) = 0 THEN
    RETURN FALSE;
  END IF;

  IF jsonb_typeof(v_section -> 'sources') <> 'array'
    OR jsonb_array_length(v_section -> 'sources') = 0 THEN
    RETURN FALSE;
  END IF;

  FOR v_source IN SELECT * FROM jsonb_array_elements(v_section -> 'sources')
  LOOP
    IF NOT (v_source ->> 'tier' IN ('official', 'referenced', 'unverified')) THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_people_historical_affiliation(JSONB) IS
  'True when content has no historicalAffiliation section, or when the '
  'section carries a non-empty description and a non-empty sources array '
  'whose every entry has an official/referenced/unverified tier. REQ-127.';

ALTER TABLE afrik_peoples DROP CONSTRAINT IF EXISTS people_historical_affiliation_shape;

ALTER TABLE afrik_peoples
  ADD CONSTRAINT people_historical_affiliation_shape
  CHECK (validate_people_historical_affiliation(content));
