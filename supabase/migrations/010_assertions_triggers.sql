-- Migration 010: Assertions Triggers
-- Creates triggers for assertion lifecycle management:
-- - Automatic revision tracking on assertion content changes
-- - Auto-increment revision numbering per entity

-- ============================================
-- 1. AUTO-INCREMENT REVISION NUMBER FUNCTION
-- ============================================

-- Function to calculate the next revision number for an entity
-- Returns 1 if no previous revisions exist, otherwise max + 1
CREATE OR REPLACE FUNCTION mz_next_revision_number(
  p_entity_type TEXT,
  p_entity_id VARCHAR(50)
)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(revision_number), 0) + 1
  INTO next_num
  FROM mz_revisions
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id;
  
  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mz_next_revision_number(TEXT, VARCHAR) IS 
  'Calculates the next revision number for a given entity_type and entity_id pair';

-- ============================================
-- 2. REVISION TRACKING TRIGGER FUNCTION
-- ============================================

-- Function to automatically create a revision entry when assertion content changes
-- Captures previous_content, new_content, and auto-calculates revision_number
CREATE OR REPLACE FUNCTION mz_track_assertion_revision()
RETURNS TRIGGER AS $$
DECLARE
  next_rev_num INTEGER;
BEGIN
  -- Only create revision if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    -- Calculate next revision number
    next_rev_num := mz_next_revision_number(NEW.entity_type, NEW.entity_id);
    
    -- Insert revision record
    INSERT INTO mz_revisions (
      entity_type,
      entity_id,
      revision_number,
      previous_content,
      new_content,
      change_summary,
      created_by,
      created_at
    ) VALUES (
      NEW.entity_type,
      NEW.entity_id,
      next_rev_num,
      OLD.content,  -- NULL for first revision is handled naturally
      NEW.content,
      'Automatic revision from assertion update',
      NEW.created_by,  -- Use the assertion's created_by as revision author
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mz_track_assertion_revision() IS 
  'Trigger function that creates a revision entry when mz_assertions.content changes';

-- ============================================
-- 3. TIMESTAMP PROPAGATION TRIGGER FUNCTION
-- ============================================

-- Function to propagate updated_at to related confidence scores
-- This allows downstream systems to know when assertion data changed
CREATE OR REPLACE FUNCTION mz_propagate_assertion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Update evaluated_at on related confidence scores to signal freshness recalculation may be needed
  -- Only propagate if content changed (not just metadata updates)
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    UPDATE mz_confidence_scores
    SET evaluated_at = NOW()
    WHERE assertion_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mz_propagate_assertion_timestamp() IS 
  'Trigger function that updates evaluated_at on related confidence scores when assertion content changes';

-- ============================================
-- 4. CREATE TRIGGERS
-- ============================================

-- Revision tracking trigger on mz_assertions
-- Fires BEFORE UPDATE to capture content changes
DROP TRIGGER IF EXISTS mz_assertion_revision_tracking ON mz_assertions;
CREATE TRIGGER mz_assertion_revision_tracking
  BEFORE UPDATE ON mz_assertions
  FOR EACH ROW
  EXECUTE FUNCTION mz_track_assertion_revision();

COMMENT ON TRIGGER mz_assertion_revision_tracking ON mz_assertions IS 
  'Automatically creates a revision entry in mz_revisions when assertion content changes';

-- Timestamp propagation trigger on mz_assertions
-- Fires AFTER UPDATE to propagate changes to related tables
DROP TRIGGER IF EXISTS mz_assertion_timestamp_propagation ON mz_assertions;
CREATE TRIGGER mz_assertion_timestamp_propagation
  AFTER UPDATE ON mz_assertions
  FOR EACH ROW
  EXECUTE FUNCTION mz_propagate_assertion_timestamp();

COMMENT ON TRIGGER mz_assertion_timestamp_propagation ON mz_assertions IS 
  'Propagates updated_at timestamp to related confidence scores when assertion content changes';

-- ============================================
-- 5. HELPER FUNCTION FOR MANUAL REVISION CREATION
-- ============================================

-- Helper function to manually create a revision with auto-calculated revision number
-- Useful for creating initial revisions or revisions from external processes
CREATE OR REPLACE FUNCTION mz_create_revision(
  p_entity_type TEXT,
  p_entity_id VARCHAR(50),
  p_previous_content JSONB,
  p_new_content JSONB,
  p_change_summary TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  revision_id UUID;
  next_rev_num INTEGER;
BEGIN
  next_rev_num := mz_next_revision_number(p_entity_type, p_entity_id);
  
  INSERT INTO mz_revisions (
    entity_type,
    entity_id,
    revision_number,
    previous_content,
    new_content,
    change_summary,
    created_by,
    created_at
  ) VALUES (
    p_entity_type,
    p_entity_id,
    next_rev_num,
    p_previous_content,
    p_new_content,
    p_change_summary,
    p_created_by,
    NOW()
  )
  RETURNING id INTO revision_id;
  
  RETURN revision_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mz_create_revision(TEXT, VARCHAR, JSONB, JSONB, TEXT, UUID) IS 
  'Helper function to manually create a revision with auto-calculated revision number';
