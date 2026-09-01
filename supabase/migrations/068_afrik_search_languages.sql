-- Migration 068 — the language becomes a search result kind (REQ-136, ETNI-1506)
--
-- Context: family → language → people → country is the declared AFRIK
-- hierarchy, but only three of those four layers were reachable through the
-- unified search surface (`/api/v2/search`, ARCH-017) — a reader who typed a
-- language name, or its ISO 639-3 code, only ever reached the peoples that
-- happen to mention it, never the language fiche itself (ETNI-1507). This
-- migration gives `afrik_languages` the same search apparatus every other
-- entity already has.
--
-- Migration 055 already ships `afrik_languages.search_vector`, weighted A =
-- ISO 639-3 id + sourced canonical name, B = alternate names, C = a name
-- derived rather than sourced — so the ISO-code half of the acceptance
-- criterion ("or an ISO code") is already indexed and needs no new column.
-- What is missing is the accent-insensitive name column every other entity's
-- search function ORs against (`name_unaccent_vector`, migration 052) and the
-- ranking RPC itself.
--
-- Modelled on `afrik_search_countries` (052): no confidence/classification
-- filters (afrik_languages carries neither), a single name-shaped predicate,
-- exact match first, then a prefix/accent-insensitive lexical tier. It
-- differs in one respect: the exact-match bonus also fires on the ISO 639-3
-- id itself, not only the name, because a reader who types "swa" is naming
-- the language exactly as precisely as one who types "Swahili".
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
-- CREATE OR REPLACE FUNCTION, REVOKE then GRANT.
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project (jajggbeimfudpzcxytbb) by hand. Must be applied
-- before the application code calling afrik_search_languages is deployed, or
-- the query answers PGRST202.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Accent-insensitive name column (mirrors afrik_peoples/afrik_countries, 052)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.afrik_languages
  ADD COLUMN IF NOT EXISTS name_unaccent_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french', public.afrik_unaccent(COALESCE(name, '')))
  ) STORED;

COMMENT ON COLUMN public.afrik_languages.name_unaccent_vector IS
  'tsvector of name with accents folded before tokenising, so a query normalised the same way (public.afrik_unaccent) matches regardless of how the reader typed accents. See afrik_peoples.name_unaccent_vector (052) for the full rationale. REQ-136.';

CREATE INDEX IF NOT EXISTS idx_afrik_languages_name_unaccent_vector
  ON public.afrik_languages USING gin(name_unaccent_vector);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. afrik_search_languages
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.afrik_search_languages(
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
  SELECT l.id, l.name, l.family_id, l.content, l.created_at, l.updated_at,
         CASE
           WHEN q.is_browse THEN 0::real
           ELSE GREATEST(
             CASE WHEN q.tsq IS NOT NULL
                  THEN ts_rank('{0.1,0.3,0.6,1.0}', l.search_vector, q.tsq)
                  ELSE 0 END,
             CASE WHEN q.tsq_unaccent IS NOT NULL
                  THEN ts_rank('{0.1,0.3,0.6,1.0}', l.name_unaccent_vector,
                               q.tsq_unaccent)
                  ELSE 0 END
           )::real
         END AS relevance,
         -- Exact on the ISO 639-3 id or on the accent/case-folded name — a
         -- reader who types "swa" has named the language exactly as
         -- precisely as one who types "Swahili" (REQ-136 AC: "a language
         -- name — or an ISO code").
         (q.exact_key IS NOT NULL
          AND (lower(l.id) = q.exact_key
               OR public.afrik_unaccent(lower(l.name)) = q.exact_key)
         ) AS exact_match
  FROM public.afrik_languages l
  CROSS JOIN q
  WHERE q.is_browse
        OR (q.tsq IS NOT NULL AND l.search_vector @@ q.tsq)
        OR (q.tsq_unaccent IS NOT NULL
            AND l.name_unaccent_vector @@ q.tsq_unaccent)
),
page AS (
  SELECT m.* FROM matched m
  ORDER BY m.exact_match DESC, m.relevance DESC, m.name ASC, m.id ASC
  LIMIT COALESCE(p_limit, 20) OFFSET COALESCE(p_offset, 0)
),
enriched AS (
  SELECT page.exact_match, page.relevance,
         page.id::text          AS id,
         page.name              AS "name",
         page.family_id::text   AS "familyId",
         lf.name_fr             AS "familyName",
         page.exact_match       AS "exactMatch",
         page.content,
         CASE WHEN (SELECT is_browse FROM q) THEN NULL ELSE ts_headline(
           'french',
           COALESCE(page.name, ''),
           COALESCE((SELECT tsq FROM q), (SELECT tsq_unaccent FROM q)),
           'StartSel=[[, StopSel=]], MaxFragments=1, MaxWords=22, MinWords=6, '
           'FragmentDelimiter= … , HighlightAll=FALSE'
         ) END AS snippet,
         page.created_at AS "createdAt",
         page.updated_at AS "updatedAt"
  FROM page
  LEFT JOIN public.afrik_language_families lf ON lf.id = page.family_id
)
SELECT jsonb_build_object(
  'total', (SELECT count(*) FROM matched),
  'rows', COALESCE(
    (SELECT jsonb_agg(to_jsonb(e) - 'exact_match'
                      ORDER BY e.exact_match DESC, e.relevance DESC,
                               e."name" ASC, e.id ASC)
       FROM enriched e),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_languages(TEXT, INT, INT) IS
  'Ranked, paginated language search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Matches on the weighted search_vector (migration 055: A = ISO 639-3 id and sourced name, B = alternate names, C = derived name) OR the accent-insensitive name_unaccent_vector (this migration), both queried with a last-word prefix operator (public.afrik_prefix_tsquery) — REQ-136. The exact-match bonus fires on the ISO 639-3 id as well as the name. No confidence/classification filters: afrik_languages carries neither. SECURITY INVOKER: reads only afrik_languages and afrik_language_families, already published to anon by migration 006.';

REVOKE ALL ON FUNCTION public.afrik_search_languages(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_languages(TEXT, INT, INT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- 1. A language name reaches the language:
--      SELECT public.afrik_search_languages('Swahili', 5, 0) #>> '{rows,0,name}';
--      -- expect: Swahili
--
-- 2. An ISO 639-3 code reaches the same language, exactMatch true:
--      SELECT public.afrik_search_languages('swa', 5, 0) -> 'rows' -> 0;
--      -- expect id "swa", exactMatch true
--
-- 3. The total survives an empty page:
--      SELECT public.afrik_search_languages('Swahili', 20, 500) -> 'total';
--
-- 4. The name_unaccent_vector index and the function both exist:
--      SELECT indexname FROM pg_indexes WHERE tablename = 'afrik_languages'
--       AND indexname = 'idx_afrik_languages_name_unaccent_vector';
--
-- 5. Callable with the anon key — this is the SECURITY INVOKER claim:
--      SET ROLE anon; SELECT public.afrik_search_languages('swa', 1, 0); RESET ROLE;
--      -- expect a result, not "permission denied for function"
