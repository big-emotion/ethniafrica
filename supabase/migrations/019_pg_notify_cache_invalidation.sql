-- Migration 019: pg_notify trigger on revisions INSERT — cache invalidation wiring
-- Story: ETNI-47 [3.3] pg_notify cache invalidation wiring
-- =============================================================================
-- Installs an AFTER INSERT trigger on the `revisions` table that fires
-- pg_notify('cache_invalidate', payload::text) so the Supabase Edge Function
-- `cache-invalidate` can bridge the event to the Next.js
-- /api/internal/revalidate endpoint within the 10-second SLA (AR16, AR18).
--
-- Payload shape:
--   { "entity_type": "<type>", "entity_id": "<id>", "slug": "<lower(id)>" }
--
-- Idempotency: CREATE OR REPLACE FUNCTION and DROP TRIGGER IF EXISTS /
-- CREATE TRIGGER make this migration safe to re-apply.
-- =============================================================================


-- =============================================================================
-- 1. Trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION revisions_notify_cache_invalidation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    'cache_invalidate',
    jsonb_build_object(
      'entity_type', NEW.entity_type,
      'entity_id',   NEW.entity_id,
      'slug',        LOWER(NEW.entity_id)
    )::text
  );
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION revisions_notify_cache_invalidation() IS
  'AFTER INSERT trigger on revisions: fires pg_notify(''cache_invalidate'', ...) '
  'so the Supabase Edge Function cache-invalidate can bridge to the Next.js '
  '/api/internal/revalidate endpoint (AR16, AR18). ETNI-47.';


-- =============================================================================
-- 2. Trigger wiring
-- =============================================================================

DROP TRIGGER IF EXISTS revisions_cache_notify ON revisions;
CREATE TRIGGER revisions_cache_notify
  AFTER INSERT ON revisions
  FOR EACH ROW
  EXECUTE FUNCTION revisions_notify_cache_invalidation();

COMMENT ON TRIGGER revisions_cache_notify ON revisions IS
  'Fires pg_notify(''cache_invalidate'', ...) after every revision INSERT '
  'to drive cache invalidation in the Next.js layer. ETNI-47.';
