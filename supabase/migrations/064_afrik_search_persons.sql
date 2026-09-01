-- Migration 064 — Ranked search RPC for persons (REQ-126, ETNI-1673)
--
-- Context: REQ-126 wires named persons (migration 057) into the unified
-- search surface on the same footing as peoples/countries/families. Those
-- three natures each rank in SQL through a dedicated RPC (044, refined by
-- 052's prefix/unaccent matching and 063's pg_trgm typo-tolerance fallback);
-- persons currently have none, so a name typed into search finds nothing no
-- matter how well-sourced the row is.
--
-- afrik_search_persons follows the same three-tier shape as
-- afrik_search_peoples, combined here in one migration rather than three
-- because persons did not exist when 052 and 063 shipped:
--   1. Exact match — accent-insensitive equality on full_name, via the same
--      public.afrik_unaccent helper (052).
--   2. Lexical/prefix match — public.afrik_prefix_tsquery (052) against both
--      the existing weighted search_vector (057: A=full_name, B=role_category)
--      and a new accent-folded name_unaccent_vector, so "keita" finds "Keïta"
--      by construction rather than by stemmer coincidence.
--   3. pg_trgm similarity fallback (063), threshold 0.4, reached only when
--      tier 2 finds nothing for a row — a lexical_match boolean tier keeps a
--      real prefix/lexical match ahead of a fuzzy one regardless of how the
--      two magnitudes compare.
--
-- No classification/confidence/family/country filters: those concepts belong
-- to afrik_peoples (confidence_scores is entity_type='people' only, migration
-- 014) and have no persons equivalent. p_q, p_limit, p_offset only.
--
-- SECURITY INVOKER, same rationale as 044: called through createServerClient
-- with the anon key, and reads only `persons`, already published to anon
-- with `FOR SELECT USING (true)` by migration 057. Tightening that policy
-- narrows this function with it rather than being able to leak around it.
--
-- Idempotent: ADD COLUMN/CREATE INDEX/CREATE EXTENSION IF NOT EXISTS,
-- CREATE OR REPLACE FUNCTION, REVOKE then GRANT.
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project (jajggbeimfudpzcxytbb) by hand. Must be applied
-- before the application code calling afrik_search_persons is deployed, or
-- the query answers PGRST202.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Accent-insensitive name column + trigram index, mirroring
--    afrik_peoples.name_unaccent_vector (052) and
--    idx_afrik_peoples_name_main_trgm (063).
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS name_unaccent_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french', public.afrik_unaccent(COALESCE(full_name, '')))
  ) STORED;

COMMENT ON COLUMN persons.name_unaccent_vector IS
  'tsvector of full_name with accents folded before tokenising, so a query normalised the same way (public.afrik_unaccent) matches regardless of how the reader typed accents — mirrors afrik_peoples.name_unaccent_vector (052). REQ-126.';

CREATE INDEX IF NOT EXISTS idx_persons_name_unaccent_vector
  ON persons USING gin(name_unaccent_vector);

