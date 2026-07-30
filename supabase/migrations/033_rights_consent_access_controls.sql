-- ETNI-669: Rights, consent, and access controls for protected records.
-- This migration is additive and deliberately keeps protected content private.

CREATE TABLE IF NOT EXISTS protected_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type TEXT NOT NULL,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  public_summary TEXT,
  storage_bucket TEXT NOT NULL DEFAULT 'protected-records',
  storage_path TEXT,
  restricted_transcript TEXT,
  consent_evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
  rights_basis TEXT NOT NULL,
  consent_scope TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  embargo_until TIMESTAMPTZ,
  retention_until TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  community_review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT protected_records_record_type_check
    CHECK (record_type IN ('reference_asset', 'oral_narrative')),
  CONSTRAINT protected_records_visibility_check
    CHECK (visibility IN ('private', 'editorial', 'public')),
  CONSTRAINT protected_records_consent_scope_check
    CHECK (consent_scope IN ('recording', 'editorial', 'public')),
  CONSTRAINT protected_records_community_review_status_check
    CHECK (community_review_status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT protected_records_storage_path_check
    CHECK (
      (record_type = 'reference_asset' AND storage_path IS NOT NULL)
      OR (record_type = 'oral_narrative' AND storage_path IS NULL)
    )
);

COMMENT ON TABLE protected_records IS
  'Private rights and consent boundary for protected binaries and oral narratives. ETNI-669.';

CREATE INDEX IF NOT EXISTS idx_protected_records_source_id
  ON protected_records (source_id);
CREATE INDEX IF NOT EXISTS idx_protected_records_access_state
  ON protected_records (visibility, embargo_until, withdrawn_at);

CREATE TABLE IF NOT EXISTS protected_record_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protected_record_id UUID NOT NULL REFERENCES protected_records(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  previous_state JSONB NOT NULL DEFAULT '{}'::JSONB,
  next_state JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE protected_record_audit IS
  'Append-only access-state transitions. It intentionally excludes protected reasons, evidence, paths, transcripts, and PII. ETNI-669.';

CREATE INDEX IF NOT EXISTS idx_protected_record_audit_record_id
  ON protected_record_audit (protected_record_id, created_at DESC);

CREATE OR REPLACE FUNCTION protected_record_audit_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'protected_record_audit rows are append-only';
END;
$$;

DROP TRIGGER IF EXISTS protected_record_audit_no_update ON protected_record_audit;
CREATE TRIGGER protected_record_audit_no_update
  BEFORE UPDATE ON protected_record_audit
  FOR EACH ROW
  EXECUTE FUNCTION protected_record_audit_append_only();

DROP TRIGGER IF EXISTS protected_record_audit_no_delete ON protected_record_audit;
CREATE TRIGGER protected_record_audit_no_delete
  BEFORE DELETE ON protected_record_audit
  FOR EACH ROW
  EXECUTE FUNCTION protected_record_audit_append_only();

CREATE OR REPLACE FUNCTION protected_record_public_state(record protected_records)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'rightsBasis', record.rights_basis,
    'consentScope', record.consent_scope,
    'visibility', record.visibility,
    'embargoUntil', record.embargo_until,
    'retentionUntil', record.retention_until,
    'withdrawnAt', record.withdrawn_at,
    'communityReviewStatus', record.community_review_status
  );
$$;

CREATE OR REPLACE FUNCTION log_protected_record_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO protected_record_audit (
      protected_record_id,
      actor_id,
      action,
      next_state
    ) VALUES (
      NEW.id,
      auth.uid(),
      'protected_record.created',
      protected_record_public_state(NEW)
    );
  ELSIF protected_record_public_state(OLD) IS DISTINCT FROM protected_record_public_state(NEW) THEN
    INSERT INTO protected_record_audit (
      protected_record_id,
      actor_id,
      action,
      previous_state,
      next_state
    ) VALUES (
      NEW.id,
      auth.uid(),
      'protected_record.access_state_changed',
      protected_record_public_state(OLD),
      protected_record_public_state(NEW)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protected_records_audit_access_state ON protected_records;
CREATE TRIGGER protected_records_audit_access_state
  AFTER INSERT OR UPDATE ON protected_records
  FOR EACH ROW
  EXECUTE FUNCTION log_protected_record_state_change();

CREATE OR REPLACE FUNCTION is_protected_records_editor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('moderator', 'admin')
  );
$$;

ALTER TABLE protected_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE protected_record_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS protected_records_editorial_select ON protected_records;
CREATE POLICY protected_records_editorial_select ON protected_records
  FOR SELECT
  USING (is_protected_records_editor());

DROP POLICY IF EXISTS protected_record_audit_editorial_select ON protected_record_audit;
CREATE POLICY protected_record_audit_editorial_select ON protected_record_audit
  FOR SELECT
  USING (is_protected_records_editor());

INSERT INTO storage.buckets (id, name, public)
VALUES ('protected-records', 'protected-records', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS protected_records_storage_editorial_select ON storage.objects;
CREATE POLICY protected_records_storage_editorial_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'protected-records'
    AND is_protected_records_editor()
  );
