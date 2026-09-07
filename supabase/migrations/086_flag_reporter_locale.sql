-- =============================================================================
-- Migration 086: remember the locale used to submit a report
-- =============================================================================
-- The moderation decision can arrive long after the original request, so the
-- PATCH request made by a moderator cannot tell us which language the reporter
-- used. Store that choice on the report itself. French is both the backfill for
-- existing rows and the safe default for callers that predate the bilingual
-- request field.
-- =============================================================================

ALTER TABLE flag_reporter_contacts
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'fr';

ALTER TABLE flag_reporter_contacts
  DROP CONSTRAINT IF EXISTS flag_reporter_contacts_locale_check;

ALTER TABLE flag_reporter_contacts
  ADD CONSTRAINT flag_reporter_contacts_locale_check
  CHECK (locale IN ('en', 'fr'));

COMMENT ON COLUMN flag_reporter_contacts.locale IS
  'Locale used when the report was submitted. Drives verification and resolution e-mails; defaults to French for existing and legacy rows.';
