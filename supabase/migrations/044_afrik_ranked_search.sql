-- Migration 044 — Ranked search RPC for /api/v2/search
--
-- Context: migration 043 gave both AFRIK tables a weighted tsvector; nothing
-- ranks with it yet. The query layer still pages in SQL and then sorts in
-- JavaScript, which has two consequences: the ordering is per-page rather than
-- corpus-wide, and the reported `total` is the size of the page rather than the
-- number of matches. Ranking has to happen in the same statement as the LIMIT,
-- which means it has to happen in the database.
--
-- Two functions rather than one. Peoples and countries have disjoint columns
-- and disjoint filters — confidence_scores only carries entity_type='people'
-- (migration 014) — so a single union-shaped return would be a fiction the
-- caller has to unpick. The caller issues both in parallel.
--
-- Both RETURN jsonb shaped {"total": <bigint>, "rows": [...]} rather than
-- RETURNS TABLE. A table-shaped return can only carry the total on a row, and
-- an empty page — offset past the end, or no matches at all — has no row to
-- carry it. A total that is right in every case is the point of this
-- migration, so the total gets a field of its own.
--
-- ── Why SECURITY INVOKER, against the grain of every other function here ────
-- Every existing function in this schema is SECURITY DEFINER pinned to
-- service_role, because each reads something the anon key must not see. This
-- one is the opposite case. It is called through createServerClient(), which
-- holds the public anon key, and it reads only tables that migrations 015 and
-- 019 already publish to anon with `FOR SELECT USING (true)`: afrik_peoples,
-- afrik_countries, afrik_people_countries, afrik_language_families and
-- confidence_scores. A DEFINER function would grant nothing the caller cannot
-- already SELECT directly, and would keep granting it if one of those policies
-- were ever tightened. INVOKER makes the function inherit whatever the caller
-- may read: tighten a policy and the search narrows with it rather than
-- leaking around it. search_path is still pinned, for the same reason it is
-- pinned on the DEFINER functions.
--
-- ── unaccent ────────────────────────────────────────────────────────────────
-- The exact-name bonus cannot use the French stemmer: 'french' folds Bété,
-- Bete and Béti onto the single lexeme 'bet', so "is this row's name exactly
-- what was typed" is a question the stemmer cannot answer. to_tsvector('simple')
-- distinguishes them but is accent-sensitive, so a reader typing "Bete" would
-- miss "Bété". unaccent is the smallest thing that answers the question.
--
-- Note the two-argument form. The one-argument unaccent(text) is STABLE rather
-- than IMMUTABLE precisely because it resolves its dictionary through
-- search_path at call time; with the extension installed into `extensions` and
-- search_path pinned, that resolution is a trap. The two-argument form names
-- the dictionary explicitly and is IMMUTABLE.
--
-- No custom `french_unaccent` text search CONFIGURATION is created. The stock
-- 'french' configuration already unaccents for matching purposes, so all six
-- existing `config: "french"` call sites remain correct and are left alone —
-- which is what keeps this change small.
--
-- Idempotent: CREATE EXTENSION IF NOT EXISTS, CREATE OR REPLACE FUNCTION,
-- REVOKE then GRANT.
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project. 043 must already be applied — these functions rank
-- with the weights it stores. Both must be applied before the application code
-- that calls them is deployed, or every search answers PGRST202.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Peoples
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.afrik_search_peoples(
  p_q                     TEXT        DEFAULT NULL,
  p_limit                 INT         DEFAULT 20,
  p_offset                INT         DEFAULT 0,
  p_classification_status TEXT        DEFAULT NULL,
  p_min_confidence        NUMERIC     DEFAULT NULL,
  p_since_verified_after  TIMESTAMPTZ DEFAULT NULL,
  p_family_id             TEXT        DEFAULT NULL,
  p_country_id            TEXT        DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
WITH q AS (
  -- A blank p_q is browse mode, not "match everything badly": the text
  -- predicate and the rank both drop out and the relation filters carry the
  -- query alone. That is what makes "peoples of family X" reachable through
  -- this same function instead of a second code path.
  SELECT
    CASE WHEN COALESCE(btrim(p_q), '') = '' THEN NULL
         ELSE websearch_to_tsquery('french', p_q) END AS tsq,
    CASE WHEN COALESCE(btrim(p_q), '') = '' THEN NULL
         ELSE extensions.unaccent('extensions.unaccent'::regdictionary,
                                  lower(btrim(p_q))) END AS exact_key
),
matched AS (
  SELECT
    p.id, p.name_main, p.language_family_id, p.classification_status,
    p.content, p.created_at, p.updated_at,
    cs.score AS confidence,
    CASE
      WHEN q.tsq IS NULL THEN 0::real
      -- {D,C,B,A}. Confidence multiplies rather than orders: it spans
      -- 0.00–0.80 across the corpus and barely a fifth of that inside a
      -- typical result set, so on its own it sorts nothing. Halving its
      -- influence keeps a well-sourced fiche ahead of a thin one at equal
      -- lexical rank without letting it overtake a better lexical match.
      ELSE (ts_rank('{0.1,0.3,0.6,1.0}', p.search_vector, q.tsq)
            * (0.5 + 0.5 * COALESCE(cs.score, 0.5)))::real
    END AS relevance,
    (q.exact_key IS NOT NULL
     AND extensions.unaccent('extensions.unaccent'::regdictionary,
                             lower(p.name_main)) = q.exact_key) AS exact_match
  FROM public.afrik_peoples p
  LEFT JOIN public.confidence_scores cs
    ON cs.entity_type = 'people' AND cs.entity_id = p.id
  CROSS JOIN q
  WHERE (q.tsq IS NULL OR p.search_vector @@ q.tsq)
    AND (p_classification_status IS NULL
         OR p.classification_status::text = p_classification_status)
    AND (p_min_confidence IS NULL OR cs.score >= p_min_confidence)
    AND (p_since_verified_after IS NULL
         OR cs.last_human_audit_at >= p_since_verified_after)
    AND (p_family_id IS NULL OR p.language_family_id = p_family_id)
    AND (p_country_id IS NULL OR EXISTS (
           SELECT 1 FROM public.afrik_people_countries pc
            WHERE pc.people_id = p.id AND pc.country_id = p_country_id))
),
page AS (
  -- LIMIT before ts_headline: the headline is the expensive part, and it is
  -- only ever read for rows that are actually returned.
  SELECT m.* FROM matched m
  ORDER BY m.exact_match DESC, m.relevance DESC, m.name_main ASC, m.id ASC
  LIMIT COALESCE(p_limit, 20) OFFSET COALESCE(p_offset, 0)
),
enriched AS (
  SELECT
    page.exact_match,
    page.relevance,
    page.id::text                    AS id,
    page.name_main                   AS "nameMain",
    page.language_family_id::text    AS "languageFamilyId",
    lf.name_fr                       AS "languageFamilyName",
    page.classification_status::text AS "classificationStatus",
    page.exact_match                 AS "exactMatch",
    page.content,
    COALESCE((SELECT array_agg(pc.country_id::text ORDER BY pc.country_id)
                FROM public.afrik_people_countries pc
               WHERE pc.people_id = page.id), '{}'::text[]) AS "currentCountries",
    page.confidence,
    -- Why this row matched, in the reader's own words. The document is the
    -- appellations block flattened to text — the same material the tsvector
    -- was built from — so a match on a historical region shows that region,
    -- and a reader can see for themselves that Amhara surfaced on
    -- "Wollo (Bete Amhara)" rather than being left to wonder.
    --
    -- StartSel/StopSel are deliberately not HTML: ts_headline does not escape
    -- the surrounding document, so emitting <b> would let corpus text inject
    -- markup into the client. The frontend splits on [[ ]] and renders <mark>.
    CASE WHEN (SELECT tsq FROM q) IS NULL THEN NULL ELSE ts_headline(
      'french',
      concat_ws(' · ',
        nullif(page.content -> 'appellations' ->> 'selfAppellation', ''),
        nullif((SELECT string_agg(e.value #>> '{}', ', ')
                  FROM jsonb_array_elements(
                         COALESCE(page.content -> 'appellations' -> 'exonyms',
                                  '[]'::jsonb)) e
                 WHERE jsonb_typeof(e.value) = 'string'), ''),
        nullif((SELECT string_agg(k.val #>> '{}', ' · ')
                  FROM jsonb_each(COALESCE(page.content -> 'appellations',
                                           '{}'::jsonb)) k(key, val)
                 WHERE jsonb_typeof(k.val) = 'string'
                   AND k.key NOT IN ('mainName', 'selfAppellation')), '')),
      (SELECT tsq FROM q),
      'StartSel=[[, StopSel=]], MaxFragments=1, MaxWords=22, MinWords=6, '
      'FragmentDelimiter= … , HighlightAll=FALSE'
    ) END AS snippet,
    page.created_at AS "createdAt",
    page.updated_at AS "updatedAt"
  FROM page
  LEFT JOIN public.afrik_language_families lf
    ON lf.id = page.language_family_id
)
SELECT jsonb_build_object(
  'total', (SELECT count(*) FROM matched),
  'rows', COALESCE(
    (SELECT jsonb_agg(to_jsonb(e) - 'exact_match'
                      ORDER BY e.exact_match DESC, e.relevance DESC,
                               e."nameMain" ASC, e.id ASC)
       FROM enriched e),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_peoples(
  TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT) IS
  'Ranked, paginated peoples search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Ranked by ts_rank over the weighted search_vector (migration 043) times a confidence multiplier, with an accent-insensitive exact name_main match sorted first. A null or blank p_q switches the text predicate off, which is how "peoples of family X" and "peoples of country Y" are served here. SECURITY INVOKER: reads only tables already published to anon by migrations 015 and 019.';

REVOKE ALL ON FUNCTION public.afrik_search_peoples(
  TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_peoples(
  TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Countries
-- ────────────────────────────────────────────────────────────────────────────
-- No confidence filters here: confidence_scores carries entity_type='people'
-- only (migration 014), so a country-level minConfidence would filter on a
-- column with no matching rows.
CREATE OR REPLACE FUNCTION public.afrik_search_countries(
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
    CASE WHEN COALESCE(btrim(p_q), '') = '' THEN NULL
         ELSE websearch_to_tsquery('french', p_q) END AS tsq,
    CASE WHEN COALESCE(btrim(p_q), '') = '' THEN NULL
         ELSE extensions.unaccent('extensions.unaccent'::regdictionary,
                                  lower(btrim(p_q))) END AS exact_key
),
matched AS (
  SELECT c.id, c.name_fr, c.etymology, c.name_origin_actor, c.content,
         c.created_at, c.updated_at,
         CASE WHEN q.tsq IS NULL THEN 0::real
              ELSE ts_rank('{0.1,0.3,0.6,1.0}', c.search_vector, q.tsq)::real
         END AS relevance,
         (q.exact_key IS NOT NULL
          AND extensions.unaccent('extensions.unaccent'::regdictionary,
                                  lower(c.name_fr)) = q.exact_key) AS exact_match
  FROM public.afrik_countries c
  CROSS JOIN q
  WHERE q.tsq IS NULL OR c.search_vector @@ q.tsq
),
page AS (
  SELECT m.* FROM matched m
  ORDER BY m.exact_match DESC, m.relevance DESC, m.name_fr ASC, m.id ASC
  LIMIT COALESCE(p_limit, 20) OFFSET COALESCE(p_offset, 0)
),
enriched AS (
  SELECT page.exact_match, page.relevance,
         page.id::text        AS id,
         page.name_fr         AS "nameFr",
         page.etymology,
         page.name_origin_actor AS "nameOriginActor",
         page.exact_match     AS "exactMatch",
         page.content,
         CASE WHEN (SELECT tsq FROM q) IS NULL THEN NULL ELSE ts_headline(
           'french',
           concat_ws(' · ', nullif(page.name_fr, ''),
                            nullif(page.etymology, '')),
           (SELECT tsq FROM q),
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
    (SELECT jsonb_agg(to_jsonb(e) - 'exact_match'
                      ORDER BY e.exact_match DESC, e.relevance DESC,
                               e."nameFr" ASC, e.id ASC)
       FROM enriched e),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_countries(TEXT, INT, INT) IS
  'Ranked, paginated countries search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Ranked by ts_rank over the weighted search_vector (migration 043), name_fr outranking etymology, with an accent-insensitive exact name_fr match first. No confidence filters: confidence_scores covers entity_type=''people'' only (migration 014).';

REVOKE ALL ON FUNCTION public.afrik_search_countries(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_countries(TEXT, INT, INT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- 1. The extension landed in `extensions`, not public:
--      SELECT n.nspname FROM pg_extension e
--        JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname='unaccent';
--      -- expect: extensions
--
-- 2. The regression this whole change exists to fix:
--      SELECT jsonb_path_query_array(
--               public.afrik_search_peoples('Bété', 20, 0), '$.rows[*].nameMain');
--      -- expect Bété first, Béti / Béti-Fang next, Amhara far down the list
--
-- 3. The total is corpus-wide, not the page size:
--      SELECT public.afrik_search_peoples('Bété', 2, 0) -> 'total';
--      -- expect 16, with jsonb_array_length(... -> 'rows') = 2
--
-- 4. The total survives an empty page — this is why the return is jsonb:
--      SELECT public.afrik_search_peoples('Bété', 20, 500);
--      -- expect {"total": 16, "rows": []}
--
-- 5. The exact bonus ignores accents:
--      SELECT public.afrik_search_peoples('Bete', 3, 0) #>> '{rows,0,nameMain}';
--      -- expect: Bété
--
-- 6. The excerpt says why, not just what:
--      SELECT r ->> 'nameMain', r ->> 'snippet'
--        FROM jsonb_array_elements(
--               public.afrik_search_peoples('Bété', 20, 0) -> 'rows') r
--       WHERE r ->> 'nameMain' = 'Amhara';
--      -- expect a snippet containing: Wollo ([[Bete]] Amhara)
--
-- 7. Browse mode — peoples of a family, no text query:
--      SELECT public.afrik_search_peoples(NULL, 5, 0, NULL, NULL, NULL, 'FLG_KROU')
--             -> 'total';
--      -- expect the stored row count for FLG_KROU, every rows[*].snippet null
--
-- 8. Callable with the anon key — this is the SECURITY INVOKER claim:
--      SET ROLE anon; SELECT public.afrik_search_peoples('Bété', 1, 0); RESET ROLE;
--      -- expect a result, not "permission denied for function"
