-- Migration 068 — One comparable score across every kind (REQ-002, ETNI-1707)
--
-- Context: search now answers over six kinds — peoples (044/052/063),
-- countries (052), persons (065), names (066), linguistic families and quiz
-- questions — but only the first four rank in SQL, and the numbers they
-- return do not mean the same thing:
--
--   peoples    ts_rank × a confidence multiplier, typically 0.01–0.15
--   countries  a bare ts_rank on the same scale
--   persons    ts_rank, or a pg_trgm similarity on [0,1] in the fallback tier
--   names      the same, plus a fixed 0.5 for a phonetic-only hit
--   families   a JS tier ladder (1 / 0.6 / 0.3 / 0.1) computed in
--              rankLanguageFamilies, after fetching all 24 rows
--   quiz       nothing at all — the bank is unreachable from search
--
-- Sorting a merged list on those numbers ranks by which kind a row came from.
-- A families tier of 0.3 ("substring match, second-best of four") sits an
-- order of magnitude above a peoples ts_rank of 0.02 that may well be an
-- exact name hit. The caller cannot fix this: it has no way to know what
-- scale it is being handed.
--
-- ── The decision ──────────────────────────────────────────────────────────
-- What is comparable across kinds is not the magnitude, it is the *match
-- class*: did the query hit this row exactly, lexically, or only through a
-- fuzzy/prose fallback? Every existing RPC already computes that class as two
-- booleans (exact_match, lexical_match) precisely because the magnitudes were
-- never trustworthy enough to order on — migration 063 says so outright.
--
-- public.afrik_search_normalized_score therefore gives each class a disjoint
-- band of [0,1] and places the kind's own raw magnitude *inside* its band:
--
--   exact     [0.90, 1.00]
--   lexical   [0.50, 0.90]
--   fallback  [0.00, 0.50]
--
-- so the class always dominates and the raw score only breaks ties among rows
-- of the same class, which is the only comparison it can honestly make. The
-- placement uses the saturating squash x/(1+x): bounded on [0,1) for every
-- x >= 0, monotone, and needing no per-kind calibration constant — a peoples
-- ts_rank of 0.02 and a families tier of 0.3 both land inside their band
-- without either scale having to be rescaled against the other.
--
-- The existing rows are untouched: `relevance` and `exactMatch` keep their
-- current meaning and their current values, and `normalizedScore` is added
-- beside them. Nothing that reads these RPCs today has to change to keep
-- working.
--
-- ── What this migration adds ──────────────────────────────────────────────
--   1. the shared score helper
--   2. normalizedScore on the four RPCs that already exist
--   3. afrik_search_language_families — the JS tier ladder, in SQL, so
--      families stop being ranked in a different process from everything else
--   4. afrik_search_quiz — the quiz bank, active rows only, joined to its
--      subject so a reader who types a people's name reaches the questions
--      about it
--
-- The quiz function is the one place where the row shape is a correctness
-- concern rather than an ergonomic one: `options_fr` and `correct_option` are
-- the answer key, and `explanation_fr` states the answer in prose. All three
-- are searchable (a reader looking for "Wolof" should reach a question whose
-- explanation is the only place that word appears) and none of the three is
-- ever returned. The projection below is a closed list for that reason.
--
-- Accent folding goes through public.afrik_unaccent (052, extended by 066)
-- everywhere, never the raw two-argument extension call: that form is STABLE
-- on both projects, so an index or generated column built on it is rejected —
-- migration 063 records the diagnosis.
--
-- Idempotent: every function is replaced in place, every column and index is
-- guarded by IF NOT EXISTS, and each grant is preceded by its revoke.
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project (jajggbeimfudpzcxytbb) by hand. Must be applied
-- before the application code calling afrik_search_language_families or
-- afrik_search_quiz is deployed, or the query answers PGRST202.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA extensions;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. The shared score
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.afrik_search_normalized_score(
  p_exact_match   BOOLEAN,
  p_lexical_match BOOLEAN,
  p_raw_relevance REAL
)
RETURNS REAL
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
  WITH band AS (
    SELECT
      CASE WHEN COALESCE(p_exact_match, false)   THEN 0.90::real
           WHEN COALESCE(p_lexical_match, false) THEN 0.50::real
           ELSE 0.00::real END AS floor_of_band,
      CASE WHEN COALESCE(p_exact_match, false)   THEN 0.10::real
           WHEN COALESCE(p_lexical_match, false) THEN 0.40::real
           ELSE 0.50::real END AS width_of_band,
      -- A negative magnitude would push a row below its band's floor and
      -- across a class boundary; nothing produces one today, and clamping
      -- here means nothing can.
      GREATEST(COALESCE(p_raw_relevance, 0::real), 0::real) AS raw
  )
  SELECT LEAST(
           GREATEST(
             floor_of_band + width_of_band * (raw / (1::real + raw)),
             0::real),
           1::real)::real
  FROM band;
