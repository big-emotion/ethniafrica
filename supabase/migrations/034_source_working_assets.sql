-- ETNI-667 — controlled working copies for the linked reference library.
--
-- Bibliographic records remain in `sources` and assertion locators remain in
-- `assertion_references` (migration 031). This table stores only protected
-- scan/OCR metadata; the binary is kept in the private Storage bucket below.

CREATE TABLE IF NOT EXISTS source_working_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_kind TEXT NOT NULL CHECK (asset_kind IN ('scan', 'ocr')),
  bucket_id TEXT NOT NULL DEFAULT 'source-working-assets'
    CHECK (bucket_id = 'source-working-assets'),
  object_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  rights_status TEXT NOT NULL DEFAULT 'private'
    CHECK (rights_status = 'private'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT source_working_assets_unique_object UNIQUE (bucket_id, object_path)
);

COMMENT ON TABLE source_working_assets IS
  'Private scan and OCR working-copy metadata linked to a bibliographic source.';
COMMENT ON COLUMN source_working_assets.rights_status IS
  'V1 only permits private working copies; public distribution requires a later moderation flow.';

CREATE INDEX IF NOT EXISTS idx_source_working_assets_source_id
  ON source_working_assets(source_id);
CREATE INDEX IF NOT EXISTS idx_source_working_assets_owner_id
  ON source_working_assets(owner_id);

ALTER TABLE source_working_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS source_working_assets_owner_select ON source_working_assets;
CREATE POLICY source_working_assets_owner_select ON source_working_assets
  FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS source_working_assets_owner_insert ON source_working_assets;
CREATE POLICY source_working_assets_owner_insert ON source_working_assets
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND split_part(object_path, '/', 1) = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS source_working_assets_owner_update ON source_working_assets;
CREATE POLICY source_working_assets_owner_update ON source_working_assets
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND split_part(object_path, '/', 1) = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS source_working_assets_owner_delete ON source_working_assets;
CREATE POLICY source_working_assets_owner_delete ON source_working_assets
  FOR DELETE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS source_working_assets_editor_manage ON source_working_assets;
CREATE POLICY source_working_assets_editor_manage ON source_working_assets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM contributor_profiles cp
      WHERE cp.user_id = auth.uid()
        AND cp.moderator_role IN ('editor', 'senior_editor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM contributor_profiles cp
      WHERE cp.user_id = auth.uid()
        AND cp.moderator_role IN ('editor', 'senior_editor', 'admin')
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('source-working-assets', 'source-working-assets', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS source_working_assets_objects_owner_select ON storage.objects;
CREATE POLICY source_working_assets_objects_owner_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'source-working-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS source_working_assets_objects_owner_insert ON storage.objects;
CREATE POLICY source_working_assets_objects_owner_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'source-working-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS source_working_assets_objects_owner_update ON storage.objects;
CREATE POLICY source_working_assets_objects_owner_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'source-working-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'source-working-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS source_working_assets_objects_owner_delete ON storage.objects;
CREATE POLICY source_working_assets_objects_owner_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'source-working-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS source_working_assets_objects_editor_manage ON storage.objects;
CREATE POLICY source_working_assets_objects_editor_manage ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'source-working-assets'
    AND EXISTS (
      SELECT 1
      FROM contributor_profiles cp
      WHERE cp.user_id = auth.uid()
        AND cp.moderator_role IN ('editor', 'senior_editor', 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'source-working-assets'
    AND EXISTS (
      SELECT 1
      FROM contributor_profiles cp
      WHERE cp.user_id = auth.uid()
        AND cp.moderator_role IN ('editor', 'senior_editor', 'admin')
    )
  );