CREATE INDEX IF NOT EXISTS idx_persons_full_name_trgm
  ON persons
  USING gin (
    (extensions.unaccent('extensions.unaccent'::regdictionary, lower(full_name)))
    extensions.gin_trgm_ops
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 2. afrik_search_persons
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.afrik_search_persons(
  p_q      TEXT DEFAULT NULL,
  p_limit  INT  DEFAULT 20,
  p_offset INT  DEFAULT 0
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
WITH q AS (
  SELECT
    (COALESCE(btrim(p_q), '') = '') AS is_browse,
    CASE WHEN COALESCE(btrim(p_q), '') = '' THEN NULL
         ELSE public.afrik_prefix_tsquery(btrim(p_q)) END AS tsq,
    CASE WHEN COALESCE(btrim(p_q), '') = '' THEN NULL
         ELSE public.afrik_prefix_tsquery(
                public.afrik_unaccent(btrim(p_q))) END AS tsq_unaccent,
    CASE WHEN COALESCE(btrim(p_q), '') = '' THEN NULL
         ELSE public.afrik_unaccent(lower(btrim(p_q))) END AS exact_key
),
matched AS (
  SELECT
    p.id, p.full_name, p.role_category, p.content, p.created_at, p.updated_at,
    (q.tsq IS NOT NULL
     AND (p.search_vector @@ q.tsq
          OR p.name_unaccent_vector @@ q.tsq_unaccent)) AS lexical_match,
    CASE
      WHEN q.is_browse THEN 0::real
      WHEN q.tsq IS NOT NULL
           AND (p.search_vector @@ q.tsq
                OR p.name_unaccent_vector @@ q.tsq_unaccent) THEN
        GREATEST(
          CASE WHEN p.search_vector @@ q.tsq
               THEN ts_rank('{0.1,0.3,0.6,1.0}', p.search_vector, q.tsq)
               ELSE 0 END,
          CASE WHEN p.name_unaccent_vector @@ q.tsq_unaccent
               THEN ts_rank('{0.1,0.3,0.6,1.0}', p.name_unaccent_vector,
                            q.tsq_unaccent)
               ELSE 0 END
        )::real
      WHEN q.tsq IS NOT NULL THEN
        -- Fallback tier only — never reached when tier 2 already matched.
        -- The boolean lexical_match tier above (not this magnitude) is what
        -- keeps a lexical/prefix match ranked first.
        extensions.similarity(
          extensions.unaccent('extensions.unaccent'::regdictionary,
                              lower(p.full_name)),
          q.exact_key)::real
      ELSE 0::real
    END AS relevance,
    (q.exact_key IS NOT NULL
     AND public.afrik_unaccent(lower(p.full_name)) = q.exact_key) AS exact_match
  FROM public.persons p
  CROSS JOIN q
  WHERE (
      q.is_browse
      OR (q.tsq IS NOT NULL AND p.search_vector @@ q.tsq)
      OR (q.tsq_unaccent IS NOT NULL
          AND p.name_unaccent_vector @@ q.tsq_unaccent)
      OR (q.exact_key IS NOT NULL AND extensions.similarity(
            extensions.unaccent('extensions.unaccent'::regdictionary,
                                lower(p.full_name)),
            q.exact_key) >= 0.4)
    )
),
page AS (
  SELECT m.* FROM matched m
  ORDER BY m.exact_match DESC, m.lexical_match DESC, m.relevance DESC,
           m.full_name ASC, m.id ASC
  LIMIT COALESCE(p_limit, 20) OFFSET COALESCE(p_offset, 0)
),
enriched AS (
  SELECT
    page.exact_match,
    page.lexical_match,
    page.relevance,
    page.id::text          AS id,
    page.full_name         AS "fullName",
    page.role_category     AS "roleCategory",
    page.exact_match       AS "exactMatch",
    page.content,
    CASE WHEN (SELECT is_browse FROM q) THEN NULL ELSE ts_headline(
      'french',
      concat_ws(' · ', nullif(page.full_name, ''),
                       nullif(page.role_category, '')),
      COALESCE((SELECT tsq FROM q), (SELECT tsq_unaccent FROM q)),
      'StartSel=[[, StopSel=]], MaxFragments=1, MaxWords=22, MinWords=6, '
      'FragmentDelimiter= … , HighlightAll=FALSE'
    ) END AS snippet,
    page.created_at AS "createdAt",
    page.updated_at AS "updatedAt"
  FROM page
)
SELECT jsonb_build_object(
  'total', (SELECT count(*) FROM matched),
  'rows', COALESCE(
    (SELECT jsonb_agg(to_jsonb(e) - 'exact_match' - 'lexical_match'
                      ORDER BY e.exact_match DESC, e.lexical_match DESC,
                               e.relevance DESC, e."fullName" ASC, e.id ASC)
       FROM enriched e),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_persons(TEXT, INT, INT) IS
  'Ranked, paginated persons search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Ranked by exact full_name match, then a prefix/accent-insensitive lexical match over search_vector or name_unaccent_vector (public.afrik_prefix_tsquery, mirroring 052), then a pg_trgm similarity fallback (>= 0.4, mirroring 063) for a query that finds no lexical match at all. No classification/confidence/family/country filters — those are peoples-only concepts. SECURITY INVOKER: reads only persons, already published to anon by migration 057. REQ-126.';

REVOKE ALL ON FUNCTION public.afrik_search_persons(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_persons(TEXT, INT, INT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- 1. Prefix match ahead of a pure trigram match:
--      SELECT public.afrik_search_persons('modibo', 5, 0) #>> '{rows,0,fullName}';
--      -- expect a full_name beginning "Modibo" (e.g. "Modibo Keïta")
--
-- 2. Accent-insensitive query finds an accented stored name:
--      SELECT public.afrik_search_persons('keita', 5, 0) #>> '{rows,0,fullName}';
--      -- expect a full_name containing "Keïta"
--
-- 3. The total is corpus-wide, not the page size, and survives an empty page:
--      SELECT public.afrik_search_persons('keita', 1, 500);
--      -- expect {"total": <n >= 1>, "rows": []}
--
-- 4. A single-letter typo with no declared alias still resolves via the
--    trigram fallback, ranked behind any real lexical match:
--      SELECT public.afrik_search_persons('Modibi', 5, 0) #>> '{rows,0,fullName}';
--      -- expect a full_name beginning "Modibo", via the fallback tier
--
-- 5. Callable with the anon key — this is the SECURITY INVOKER claim:
--      SET ROLE anon; SELECT public.afrik_search_persons('keita', 1, 0); RESET ROLE;
--      -- expect a result, not "permission denied for function"
