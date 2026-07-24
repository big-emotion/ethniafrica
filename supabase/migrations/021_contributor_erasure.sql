CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.contributor_profiles
  ADD COLUMN IF NOT EXISTS age_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.flags
  ADD COLUMN IF NOT EXISTS contributor_display_name_snapshot TEXT;

CREATE OR REPLACE FUNCTION public.erase_contributor_account(
  target_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  erasure_timestamp TIMESTAMPTZ := clock_timestamp();
  user_id_hash TEXT;
  has_id BOOLEAN;
  has_user_id BOOLEAN;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'A contributor user ID is required';
  END IF;

  user_id_hash := encode(
    extensions.digest(target_user_id::TEXT, 'sha256'),
    'hex'
  );

  UPDATE public.flags
  SET
    contributor_id = NULL,
    contributor_display_name_snapshot = NULL
  WHERE contributor_id = target_user_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contributor_profiles'
      AND column_name = 'id'
  )
  INTO has_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contributor_profiles'
      AND column_name = 'user_id'
  )
  INTO has_user_id;

  IF has_id THEN
    EXECUTE 'DELETE FROM public.contributor_profiles WHERE id = $1'
      USING target_user_id;
  END IF;

  IF has_user_id THEN
    EXECUTE 'DELETE FROM public.contributor_profiles WHERE user_id = $1'
      USING target_user_id;
  END IF;

  DELETE FROM auth.users
  WHERE id = target_user_id;

  INSERT INTO public.audit_log (
    action,
    entity_type,
    metadata,
    created_at
  )
  VALUES (
    'contributor_erased',
    'contributor',
    jsonb_build_object(
      'erased_at', erasure_timestamp,
      'user_id_hash', user_id_hash
    ),
    erasure_timestamp
  );
END;
$$;

REVOKE ALL ON FUNCTION public.erase_contributor_account(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.erase_contributor_account(UUID)
  FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erase_contributor_account(UUID)
  TO service_role;
