-- Migration 069 — near-miss leads for a zero-result search (REQ-125, ETNI-1418)
--
-- Context: `/api/v2/search` (ARCH-017) already tolerates typos inline — a
-- fuzzy pg_trgm tier (063) surfaces a peoples row when nothing lexical
-- matched, at a similarity floor of 0.4. But when a query clears none of the
-- five entities' thresholds at all, the reader gets a bare zero: no hint of
-- what the engine came close to, which is exactly the dead end REQ-125 asks
-- this surface to close.
--
-- This migration adds one function, `afrik_search_leads`, called only when
-- the main search already returned a corpus-wide total of 0 (decided by the
-- caller, `ftsSearchEntities`, not by this function). It is a UNION across
-- the three entity kinds the home and results surfaces name to the reader
-- (peoples, countries, language families — SEARCH_LABEL in HomeHeroSearch;
-- persons and patronymes are excluded from "leads" the same way they are
-- excluded from that label), ranked by trigram similarity alone, at a lower
-- floor (0.2) than the main search's inline fallback (0.4): a genuine
-- near-miss the primary search rejected can still be worth showing when the
-- alternative is nothing at all, precisely because this function only ever
-- runs once the primary search has already failed every entity.
--
-- A 2-character floor on the folded query (`length(exact_key) >= 3`) keeps
-- this off queries too short to form a meaningful trigram set, mirroring the
-- non-goal already documented in migration 063 for "bt".
--
-- Idempotent: CREATE OR REPLACE FUNCTION, REVOKE then GRANT. Reuses the
-- pg_trgm extension and the `idx_afrik_peoples_name_main_trgm` index from
-- migration 063; adds the equivalent indexes for countries and language
-- families since neither carries one yet.
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project (jajggbeimfudpzcxytbb) by hand.

CREATE INDEX IF NOT EXISTS idx_afrik_countries_name_fr_trgm
  ON public.afrik_countries
  USING gin (
    (public.afrik_unaccent(lower(name_fr)))
    extensions.gin_trgm_ops
  );

CREATE INDEX IF NOT EXISTS idx_afrik_language_families_name_fr_trgm
  ON public.afrik_language_families
  USING gin (
    (public.afrik_unaccent(lower(name_fr)))
    extensions.gin_trgm_ops
  );

CREATE OR REPLACE FUNCTION public.afrik_search_leads(
  p_q     TEXT DEFAULT NULL,
  p_limit INT  DEFAULT 3
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
WITH q AS (
  SELECT public.afrik_unaccent(lower(btrim(p_q))) AS exact_key
),
candidates AS (
  SELECT 'people'::text AS kind, p.id::text AS id, p.name_main AS name,
         extensions.similarity(
           public.afrik_unaccent(lower(p.name_main)), q.exact_key) AS similarity
  FROM public.afrik_peoples p
  CROSS JOIN q
  WHERE length(q.exact_key) >= 3

  UNION ALL

  SELECT 'country'::text AS kind, c.id::text AS id, c.name_fr AS name,
         extensions.similarity(
           public.afrik_unaccent(lower(c.name_fr)), q.exact_key) AS similarity
  FROM public.afrik_countries c
  CROSS JOIN q
  WHERE length(q.exact_key) >= 3

  UNION ALL

  SELECT 'family'::text AS kind, lf.id::text AS id, lf.name_fr AS name,
         extensions.similarity(
           public.afrik_unaccent(lower(lf.name_fr)), q.exact_key) AS similarity
  FROM public.afrik_language_families lf
  CROSS JOIN q
  WHERE length(q.exact_key) >= 3
),
matched AS (
  SELECT * FROM candidates WHERE similarity >= 0.2
),
page AS (
  SELECT * FROM matched
  ORDER BY similarity DESC, name ASC, id ASC
  LIMIT COALESCE(p_limit, 3)
)
SELECT jsonb_build_object(
  'rows', COALESCE(
    (SELECT jsonb_agg(to_jsonb(page) ORDER BY page.similarity DESC,
                       page.name ASC, page.id ASC)
       FROM page),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_leads(TEXT, INT) IS
  'Near-miss leads for a zero-result search (REQ-125). Only meaningful when the caller has already established the main search found nothing: a trigram similarity scan (>= 0.2, below the main search''s own 0.4 fallback floor) across peoples.name_main, countries.name_fr and language_families.name_fr, ranked by similarity alone. Returns {"rows": [{"kind", "id", "name", "similarity"}, ...]}, at most p_limit rows. A folded query shorter than 3 characters returns no rows — too short to form a meaningful trigram set (same non-goal as migration 063). SECURITY INVOKER: reads only tables already published to anon.';

REVOKE ALL ON FUNCTION public.afrik_search_leads(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_leads(TEXT, INT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- 1. The two new trigram indexes exist:
--      SELECT indexname FROM pg_indexes
--       WHERE indexname IN ('idx_afrik_countries_name_fr_trgm',
--                            'idx_afrik_language_families_name_fr_trgm');
--      -- expect 2 rows
--
-- 2. A near-miss surfaces on a query that clears no entity's own threshold:
--      SELECT public.afrik_search_leads('Woloff-ish nonsense', 3);
--      -- expect a non-empty 'rows' array only if some corpus name scores
--      -- >= 0.2 against the folded query; otherwise '[]'
--
-- 3. A short query returns nothing:
--      SELECT public.afrik_search_leads('bt', 3);
--      -- expect {"rows": []}
--
-- 4. Callable with the anon key:
--      SET ROLE anon; SELECT public.afrik_search_leads('test', 3); RESET ROLE;
--      -- expect a result, not "permission denied for function"