$$;

COMMENT ON FUNCTION public.afrik_search_normalized_score(BOOLEAN, BOOLEAN, REAL) IS
  'Maps one kind''s raw relevance onto [0,1] so scores from different kinds can be merged into a single ranked list. The match class picks a disjoint band (exact [0.90,1.00], lexical [0.50,0.90], fallback [0.00,0.50]) and the raw magnitude is placed inside it by the saturating squash x/(1+x) — so the class always dominates and the magnitude, which is measured on a different scale per kind, only ever breaks ties within one class. REQ-002.';

REVOKE ALL ON FUNCTION public.afrik_search_normalized_score(BOOLEAN, BOOLEAN, REAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_normalized_score(BOOLEAN, BOOLEAN, REAL)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. afrik_search_peoples — migration 063's body, plus normalizedScore
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
  SELECT
    CASE WHEN COALESCE(btrim(p_q), '') = '' THEN NULL
         ELSE websearch_to_tsquery('french', p_q) END AS tsq,
    CASE WHEN COALESCE(btrim(p_q), '') = '' THEN NULL
         ELSE public.afrik_unaccent(lower(btrim(p_q))) END AS exact_key
),
matched AS (
  SELECT
    p.id, p.name_main, p.language_family_id, p.classification_status,
    p.content, p.created_at, p.updated_at,
    cs.score AS confidence,
    (q.tsq IS NOT NULL AND p.search_vector @@ q.tsq) AS lexical_match,
    CASE
      WHEN q.tsq IS NOT NULL AND p.search_vector @@ q.tsq THEN
        -- {D,C,B,A}. Confidence multiplies rather than orders: it spans
        -- 0.00–0.80 across the corpus and barely a fifth of that inside a
        -- typical result set, so on its own it sorts nothing. Halving its
        -- influence keeps a well-sourced fiche ahead of a thin one at equal
        -- lexical rank without letting it overtake a better lexical match.
        (ts_rank('{0.1,0.3,0.6,1.0}', p.search_vector, q.tsq)
          * (0.5 + 0.5 * COALESCE(cs.score, 0.5)))::real
      WHEN q.tsq IS NOT NULL THEN
        -- Fallback tier only — never reached when the lexical predicate
        -- already matched. The boolean lexical_match tier above (not this
        -- magnitude) is what keeps a lexical match ranked first.
        (extensions.similarity(
           public.afrik_unaccent(lower(p.name_main)),
           q.exact_key)
          * (0.5 + 0.5 * COALESCE(cs.score, 0.5)))::real
      ELSE 0::real
    END AS relevance,
    (q.exact_key IS NOT NULL
     AND public.afrik_unaccent(lower(p.name_main)) = q.exact_key) AS exact_match
  FROM public.afrik_peoples p
  LEFT JOIN public.confidence_scores cs
    ON cs.entity_type = 'people' AND cs.entity_id = p.id
  CROSS JOIN q
  WHERE (
      q.tsq IS NULL
      OR p.search_vector @@ q.tsq
      OR extensions.similarity(
           public.afrik_unaccent(lower(p.name_main)),
           q.exact_key) >= 0.4
    )
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
  -- only ever read for rows that are actually returned. lexical_match ranks
  -- ahead of relevance so a fuzzy-only match can never outrank a real
  -- lexical or exact one, whatever the two scores happen to be.
  SELECT m.* FROM matched m
  ORDER BY m.exact_match DESC, m.lexical_match DESC, m.relevance DESC,
           m.name_main ASC, m.id ASC
  LIMIT COALESCE(p_limit, 20) OFFSET COALESCE(p_offset, 0)
),
enriched AS (
  SELECT
    page.exact_match,
    page.lexical_match,
    page.relevance,
    page.id::text                    AS id,
    page.name_main                   AS "nameMain",
    page.language_family_id::text    AS "languageFamilyId",
    lf.name_fr                       AS "languageFamilyName",
    page.classification_status::text AS "classificationStatus",
    page.exact_match                 AS "exactMatch",
    public.afrik_search_normalized_score(
      page.exact_match, page.lexical_match, page.relevance) AS "normalizedScore",
    page.content,
    COALESCE((SELECT array_agg(pc.country_id::text ORDER BY pc.country_id)
                FROM public.afrik_people_countries pc
               WHERE pc.people_id = page.id), '{}'::text[]) AS "currentCountries",
    page.confidence,
    -- Why this row matched, in the reader's own words. The document is the
    -- appellations block flattened to text — the same material the tsvector
    -- was built from — so a match on a historical region shows that region,
    -- and a reader can see for themselves that Amhara surfaced on
    -- "Wollo (Bete Amhara)" rather than being left to wonder. A fuzzy-only
    -- row carries a tsq that found nothing in its own document, so
    -- ts_headline returns the lead fragment unhighlighted rather than a
    -- marked excerpt — acceptable here since the row itself, not the
    -- snippet, is the evidence for a typo match.
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
    (SELECT jsonb_agg(to_jsonb(e) - 'exact_match' - 'lexical_match'
                      ORDER BY e.exact_match DESC, e.lexical_match DESC,
                               e.relevance DESC, e."nameMain" ASC, e.id ASC)
       FROM enriched e),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_peoples(
  TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT) IS
  'Ranked, paginated peoples search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Ranked by exact name_main match, then a lexical match on the weighted search_vector (ts_rank times a confidence multiplier), then a pg_trgm similarity fallback (>= 0.4) for a query that finds no lexical match at all — DEC-034''s typo-tolerance mechanism, migration 063. Each row also carries normalizedScore, the same ranking expressed on the cross-kind [0,1] scale of migration 068. A null or blank p_q switches the text predicate off, which is how "peoples of family X" and "peoples of country Y" are served here. Runs as the calling role, so it reads only what migrations 015 and 019 already publish to anon.';

REVOKE ALL ON FUNCTION public.afrik_search_peoples(
  TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_peoples(
  TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. afrik_search_countries — migration 052's body, plus normalizedScore
--
-- Countries had no lexical_match column: every row this function returns for
-- a non-blank query is a lexical hit, since there is no fuzzy fallback tier
-- here. It is materialised now because the shared score needs the class as an
-- input, and it is deliberately kept out of the ORDER BY — adding a tier that
-- is constant within a result set would change nothing but would make the
-- ordering harder to read.
-- ────────────────────────────────────────────────────────────────────────────
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
  SELECT c.id, c.name_fr, c.etymology, c.name_origin_actor, c.content,
         c.created_at, c.updated_at,
         COALESCE(
           (q.tsq IS NOT NULL AND c.search_vector @@ q.tsq)
           OR (q.tsq_unaccent IS NOT NULL
               AND c.name_unaccent_vector @@ q.tsq_unaccent),
           false) AS lexical_match,
         CASE
           WHEN q.is_browse THEN 0::real
           ELSE GREATEST(
             CASE WHEN q.tsq IS NOT NULL
                  THEN ts_rank('{0.1,0.3,0.6,1.0}', c.search_vector, q.tsq)
                  ELSE 0 END,
             CASE WHEN q.tsq_unaccent IS NOT NULL
                  THEN ts_rank('{0.1,0.3,0.6,1.0}', c.name_unaccent_vector,
                               q.tsq_unaccent)
                  ELSE 0 END
           )::real
         END AS relevance,
         (q.exact_key IS NOT NULL
          AND public.afrik_unaccent(lower(c.name_fr)) = q.exact_key) AS exact_match
  FROM public.afrik_countries c
  CROSS JOIN q
  WHERE q.is_browse
        OR (q.tsq IS NOT NULL AND c.search_vector @@ q.tsq)
        OR (q.tsq_unaccent IS NOT NULL
            AND c.name_unaccent_vector @@ q.tsq_unaccent)
),
page AS (
  SELECT m.* FROM matched m
  ORDER BY m.exact_match DESC, m.relevance DESC, m.name_fr ASC, m.id ASC
  LIMIT COALESCE(p_limit, 20) OFFSET COALESCE(p_offset, 0)
),
enriched AS (
  SELECT page.exact_match, page.lexical_match, page.relevance,
         page.id::text        AS id,
         page.name_fr         AS "nameFr",
         page.etymology,
         page.name_origin_actor AS "nameOriginActor",
         page.exact_match     AS "exactMatch",
         public.afrik_search_normalized_score(
           page.exact_match, page.lexical_match, page.relevance) AS "normalizedScore",
         page.content,
         CASE WHEN (SELECT is_browse FROM q) THEN NULL ELSE ts_headline(
           'french',
           concat_ws(' · ', nullif(page.name_fr, ''),
                            nullif(page.etymology, '')),
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
                      ORDER BY e.exact_match DESC, e.relevance DESC,
                               e."nameFr" ASC, e.id ASC)
       FROM enriched e),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_countries(TEXT, INT, INT) IS
  'Ranked, paginated countries search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Matches on the weighted search_vector (migration 043) OR the accent-insensitive name_unaccent_vector (migration 052), both queried with a last-word prefix operator (public.afrik_prefix_tsquery) — REQ-129. Each row also carries normalizedScore, the cross-kind [0,1] scale of migration 068. No confidence filters: confidence_scores covers entity_type=''people'' only (migration 014).';

REVOKE ALL ON FUNCTION public.afrik_search_countries(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_countries(TEXT, INT, INT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. afrik_search_persons — migration 065's body, plus normalizedScore
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
          public.afrik_unaccent(lower(p.full_name)),
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
            public.afrik_unaccent(lower(p.full_name)),
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
    public.afrik_search_normalized_score(
      page.exact_match, page.lexical_match, page.relevance) AS "normalizedScore",
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
  'Ranked, paginated persons search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Ranked by exact full_name match, then a prefix/accent-insensitive lexical match over search_vector or name_unaccent_vector (public.afrik_prefix_tsquery, mirroring 052), then a pg_trgm similarity fallback (>= 0.4, mirroring 063). Each row also carries normalizedScore, the cross-kind [0,1] scale of migration 068. No classification/confidence/family/country filters — those are peoples-only concepts. Runs as the calling role, so it reads only what migration 057 already publishes to anon. REQ-126.';

REVOKE ALL ON FUNCTION public.afrik_search_persons(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_persons(TEXT, INT, INT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. afrik_search_patronymes — migration 066's body, plus normalizedScore
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.afrik_search_patronymes(
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
         ELSE public.afrik_unaccent(lower(btrim(p_q))) END AS exact_key,
    CASE WHEN COALESCE(btrim(p_q), '') = '' THEN NULL
         ELSE extensions.dmetaphone(public.afrik_unaccent(btrim(p_q))) END AS phonetic_key
),
matched AS (
  SELECT
    p.id, p.name_main, p.name_system, p.caste_or_social_function, p.content,
    p.created_at, p.updated_at,
    (
      q.tsq IS NOT NULL AND (
        p.search_vector @@ q.tsq
        OR p.name_unaccent_vector @@ q.tsq_unaccent
        OR (q.phonetic_key IS NOT NULL AND p.name_phonetic = q.phonetic_key)
      )
    ) AS lexical_match,
    CASE
      WHEN q.is_browse THEN 0::real
      WHEN q.tsq IS NOT NULL AND (
             p.search_vector @@ q.tsq
             OR p.name_unaccent_vector @@ q.tsq_unaccent
             OR (q.phonetic_key IS NOT NULL AND p.name_phonetic = q.phonetic_key)
           ) THEN
        GREATEST(
          CASE WHEN p.search_vector @@ q.tsq
               THEN ts_rank('{0.1,0.3,0.6,1.0}', p.search_vector, q.tsq)
               ELSE 0 END,
          CASE WHEN p.name_unaccent_vector @@ q.tsq_unaccent
               THEN ts_rank('{0.1,0.3,0.6,1.0}', p.name_unaccent_vector,
                            q.tsq_unaccent)
               ELSE 0 END,
          -- Phonetic-only match carries no ts_rank magnitude of its own; a
          -- fixed mid-scale value keeps it below a real lexical hit on this
          -- continuous score while lexical_match (above) already guarantees
          -- it never outranks one regardless of magnitude.
          CASE WHEN q.phonetic_key IS NOT NULL
                    AND p.name_phonetic = q.phonetic_key
               THEN 0.5 ELSE 0 END
        )::real
      WHEN q.tsq IS NOT NULL THEN
        -- Fallback tier only — never reached when tier 2 already matched.
        extensions.similarity(
          public.afrik_unaccent(lower(p.name_main)),
          q.exact_key)::real
      ELSE 0::real
    END AS relevance,
    (q.exact_key IS NOT NULL
     AND public.afrik_unaccent(lower(p.name_main)) = q.exact_key) AS exact_match
  FROM public.afrik_patronymes p
  CROSS JOIN q
  WHERE (
      q.is_browse
      OR (q.tsq IS NOT NULL AND p.search_vector @@ q.tsq)
      OR (q.tsq_unaccent IS NOT NULL
          AND p.name_unaccent_vector @@ q.tsq_unaccent)
      OR (q.phonetic_key IS NOT NULL AND p.name_phonetic = q.phonetic_key)
      OR (q.exact_key IS NOT NULL AND extensions.similarity(
            public.afrik_unaccent(lower(p.name_main)),
            q.exact_key) >= 0.4)
    )
),
page AS (
  SELECT m.* FROM matched m
  ORDER BY m.exact_match DESC, m.lexical_match DESC, m.relevance DESC,
           m.name_main ASC, m.id ASC
  LIMIT COALESCE(p_limit, 20) OFFSET COALESCE(p_offset, 0)
),
enriched AS (
  SELECT
    page.exact_match,
    page.lexical_match,
    page.relevance,
    page.id::text                    AS id,
    page.name_main                   AS "nameMain",
    page.name_system::text           AS "nameSystem",
    page.caste_or_social_function    AS "casteOrSocialFunction",
    page.exact_match                 AS "exactMatch",
    public.afrik_search_normalized_score(
      page.exact_match, page.lexical_match, page.relevance) AS "normalizedScore",
    page.content,
    CASE WHEN (SELECT is_browse FROM q) THEN NULL ELSE ts_headline(
      'french',
      COALESCE(page.name_main, ''),
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
                               e.relevance DESC, e."nameMain" ASC, e.id ASC)
       FROM enriched e),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_patronymes(TEXT, INT, INT) IS
  'Ranked, paginated name (patronyme) search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Ranked by exact accent/apostrophe-insensitive name match, then a lexical tier that is a prefix/accent-insensitive match on search_vector or name_unaccent_vector OR a dmetaphone phonetic match (REQ-135 AC1), then a pg_trgm similarity fallback (>= 0.4, mirroring 063). Each row also carries normalizedScore, the cross-kind [0,1] scale of migration 068. A null or blank p_q browses the whole corpus. Runs as the calling role, so it reads only what migration 053 already publishes to anon.';

REVOKE ALL ON FUNCTION public.afrik_search_patronymes(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_patronymes(TEXT, INT, INT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. afrik_search_language_families
--
-- rankLanguageFamilies (src/lib/supabase/queries/afrik/search.ts) fetched all
-- 24 families over the wire, filtered them in JavaScript and assigned one of
-- four tier constants. The tiers are reproduced here verbatim — 1 / 0.6 / 0.3
-- / 0.1 — so `relevance` keeps the values callers already see; what changes
-- is where they are computed and that they now come with a normalizedScore.
--
-- The name ladder compares accent-folded strings rather than tsvectors: the
-- French stemmer does not fold accents, so "Mande" would not reach "Mandé"
-- through search_vector, and ILIKE compares characters literally and cannot
-- fold either. public.afrik_unaccent also strips apostrophes (066), which is
-- a superset of the JS normalizeString and affects no family name in the
-- corpus.
--
-- The prose tier is the migration 056 search_vector (DEC-028) — the only way
-- a term that appears solely in a family's decolonial text surfaces the
-- family at all.
--
-- A blank query returns nothing rather than the whole roster, matching the
-- JS it replaces: browsing families is what the families facet is for.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.afrik_search_language_families(
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
         ELSE public.afrik_unaccent(lower(btrim(p_q))) END AS exact_key,
    CASE WHEN COALESCE(btrim(p_q), '') = '' THEN NULL
         ELSE public.afrik_prefix_tsquery(btrim(p_q)) END AS tsq
),
matched AS (
  SELECT
    f.id, f.name_fr, f.name_en, f.classification_status, f.content,
    f.created_at, f.updated_at,
    (public.afrik_unaccent(lower(f.name_fr)) = q.exact_key) AS exact_match,
    (position(q.exact_key IN public.afrik_unaccent(lower(f.name_fr))) > 0)
      AS lexical_match,
    CASE
      WHEN public.afrik_unaccent(lower(f.name_fr)) = q.exact_key THEN 1.0::real
      WHEN starts_with(public.afrik_unaccent(lower(f.name_fr)), q.exact_key)
        THEN 0.6::real
      WHEN position(q.exact_key IN public.afrik_unaccent(lower(f.name_fr))) > 0
        THEN 0.3::real
      ELSE 0.1::real
    END AS relevance
  FROM public.afrik_language_families f
  CROSS JOIN q
  WHERE q.exact_key IS NOT NULL
    AND (position(q.exact_key IN public.afrik_unaccent(lower(f.name_fr))) > 0
         OR (q.tsq IS NOT NULL AND f.search_vector @@ q.tsq))
),
page AS (
  SELECT m.* FROM matched m
  ORDER BY m.exact_match DESC, m.relevance DESC, m.name_fr ASC, m.id ASC
  LIMIT COALESCE(p_limit, 20) OFFSET COALESCE(p_offset, 0)
),
enriched AS (
  SELECT
    page.exact_match,
    page.lexical_match,
    page.relevance,
    page.id::text                    AS id,
    page.name_fr                     AS "nameFr",
    page.name_en                     AS "nameEn",
    page.classification_status::text AS "classificationStatus",
    page.exact_match                 AS "exactMatch",
    public.afrik_search_normalized_score(
      page.exact_match, page.lexical_match, page.relevance) AS "normalizedScore",
    page.content,
    -- The document is the name plus the decolonial block flattened to text,
    -- so a family that surfaced only through its prose shows the reader the
    -- sentence responsible rather than just its own name.
    ts_headline(
      'french',
      concat_ws(' · ', nullif(page.name_fr, ''),
        nullif((SELECT string_agg(d.value #>> '{}', ' · ')
                  FROM jsonb_each(COALESCE(page.content -> 'decolonialHeader',
                                           '{}'::jsonb)) d(key, value)
                 WHERE jsonb_typeof(d.value) = 'string'), '')),
      (SELECT tsq FROM q),
      'StartSel=[[, StopSel=]], MaxFragments=1, MaxWords=22, MinWords=6, '
      'FragmentDelimiter= … , HighlightAll=FALSE'
    ) AS snippet,
    page.created_at AS "createdAt",
    page.updated_at AS "updatedAt"
  FROM page
)
SELECT jsonb_build_object(
  'total', (SELECT count(*) FROM matched),
  'rows', COALESCE(
    (SELECT jsonb_agg(to_jsonb(e) - 'exact_match' - 'lexical_match'
                      ORDER BY e.exact_match DESC, e.relevance DESC,
                               e."nameFr" ASC, e.id ASC)
       FROM enriched e),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_language_families(TEXT, INT, INT) IS
  'Ranked, paginated linguistic-family search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Replaces the JavaScript rankLanguageFamilies: accent-insensitive exact (1.0) > prefix (0.6) > substring (0.3) on name_fr, then a prose tier (0.1) through the migration 056 search_vector (DEC-028). Each row also carries normalizedScore, the cross-kind [0,1] scale of migration 068. A blank p_q matches nothing — browsing the roster is the facet''s job, not search''s. Runs as the calling role, so it reads only what migration 015 already publishes to anon. REQ-002, REQ-129.';

REVOKE ALL ON FUNCTION public.afrik_search_language_families(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_language_families(TEXT, INT, INT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. quiz_questions — searchable prose
--
-- One folded vector rather than a raw one plus an unaccented twin: unlike a
-- name, a question has no exact-equality tier to serve, so nothing here needs
-- the unfolded lexemes and a second GIN index would be dead weight. Queries
-- are folded the same way before matching.
--
-- Weighting follows what a match means: the stem (A) is what the question
-- asks, the stimulus (C) is the fiche prose it quotes, and the explanation
-- (D) is the justification. The explanation is indexed because a term may
-- appear nowhere else in the row — and never returned, because it states the
-- answer.
--
-- The index is partial on revoked_at IS NULL, matching migration 047's
-- serving indexes: a revoked question is unreachable through this function
-- and through the table's own RLS policy, so indexing one would be pure cost.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('french',
      public.afrik_unaccent(COALESCE(prompt_fr, ''))), 'A')
    || setweight(to_tsvector('french',
         public.afrik_unaccent(COALESCE(stimulus_fr, ''))), 'C')
    || setweight(to_tsvector('french',
         public.afrik_unaccent(COALESCE(explanation_fr, ''))), 'D')
  ) STORED;

COMMENT ON COLUMN public.quiz_questions.search_vector IS
  'Accent-folded weighted French tsvector: A = prompt_fr, C = stimulus_fr, D = explanation_fr. Folded through public.afrik_unaccent so a query folded the same way matches whatever accents the reader typed. Queried by public.afrik_search_quiz (migration 068); the explanation is searchable but never returned, since it states the answer.';

CREATE INDEX IF NOT EXISTS idx_quiz_questions_search_vector
  ON public.quiz_questions USING gin(search_vector)
  WHERE revoked_at IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. afrik_search_quiz
--
-- The subject join is what makes the bank findable at all: a reader searches
-- for a people or a country, not for the wording of a question. Matching goes
-- through the subject's own name_unaccent_vector (052) rather than a fresh
-- expression, so it stays index-backed and folds accents identically to every
-- other kind. entity_type is the plain TEXT of the Module 0 convention
-- (migration 009), with 'people' and 'country' the two values the generator
-- writes; a row pointing at anything else joins to no subject and can still
-- be reached through its own prose.
--
-- The projection is a closed list. options_fr and correct_option are the
-- answer key and never leave the database through this path; explanation_fr
-- is searched but not projected, and the snippet is built from the subject,
-- the stem and the stimulus only, so no fragment of the justification can
-- reach a reader who has not answered.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.afrik_search_quiz(
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
         ELSE public.afrik_prefix_tsquery(btrim(p_q)) END AS tsq,
    CASE WHEN COALESCE(btrim(p_q), '') = '' THEN NULL
         ELSE public.afrik_prefix_tsquery(
                public.afrik_unaccent(btrim(p_q))) END AS tsq_unaccent,
    CASE WHEN COALESCE(btrim(p_q), '') = '' THEN NULL
         ELSE public.afrik_unaccent(lower(btrim(p_q))) END AS exact_key
),
matched AS (
  SELECT
    qq.id, qq.prompt_fr, qq.stimulus_fr, qq.entity_type, qq.entity_id,
    COALESCE(sp.name_main, sc.name_fr) AS subject_name,
    COALESCE(
      qq.search_vector @@ q.tsq_unaccent
      OR sp.name_unaccent_vector @@ q.tsq_unaccent
      OR sc.name_unaccent_vector @@ q.tsq_unaccent,
      false) AS lexical_match,
    GREATEST(
      CASE WHEN qq.search_vector @@ q.tsq_unaccent
           THEN ts_rank('{0.1,0.3,0.6,1.0}', qq.search_vector, q.tsq_unaccent)
           ELSE 0 END,
      CASE WHEN sp.name_unaccent_vector @@ q.tsq_unaccent
           THEN ts_rank('{0.1,0.3,0.6,1.0}', sp.name_unaccent_vector,
                        q.tsq_unaccent)
           ELSE 0 END,
      CASE WHEN sc.name_unaccent_vector @@ q.tsq_unaccent
           THEN ts_rank('{0.1,0.3,0.6,1.0}', sc.name_unaccent_vector,
                        q.tsq_unaccent)
           ELSE 0 END
    )::real AS relevance,
    -- "Exact" for a quiz row means the reader named its subject, not that
    -- they retyped the stem.
    (q.exact_key IS NOT NULL
     AND public.afrik_unaccent(lower(COALESCE(sp.name_main, sc.name_fr, '')))
         = q.exact_key) AS exact_match
  FROM public.quiz_questions qq
  CROSS JOIN q
  LEFT JOIN public.afrik_peoples sp
    ON qq.entity_type = 'people' AND sp.id = qq.entity_id
  LEFT JOIN public.afrik_countries sc
    ON qq.entity_type = 'country' AND sc.id = qq.entity_id
  WHERE qq.revoked_at IS NULL
    AND q.tsq_unaccent IS NOT NULL
    AND (qq.search_vector @@ q.tsq_unaccent
         OR sp.name_unaccent_vector @@ q.tsq_unaccent
         OR sc.name_unaccent_vector @@ q.tsq_unaccent)
),
page AS (
  SELECT m.* FROM matched m
  ORDER BY m.exact_match DESC, m.lexical_match DESC, m.relevance DESC,
           m.subject_name ASC, m.id ASC
  LIMIT COALESCE(p_limit, 20) OFFSET COALESCE(p_offset, 0)
),
enriched AS (
  SELECT
    page.exact_match,
    page.lexical_match,
    page.relevance,
    page.id::text     AS id,
    page.prompt_fr    AS prompt,
    page.entity_type  AS "entityType",
    page.entity_id    AS "entityId",
    page.subject_name AS "subjectName",
    page.exact_match  AS "exactMatch",
    public.afrik_search_normalized_score(
      page.exact_match, page.lexical_match, page.relevance) AS "normalizedScore",
    ts_headline(
      'french',
      concat_ws(' · ', nullif(page.subject_name, ''),
                       nullif(page.prompt_fr, ''),
                       nullif(page.stimulus_fr, '')),
      COALESCE((SELECT tsq FROM q), (SELECT tsq_unaccent FROM q)),
      'StartSel=[[, StopSel=]], MaxFragments=1, MaxWords=22, MinWords=6, '
      'FragmentDelimiter= … , HighlightAll=FALSE'
    ) AS snippet
  FROM page
)
SELECT jsonb_build_object(
  'total', (SELECT count(*) FROM matched),
  'rows', COALESCE(
    (SELECT jsonb_agg(to_jsonb(e) - 'exact_match' - 'lexical_match'
                      ORDER BY e.exact_match DESC, e.lexical_match DESC,
                               e.relevance DESC, e."subjectName" ASC, e.id ASC)
       FROM enriched e),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_quiz(TEXT, INT, INT) IS
  'Ranked, paginated search over the active quiz bank. Returns {"total": <corpus-wide match count>, "rows": [...]}. Only rows with revoked_at IS NULL are visible, matching the table''s own RLS policy (migration 036). Matches the stem, the stimulus, the explanation and the subject entity''s name; ranks a row whose subject the reader named above one that merely mentions the term. Rows carry id, prompt, entityType, entityId, subjectName, snippet, relevance, exactMatch and normalizedScore — never options_fr or correct_option (the answer key) and never explanation_fr (which states the answer). A blank p_q matches nothing. Runs as the calling role. REQ-002, REQ-121.';

REVOKE ALL ON FUNCTION public.afrik_search_quiz(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_quiz(TEXT, INT, INT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- 1. The score is bounded and ordered by match class, not by magnitude:
--      SELECT public.afrik_search_normalized_score(true,  true,  0.0),
--             public.afrik_search_normalized_score(false, true,  9e9),
--             public.afrik_search_normalized_score(false, false, 9e9),
--             public.afrik_search_normalized_score(false, false, NULL);
--      -- expect 0.9, < 0.9, < 0.5, 0 — every value inside [0,1]
--
-- 2. An exact hit on one kind outscores a lexical hit on another, which is
--    the whole point of the migration:
--      SELECT (public.afrik_search_peoples('Wolof', 1, 0) #>> '{rows,0,normalizedScore}')::real
--           > (public.afrik_search_countries('mali', 1, 0) #>> '{rows,0,normalizedScore}')::real;
--      -- expect true whenever the first is exact and the second is not
--
-- 3. Every kind now returns the key:
--      SELECT public.afrik_search_persons('keita', 1, 0) #> '{rows,0,normalizedScore}',
--             public.afrik_search_patronymes('keita', 1, 0) #> '{rows,0,normalizedScore}';
--      -- expect two non-null numbers
--
-- 4. Families rank in SQL with the tiers the JS used:
--      SELECT public.afrik_search_language_families('Mande', 5, 0) #>> '{rows,0,nameFr}';
--      -- expect Mandé — accent-insensitive, and relevance 1.0 on an exact hit
--      SELECT public.afrik_search_language_families('administrateurs', 5, 0) -> 'total';
--      -- expect >= 1 (FLG_KROU, via the decolonial prose tier only)
--      SELECT public.afrik_search_language_families('', 5, 0) -> 'total';
--      -- expect 0 — a blank query is not a browse here
--
-- 5. The quiz bank is reachable by its subject and hides its answers:
--      SELECT public.afrik_search_quiz('Wolof', 3, 0) #>> '{rows,0,subjectName}';
--      -- expect Wolof
--      SELECT jsonb_object_keys(public.afrik_search_quiz('Wolof', 1, 0) #> '{rows,0}');
--      -- expect exactly: id, prompt, entityType, entityId, subjectName,
--      -- exactMatch, normalizedScore, relevance, snippet — no options_fr,
--      -- no correct_option, no explanation
--
-- 6. A revoked question is invisible:
--      SELECT count(*) FROM quiz_questions WHERE revoked_at IS NOT NULL;
--      -- then confirm none of those ids appear in any afrik_search_quiz page
--
-- 7. The partial GIN index exists:
--      SELECT indexname FROM pg_indexes WHERE tablename = 'quiz_questions'
--       AND indexname = 'idx_quiz_questions_search_vector';
--      -- expect 1 row
--
-- 8. Callable with the anon key — this is the invoker-rights claim:
--      SET ROLE anon;
--      SELECT public.afrik_search_language_families('mande', 1, 0);
--      SELECT public.afrik_search_quiz('wolof', 1, 0);
--      RESET ROLE;
--      -- expect results, not "permission denied for function"
