-- Migration 051: atomic revision publication (ETNI-70, FR16)
-- =============================================================================
-- A PostgreSQL function is the transaction boundary: PostgREST invokes the
-- function as one statement, and any exception rolls back every mutation,
-- including the draft delete. The caller keeps its authenticated JWT so
-- auth.uid() remains authoritative; SECURITY DEFINER only grants the function
-- the table access needed to complete the transaction.
--
-- revision_drafts.draft_jsonb contract:
--   {
--     "fields": { ... complete replacement for the live row's content ... },
--     "assertions": [
--       {
--         "field_path": "content.some.path",
--         "statement": "...",
--         "position": "consensus",             // optional
--         "confidence_level": "high",          // optional
--         "source_ids": ["<sources.id>", ...]  // optional
--       }
--     ]
--   }
--
-- Migration 024 already owns the revisions AFTER INSERT pg_notify trigger.
-- This migration deliberately inserts into revisions and does not duplicate
-- that trigger; PostgreSQL delivers its notification only if this transaction
-- commits.
-- =============================================================================

CREATE OR REPLACE FUNCTION publish_revision(
  p_draft_id UUID,
  p_reason   TEXT
)
RETURNS revisions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id            UUID;
  v_moderator_role      moderator_role_type;
  v_reason              TEXT;
  v_draft               revision_drafts%ROWTYPE;
  v_draft_fields        JSONB;
  v_draft_assertions    JSONB;
  v_live_fields         JSONB;
  v_snapshot_assertions JSONB := '[]'::JSONB;
  v_replacement_assertions JSONB := '[]'::JSONB;
  v_snapshot_sources    JSONB := '[]'::JSONB;
  v_snapshot            JSONB;
  v_assertion           JSONB;
  v_existing_assertion assertions%ROWTYPE;
  v_assertion_id        UUID;
  v_field_path          TEXT;
  v_seen_field_paths    TEXT[] := '{}'::TEXT[];
  v_statement           TEXT;
  v_source_ids          UUID[];
  v_all_source_ids      UUID[] := '{}'::UUID[];
  v_revision_id         UUID := gen_random_uuid();
  v_fiche_revision_id   UUID := gen_random_uuid();
  v_doctrine_version_id UUID;
  v_version             INTEGER;
  v_fiche_version       INTEGER;
  v_published_at        TIMESTAMPTZ := NOW();
  v_linked_flag_ids     UUID[];
  v_valid_flag_count    INTEGER;
  v_revision            revisions%ROWTYPE;
BEGIN
  -- Authentication and authorization happen before any row is locked or
  -- mutated. Editors may author drafts but only senior editors and admins may
  -- publish them.
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to publish a revision.'
      USING ERRCODE = '42501';
  END IF;

  SELECT moderator_role
  INTO v_moderator_role
  FROM contributor_profiles
  WHERE user_id = v_actor_id;

  IF v_moderator_role NOT IN ('senior_editor', 'admin')
     OR v_moderator_role IS NULL THEN
    RAISE EXCEPTION 'Only senior_editor and admin may publish revisions.'
      USING ERRCODE = '42501';
  END IF;

  v_reason := btrim(COALESCE(p_reason, ''));
  IF char_length(v_reason) NOT BETWEEN 50 AND 500 THEN
    RAISE EXCEPTION 'Publication reason must contain between 50 and 500 characters.'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_draft
  FROM revision_drafts
  WHERE id = p_draft_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revision draft % does not exist.', p_draft_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_draft.entity_type NOT IN (
    'people',
    'language_family',
    'language',
    'country'
  ) THEN
    RAISE EXCEPTION 'Unsupported revision entity type: %.', v_draft.entity_type
      USING ERRCODE = '22023';
  END IF;

  v_draft_fields := v_draft.draft_jsonb -> 'fields';
  IF jsonb_typeof(v_draft_fields) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'revision_drafts.draft_jsonb.fields must be a JSON object.'
      USING ERRCODE = '22023';
  END IF;

  v_draft_assertions := COALESCE(
    v_draft.draft_jsonb -> 'assertions',
    '[]'::JSONB
  );
  IF jsonb_typeof(v_draft_assertions) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'revision_drafts.draft_jsonb.assertions must be a JSON array.'
      USING ERRCODE = '22023';
  END IF;

  v_linked_flag_ids := COALESCE(v_draft.linked_flag_ids, '{}'::UUID[]);

  -- Different moderators may hold drafts for the same entity. A transaction
  -- advisory lock serializes their max(version)+1 calculation without adding
  -- a mutable counter to the append-only revisions table.
  PERFORM pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_draft.entity_type || ':' || v_draft.entity_id,
      0
    )
  );

  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_version
  FROM revisions
  WHERE entity_type = v_draft.entity_type
    AND entity_id = v_draft.entity_id;

  -- fiche_revisions predates revisions and may already contain loader-created
  -- version 1 rows. Its counter is independent; the public version returned by
  -- this function always comes from the canonical revisions table above.
  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_fiche_version
  FROM fiche_revisions
  WHERE entity_type = v_draft.entity_type
    AND entity_id = v_draft.entity_id;

  -- editorial_doctrine stores one version chain per slug rather than a global
  -- singleton. The newest currently published, unsuperseded row is the live
  -- doctrine version captured by the existing scalar revision FK.
  SELECT id
  INTO v_doctrine_version_id
  FROM editorial_doctrine
  WHERE superseded_at IS NULL
    AND published_at IS NOT NULL
  ORDER BY published_at DESC, version DESC, id DESC
  LIMIT 1;

  IF v_doctrine_version_id IS NULL THEN
    RAISE EXCEPTION 'No published editorial doctrine is available.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Read and shape the future live state before mutations so the immutable
  -- revisions row can remain the first publication write. Only the generic
  -- JSONB content boundary is editable; table names are never caller input.
  CASE v_draft.entity_type
    WHEN 'people' THEN
      SELECT
        (to_jsonb(p) - 'content' - 'search_vector' - 'created_at' - 'updated_at')
        || jsonb_build_object('content', v_draft_fields)
      INTO v_live_fields
      FROM afrik_peoples p
      WHERE p.id = v_draft.entity_id;
    WHEN 'language_family' THEN
      SELECT
        (to_jsonb(f) - 'content' - 'created_at' - 'updated_at')
        || jsonb_build_object('content', v_draft_fields)
      INTO v_live_fields
      FROM afrik_language_families f
      WHERE f.id = v_draft.entity_id;
    WHEN 'language' THEN
      SELECT
        (to_jsonb(l) - 'content' - 'created_at' - 'updated_at')
        || jsonb_build_object('content', v_draft_fields)
      INTO v_live_fields
      FROM afrik_languages l
      WHERE l.id = v_draft.entity_id;
    WHEN 'country' THEN
      SELECT
        (to_jsonb(c) - 'content' - 'search_vector' - 'created_at' - 'updated_at')
        || jsonb_build_object('content', v_draft_fields)
      INTO v_live_fields
      FROM afrik_countries c
      WHERE c.id = v_draft.entity_id;
  END CASE;

  IF v_live_fields IS NULL THEN
    RAISE EXCEPTION 'Live % entity % does not exist.',
      v_draft.entity_type,
      v_draft.entity_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Canonicalize draft assertions before the revision insert. IDs are chosen
  -- now so snapshot_jsonb exactly matches the assertion rows inserted later.
  FOR v_assertion IN
    SELECT value
    FROM jsonb_array_elements(v_draft_assertions)
  LOOP
    IF jsonb_typeof(v_assertion) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Every draft assertion must be a JSON object.'
        USING ERRCODE = '22023';
    END IF;

    v_field_path := NULLIF(btrim(v_assertion ->> 'field_path'), '');
    v_statement := NULLIF(btrim(v_assertion ->> 'statement'), '');

    IF v_field_path IS NULL OR v_statement IS NULL THEN
      RAISE EXCEPTION 'Every draft assertion requires field_path and statement.'
        USING ERRCODE = '22023';
    END IF;

    IF v_field_path = ANY(v_seen_field_paths) THEN
      RAISE EXCEPTION 'Draft assertions must use unique field_path values.'
        USING ERRCODE = '22023';
    END IF;
    v_seen_field_paths := array_append(v_seen_field_paths, v_field_path);

    IF jsonb_typeof(COALESCE(v_assertion -> 'source_ids', '[]'::JSONB))
       IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Draft assertion source_ids must be a JSON array.'
        USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(array_agg(DISTINCT source_value::UUID), '{}'::UUID[])
    INTO v_source_ids
    FROM jsonb_array_elements_text(
      COALESCE(v_assertion -> 'source_ids', '[]'::JSONB)
    ) AS source_values(source_value);

    IF EXISTS (
      SELECT 1
      FROM unnest(v_source_ids) AS source_ids(source_id)
      LEFT JOIN sources s ON s.id = source_id
      WHERE s.id IS NULL
    ) THEN
      RAISE EXCEPTION 'A draft assertion references a source that does not exist.'
        USING ERRCODE = '23503';
    END IF;

    SELECT COALESCE(array_agg(DISTINCT source_id), '{}'::UUID[])
    INTO v_all_source_ids
    FROM unnest(v_all_source_ids || v_source_ids) AS source_ids(source_id);

    v_assertion_id := gen_random_uuid();
    v_snapshot_assertions := v_snapshot_assertions || jsonb_build_array(
      jsonb_build_object(
        'id', v_assertion_id,
        'entity_type', v_draft.entity_type,
        'entity_id', v_draft.entity_id,
        'field_path', v_field_path,
        'statement', v_statement,
        'position', v_assertion ->> 'position',
        'source_ids', to_jsonb(v_source_ids),
        'confidence_level', v_assertion ->> 'confidence_level',
        'authored_at', v_published_at,
        'authored_by', v_actor_id,
        'superseded_by', NULL,
        'fiche_revision_id', v_fiche_revision_id
      )
    );
  END LOOP;

  -- Only these canonical draft rows are inserted. Unchanged active assertions
  -- are appended to the immutable snapshot below but already exist in storage.
  v_replacement_assertions := v_snapshot_assertions;

  -- The draft carries only changed assertions. A published revision is a full
  -- snapshot, so retain every unchanged active assertion exactly as stored and
  -- include its sources in the denormalized source set. Draft field paths win
  -- because their canonical rows replace the matching active assertions below.
  FOR v_existing_assertion IN
    SELECT a.*
    FROM assertions a
    WHERE a.entity_type = v_draft.entity_type
      AND a.entity_id = v_draft.entity_id
      AND a.superseded_by IS NULL
      AND NOT (a.field_path = ANY(v_seen_field_paths))
    ORDER BY a.field_path, a.id
  LOOP
    v_snapshot_assertions := v_snapshot_assertions
      || jsonb_build_array(to_jsonb(v_existing_assertion));

    v_source_ids := COALESCE(
      v_existing_assertion.source_ids,
      '{}'::UUID[]
    );

    IF EXISTS (
      SELECT 1
      FROM unnest(v_source_ids) AS source_ids(source_id)
      LEFT JOIN sources s ON s.id = source_id
      WHERE s.id IS NULL
    ) THEN
      RAISE EXCEPTION 'An active assertion references a source that does not exist.'
        USING ERRCODE = '23503';
    END IF;

    SELECT COALESCE(array_agg(DISTINCT source_id), '{}'::UUID[])
    INTO v_all_source_ids
    FROM unnest(v_all_source_ids || v_source_ids) AS source_ids(source_id);
  END LOOP;

  SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.id), '[]'::JSONB)
  INTO v_snapshot_sources
  FROM sources s
  WHERE s.id = ANY(v_all_source_ids);

  IF cardinality(v_linked_flag_ids) > 0 THEN
    SELECT COUNT(*)
    INTO v_valid_flag_count
    FROM flags f
    WHERE f.id = ANY(v_linked_flag_ids)
      AND f.status IN ('open', 'under_review')
      AND (
        (f.entity_type = v_draft.entity_type AND f.entity_id = v_draft.entity_id)
        OR EXISTS (
          SELECT 1
          FROM assertions a
          WHERE a.id = f.assertion_id
            AND a.entity_type = v_draft.entity_type
            AND a.entity_id = v_draft.entity_id
        )
      );

    IF v_valid_flag_count <> cardinality(v_linked_flag_ids) THEN
      RAISE EXCEPTION 'Every linked flag must be open or under_review and belong to the draft entity.'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Keep live entity fields at the root for compatibility with pinned revision
  -- readers, then append the publication-only evidence and doctrine context.
  v_snapshot := v_live_fields || jsonb_build_object(
    'assertions', v_snapshot_assertions,
    'sources', v_snapshot_sources,
    'doctrine_version_id', v_doctrine_version_id
  );

  -- Migration 024's AFTER INSERT trigger queues cache_invalidate here. PostgreSQL
  -- publishes that notification only if this function commits successfully.
  INSERT INTO revisions (
    id,
    entity_type,
    entity_id,
    version,
    snapshot_jsonb,
    moderator_id,
    reason,
    published_at,
    doctrine_version_id
  )
  VALUES (
    v_revision_id,
    v_draft.entity_type,
    v_draft.entity_id,
    v_version,
    v_snapshot,
    v_actor_id,
    v_reason,
    v_published_at,
    v_doctrine_version_id
  )
  RETURNING * INTO v_revision;

  -- assertions.fiche_revision_id is NOT NULL. This companion row preserves
  -- the existing typed FK while the revisions row remains the canonical,
  -- immutable public snapshot.
  INSERT INTO fiche_revisions (
    id,
    entity_type,
    entity_id,
    version,
    content_snapshot,
    published_at
  )
  VALUES (
    v_fiche_revision_id,
    v_draft.entity_type,
    v_draft.entity_id,
    v_fiche_version,
    v_snapshot,
    v_published_at
  );

  -- assertions has no natural-key uniqueness constraint. Preserve history by
  -- linking each current assertion at a changed field_path to the new row via
  -- superseded_by, then insert the canonical row captured in the snapshot.
  FOR v_assertion IN
    SELECT value
    FROM jsonb_array_elements(v_replacement_assertions)
  LOOP
    v_assertion_id := (v_assertion ->> 'id')::UUID;

    INSERT INTO assertions (
      id,
      entity_type,
      entity_id,
      field_path,
      statement,
      position,
      source_ids,
      confidence_level,
      authored_at,
      authored_by,
      superseded_by,
      fiche_revision_id
    )
    VALUES (
      v_assertion_id,
      v_draft.entity_type,
      v_draft.entity_id,
      v_assertion ->> 'field_path',
      v_assertion ->> 'statement',
      v_assertion ->> 'position',
      ARRAY(
        SELECT source_value::UUID
        FROM jsonb_array_elements_text(v_assertion -> 'source_ids')
          AS source_values(source_value)
      ),
      v_assertion ->> 'confidence_level',
      v_published_at,
      v_actor_id,
      NULL,
      v_fiche_revision_id
    );

    -- Insert first because superseded_by is an immediate self-referential FK.
    UPDATE assertions
    SET superseded_by = v_assertion_id
    WHERE entity_type = v_draft.entity_type
      AND entity_id = v_draft.entity_id
      AND field_path = v_assertion ->> 'field_path'
      AND id <> v_assertion_id
      AND superseded_by IS NULL;
  END LOOP;

  -- Assertion rows must exist before protected demographic/classification
  -- content changes, because migration 016 enforces source-backed updates.
  CASE v_draft.entity_type
    WHEN 'people' THEN
      UPDATE afrik_peoples
      SET content = v_draft_fields,
          updated_at = v_published_at
      WHERE id = v_draft.entity_id;
    WHEN 'language_family' THEN
      UPDATE afrik_language_families
      SET content = v_draft_fields,
          updated_at = v_published_at
      WHERE id = v_draft.entity_id;
    WHEN 'language' THEN
      UPDATE afrik_languages
      SET content = v_draft_fields,
          updated_at = v_published_at
      WHERE id = v_draft.entity_id;
    WHEN 'country' THEN
      UPDATE afrik_countries
      SET content = v_draft_fields,
          updated_at = v_published_at
      WHERE id = v_draft.entity_id;
  END CASE;

  DELETE FROM revision_drafts
  WHERE id = p_draft_id;

  -- Migration 022 permits open -> under_review -> accepted, not a direct
  -- open -> accepted transition. Both updates remain inside this transaction.
  UPDATE flags
  SET status = 'under_review',
      moderator_id = v_actor_id
  WHERE id = ANY(v_linked_flag_ids)
    AND status = 'open';

  UPDATE flags
  SET status = 'accepted',
      moderator_id = v_actor_id,
      moderator_notes = concat_ws(
        E'\n\n',
        NULLIF(btrim(moderator_notes), ''),
        format(
          'Accepted by revision %s (v%s).',
          v_revision_id::TEXT,
          v_version
        )
      ),
      resolved_at = v_published_at
  WHERE id = ANY(v_linked_flag_ids)
    AND status = 'under_review';

  -- The revisions trigger runs before the new assertions exist, so recompute
  -- once more from the final transactional state.
  PERFORM recompute_confidence(v_draft.entity_type, v_draft.entity_id);

  INSERT INTO audit_log (
    action,
    target_type,
    target_id,
    actor_id,
    details_jsonb
  )
  VALUES (
    'revision_published',
    'revision',
    v_revision_id::TEXT,
    v_actor_id,
    jsonb_build_object(
      'entity_type', v_draft.entity_type,
      'entity_id', v_draft.entity_id,
      'version', v_version,
      'linked_flags', to_jsonb(v_linked_flag_ids),
      'reason', v_reason
    )
  );

  RETURN v_revision;
END;
$$;

COMMENT ON FUNCTION publish_revision(UUID, TEXT) IS
  'Publishes one revision draft atomically. Only authenticated senior_editor '
  'and admin profiles may execute it. Exceptions roll back the revision, live '
  'content, assertions, flags, audit entry, and draft deletion. ETNI-70, FR16.';

REVOKE ALL ON FUNCTION publish_revision(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION publish_revision(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION publish_revision(UUID, TEXT) TO authenticated;
