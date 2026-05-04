-- Migration 010: Assertions Triggers
-- Creates triggers for automatic timestamp updates and audit logging
-- for assertions, sources, and editorial_doctrine tables.

-- =============================================================================
-- Function: update_updated_at_column
-- Updates the updated_at timestamp to current time on row modification
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function that sets updated_at to current timestamp';

-- =============================================================================
-- Trigger: assertions_updated_at_trigger
-- Automatically updates the updated_at timestamp when an assertion is modified
-- =============================================================================
DROP TRIGGER IF EXISTS assertions_updated_at_trigger ON assertions;
CREATE TRIGGER assertions_updated_at_trigger
  BEFORE UPDATE ON assertions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER assertions_updated_at_trigger ON assertions IS 'Updates updated_at timestamp when assertion is modified';

-- =============================================================================
-- Trigger: sources_updated_at_trigger
-- Automatically updates the updated_at timestamp when a source is modified
-- =============================================================================
DROP TRIGGER IF EXISTS sources_updated_at_trigger ON sources;
CREATE TRIGGER sources_updated_at_trigger
  BEFORE UPDATE ON sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER sources_updated_at_trigger ON sources IS 'Updates updated_at timestamp when source is modified';

-- =============================================================================
-- Trigger: editorial_doctrine_updated_at_trigger
-- Automatically updates the updated_at timestamp when editorial_doctrine is modified
-- =============================================================================
DROP TRIGGER IF EXISTS editorial_doctrine_updated_at_trigger ON editorial_doctrine;
CREATE TRIGGER editorial_doctrine_updated_at_trigger
  BEFORE UPDATE ON editorial_doctrine
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER editorial_doctrine_updated_at_trigger ON editorial_doctrine IS 'Updates updated_at timestamp when editorial doctrine is modified';

-- =============================================================================
-- Function: audit_assertion_changes
-- Creates audit_log entries when assertions are created, updated, or deleted
-- =============================================================================
CREATE OR REPLACE FUNCTION audit_assertion_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (action, entity_type, entity_id, metadata)
    VALUES ('assertion_created', 'assertion', NEW.id::TEXT, 
            jsonb_build_object('entity_type', NEW.entity_type, 'entity_id', NEW.entity_id));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (action, entity_type, entity_id, metadata)
    VALUES ('assertion_updated', 'assertion', NEW.id::TEXT,
            jsonb_build_object('entity_type', NEW.entity_type, 'entity_id', NEW.entity_id,
                              'old_value', OLD.value, 'new_value', NEW.value));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (action, entity_type, entity_id, metadata)
    VALUES ('assertion_deleted', 'assertion', OLD.id::TEXT,
            jsonb_build_object('entity_type', OLD.entity_type, 'entity_id', OLD.entity_id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit_assertion_changes() IS 'Trigger function that logs assertion changes to audit_log table';

-- =============================================================================
-- Trigger: assertions_audit_trigger
-- Creates an audit_log entry when assertions are inserted, updated, or deleted
-- =============================================================================
DROP TRIGGER IF EXISTS assertions_audit_trigger ON assertions;
CREATE TRIGGER assertions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON assertions
  FOR EACH ROW
  EXECUTE FUNCTION audit_assertion_changes();

COMMENT ON TRIGGER assertions_audit_trigger ON assertions IS 'Logs all assertion changes (create, update, delete) to audit_log';
