-- Migration 082 — search reaches a country, a family and a language by its
-- English name (ETNI-1857, REQ-141, REQ-143)
--
-- Context: the bilingual programme publishes the atlas under two locales, and
-- search ranks in SQL. An English reader typing "Chad" reached nothing —
-- the corpus held only "Tchad", and nine of the 54 countries are
-- unreachable from their English name even by prefix; nineteen of the 24
-- family names only surfaced through the prose tier (0.1) because the
-- ladder of migration 069 compares name_fr alone. None of that needs
-- translated content: it needs the English *names* the corpus already
-- carries (families: name_en, 056; languages: content.nameEn) plus the one
-- it did not (countries — filled on all 54 fiches by the same story), and a
-- way for the caller to say which locale it serves.
--
-- What this migration does:
--
--   1. afrik_countries.name_en — the English name of ordinary use in the
--      state's own English form (docs/editorial/translation-classes.md).
--      NULL-able so the column ships before the corpus reload fills it.
--   2. search_query_log.lang — which locale each logged query was served
--      in, NOT NULL and constrained to en|fr, with NO default: a writer that
--      does not say which locale it served is a bug to surface, not a French
--      query to assume. Existing rows are backfilled to 'fr' first, because
--      until now the surface only ever answered in French.
--   3. The four ranking functions whose rows carry a locale-bound name are
--      re-issued with a trailing `p_lang TEXT DEFAULT 'fr'`, so every
--      existing caller stays valid. When p_lang = 'en', the exact-match test
--      and the ladder read the English name; the French vectors and queries
--      are untouched, so a French request ranks exactly as before.
--
-- Why DROP then CREATE, not CREATE OR REPLACE alone: a function with a new
-- parameter list beside the old one is an overload, and PostgREST answers a
-- call to an overloaded name with PGRST203 "ambiguous". The old signature is
-- dropped first; nothing depends on it (no view, no trigger).
--
-- Why a string ladder for the English name and not a second tsvector: the
-- names are proper nouns, an English name must not go through the French
-- stemmer, and the French prefix tsquery of migration 052 would not match a
-- 'simple'-config vector by construction. The families already rank on an
-- accent-folded string ladder (069: exact 1.0 > prefix 0.6 > substring 0.3);
-- countries and languages reuse it for their English name. Fifty-four
-- countries and two dozen languages need no index for that. The English
-- prose vector over the translation records is a later story, not this one.
--
-- Rollout is two-step: recette on merge (migrate-recette.yml), production on
-- Release through the SSH-tunnel `migrate` job. Old code against the new
-- functions keeps working (the parameter has a default); new code that
-- sends p_lang against the old functions answers PGRST202, which is why the
-- query layer only sends p_lang when the request carries a locale.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. afrik_countries.name_en
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.afrik_countries
  ADD COLUMN IF NOT EXISTS name_en TEXT;

COMMENT ON COLUMN public.afrik_countries.name_en IS
  'English name of ordinary use in the state''s own English form — Chad, Côte d''Ivoire, Cabo Verde, The Gambia — never the cartographer''s wording (Ivory Coast, Cape Verde). Loaded from the fiche''s nameEn (modele-pays.json, class-1 invariant under REQ-143). Read by afrik_search_countries when p_lang = ''en''. ETNI-1857.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. search_query_log.lang
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.search_query_log
  ADD COLUMN IF NOT EXISTS lang TEXT;

UPDATE public.search_query_log SET lang = 'fr' WHERE lang IS NULL;

ALTER TABLE public.search_query_log
  ALTER COLUMN lang SET NOT NULL;

ALTER TABLE public.search_query_log
  DROP CONSTRAINT IF EXISTS search_query_log_lang_check;
ALTER TABLE public.search_query_log
  ADD CONSTRAINT search_query_log_lang_check CHECK (lang IN ('en', 'fr'));

COMMENT ON COLUMN public.search_query_log.lang IS
  'Locale the search was served in (en | fr). No default on purpose: a row that does not say which locale it served is a bug, not a French query. Rows older than migration 082 were backfilled to fr, the only locale the surface answered in until then. ETNI-1857, REQ-141.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. afrik_search_peoples — migration 069's body, plus p_lang and the
--    family's English name on every row
--
-- The body ranks on name_main and the French prose vector in both locales:
-- a people's name is an autonym or an exonym, invariant under REQ-143, so
-- there is no English name to ladder. p_lang is accepted so the four
-- functions share one calling convention and the English prose tier of a
-- later story does not need a second DROP/CREATE window; the projection
-- carries languageFamilyNameEn regardless of p_lang, so the caller can label
-- the family chip in the locale it serves.
-- ────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.afrik_search_peoples(TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.afrik_search_peoples(
  p_q                     TEXT        DEFAULT NULL,
  p_limit                 INT         DEFAULT 20,
  p_offset                INT         DEFAULT 0,
  p_classification_status TEXT        DEFAULT NULL,
  p_min_confidence        NUMERIC     DEFAULT NULL,
  p_since_verified_after  TIMESTAMPTZ DEFAULT NULL,
  p_family_id             TEXT        DEFAULT NULL,
  p_country_id            TEXT        DEFAULT NULL,
  p_lang                  TEXT        DEFAULT 'fr'
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
    lf.name_en                       AS "languageFamilyNameEn",
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
  TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT, TEXT) IS
  'Ranked, paginated peoples search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Ranked by exact name_main match, then a lexical match on the weighted search_vector (ts_rank times a confidence multiplier), then a pg_trgm similarity fallback (>= 0.4) for a query that finds no lexical match at all — DEC-034''s typo-tolerance mechanism, migration 063. Each row also carries normalizedScore, the same ranking expressed on the cross-kind [0,1] scale of migration 069, and languageFamilyNameEn beside languageFamilyName (migration 082) so the family chip can be labelled in the locale served. p_lang (en | fr, default fr) is accepted for the shared calling convention; a people''s name is invariant, so the ranking is the same in both locales. A null or blank p_q switches the text predicate off, which is how "peoples of family X" and "peoples of country Y" are served here. Runs as the calling role, so it reads only what migrations 015 and 019 already publish to anon.';

REVOKE ALL ON FUNCTION public.afrik_search_peoples(TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_peoples(TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. afrik_search_countries — migration 069's body, plus the English ladder
--
-- In French the predicate, the relevance and the exact test are those of
-- 069 to the letter. In English the folded name_en joins each of them
-- through the families' ladder: a row matches when the folded query is a
-- substring of the folded English name; its relevance is the greater of the
-- French ts_rank and the ladder tier; exactMatch fires on either name, so a
-- reader who types the French name under the English locale still gets an
-- exact hit. Rows sort on the locale's name.
-- ────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.afrik_search_countries(TEXT, INT, INT);

CREATE OR REPLACE FUNCTION public.afrik_search_countries(
  p_q      TEXT DEFAULT NULL,
  p_limit  INT  DEFAULT 20,
  p_offset INT  DEFAULT 0,
  p_lang   TEXT DEFAULT 'fr'
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
  SELECT c.id, c.name_fr, c.name_en, c.etymology, c.name_origin_actor,
         c.content, c.created_at, c.updated_at,
         CASE WHEN p_lang = 'en' THEN COALESCE(c.name_en, c.name_fr)
              ELSE c.name_fr END AS sort_name,
         COALESCE(
           (q.tsq IS NOT NULL AND c.search_vector @@ q.tsq)
           OR (q.tsq_unaccent IS NOT NULL
               AND c.name_unaccent_vector @@ q.tsq_unaccent)
           OR (en.name_key IS NOT NULL
               AND position(q.exact_key IN en.name_key) > 0),
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
                  ELSE 0 END,
             CASE
               WHEN en.name_key IS NULL THEN 0::real
               WHEN en.name_key = q.exact_key THEN 1.0::real
               WHEN starts_with(en.name_key, q.exact_key) THEN 0.6::real
               WHEN position(q.exact_key IN en.name_key) > 0 THEN 0.3::real
               ELSE 0::real
             END
           )::real
         END AS relevance,
         (q.exact_key IS NOT NULL
          AND (public.afrik_unaccent(lower(c.name_fr)) = q.exact_key
               OR (en.name_key IS NOT NULL AND en.name_key = q.exact_key))
         ) AS exact_match
  FROM public.afrik_countries c
  CROSS JOIN q
  -- The folded English name, computed once per row and only under the
  -- English locale; NULL otherwise, which every predicate above reads as
  -- "no English rung".
  CROSS JOIN LATERAL (
    SELECT CASE WHEN p_lang = 'en' AND c.name_en IS NOT NULL
                     AND q.exact_key IS NOT NULL
                THEN public.afrik_unaccent(lower(c.name_en)) END AS name_key
  ) en
  WHERE q.is_browse
        OR (q.tsq IS NOT NULL AND c.search_vector @@ q.tsq)
        OR (q.tsq_unaccent IS NOT NULL
            AND c.name_unaccent_vector @@ q.tsq_unaccent)
        OR (en.name_key IS NOT NULL
            AND position(q.exact_key IN en.name_key) > 0)
),
page AS (
  SELECT m.* FROM matched m
  ORDER BY m.exact_match DESC, m.relevance DESC, m.sort_name ASC, m.id ASC
  LIMIT COALESCE(p_limit, 20) OFFSET COALESCE(p_offset, 0)
),
enriched AS (
  SELECT page.exact_match, page.lexical_match, page.relevance, page.sort_name,
         page.id::text        AS id,
         page.name_fr         AS "nameFr",
         page.name_en         AS "nameEn",
         page.etymology,
         page.name_origin_actor AS "nameOriginActor",
         page.exact_match     AS "exactMatch",
         public.afrik_search_normalized_score(
           page.exact_match, page.lexical_match, page.relevance) AS "normalizedScore",
         page.content,
         -- Under the English locale the English name leads the document, so
         -- the excerpt can show the reader the name that matched.
         CASE WHEN (SELECT is_browse FROM q) THEN NULL ELSE ts_headline(
           'french',
           concat_ws(' · ',
                     CASE WHEN p_lang = 'en' THEN nullif(page.name_en, '') END,
                     nullif(page.name_fr, ''),
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
    (SELECT jsonb_agg(to_jsonb(e) - 'exact_match' - 'lexical_match' - 'sort_name'
                      ORDER BY e.exact_match DESC, e.relevance DESC,
                               e.sort_name ASC, e.id ASC)
       FROM enriched e),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_countries(TEXT, INT, INT, TEXT) IS
  'Ranked, paginated countries search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Matches on the weighted search_vector (migration 043) OR the accent-insensitive name_unaccent_vector (migration 052), both queried with a last-word prefix operator (public.afrik_prefix_tsquery) — REQ-129. With p_lang = ''en'' (migration 082) the accent-folded name_en also matches through the families'' ladder — exact (1.0) > prefix (0.6) > substring (0.3) — and exactMatch fires on either name. Each row carries nameEn beside nameFr and normalizedScore, the cross-kind [0,1] scale of migration 069. No confidence filters: confidence_scores covers entity_type=''people'' only (migration 014).';

REVOKE ALL ON FUNCTION public.afrik_search_countries(TEXT, INT, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_countries(TEXT, INT, INT, TEXT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. afrik_search_language_families — migration 069's ladder over the
--    locale's name
--
-- The ladder is unchanged (exact 1.0 > prefix 0.6 > substring 0.3, prose
-- 0.1); what changes is the string it climbs: name_fr in French, name_en in
-- English — falling back to name_fr for a family the corpus has not named in
-- English, so no family goes dark under the English locale. "Cushitic" and
-- "Kru" become exact hits instead of prose-tier fallbacks.
-- ────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.afrik_search_language_families(TEXT, INT, INT);

CREATE OR REPLACE FUNCTION public.afrik_search_language_families(
  p_q      TEXT DEFAULT NULL,
  p_limit  INT  DEFAULT 20,
  p_offset INT  DEFAULT 0,
  p_lang   TEXT DEFAULT 'fr'
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
    n.ladder_name AS sort_name,
    (n.name_key = q.exact_key) AS exact_match,
    (position(q.exact_key IN n.name_key) > 0) AS lexical_match,
    CASE
      WHEN n.name_key = q.exact_key THEN 1.0::real
      WHEN starts_with(n.name_key, q.exact_key) THEN 0.6::real
      WHEN position(q.exact_key IN n.name_key) > 0 THEN 0.3::real
      ELSE 0.1::real
    END AS relevance
  FROM public.afrik_language_families f
  CROSS JOIN q
  CROSS JOIN LATERAL (
    SELECT ladder_name, public.afrik_unaccent(lower(ladder_name)) AS name_key
    FROM (SELECT CASE WHEN p_lang = 'en' THEN COALESCE(f.name_en, f.name_fr)
                      ELSE f.name_fr END AS ladder_name) l
  ) n
  WHERE q.exact_key IS NOT NULL
    AND (position(q.exact_key IN n.name_key) > 0
         OR (q.tsq IS NOT NULL AND f.search_vector @@ q.tsq))
),
page AS (
  SELECT m.* FROM matched m
  ORDER BY m.exact_match DESC, m.relevance DESC, m.sort_name ASC, m.id ASC
  LIMIT COALESCE(p_limit, 20) OFFSET COALESCE(p_offset, 0)
),
enriched AS (
  SELECT
    page.exact_match,
    page.lexical_match,
    page.relevance,
    page.sort_name,
    page.id::text                    AS id,
    page.name_fr                     AS "nameFr",
    page.name_en                     AS "nameEn",
    page.classification_status::text AS "classificationStatus",
    page.exact_match                 AS "exactMatch",
    public.afrik_search_normalized_score(
      page.exact_match, page.lexical_match, page.relevance) AS "normalizedScore",
    page.content,
    -- The document is the locale's name plus the decolonial block flattened
    -- to text, so a family that surfaced only through its prose shows the
    -- reader the sentence responsible rather than just its own name.
    ts_headline(
      'french',
      concat_ws(' · ', nullif(page.sort_name, ''),
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
    (SELECT jsonb_agg(to_jsonb(e) - 'exact_match' - 'lexical_match' - 'sort_name'
                      ORDER BY e.exact_match DESC, e.relevance DESC,
                               e.sort_name ASC, e.id ASC)
       FROM enriched e),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_language_families(TEXT, INT, INT, TEXT) IS
  'Ranked, paginated linguistic-family search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Accent-insensitive exact (1.0) > prefix (0.6) > substring (0.3) on the locale''s name — name_fr, or name_en with p_lang = ''en'' (migration 082, falling back to name_fr where the English name is missing) — then a prose tier (0.1) through the migration 056 search_vector (DEC-028). Each row also carries normalizedScore, the cross-kind [0,1] scale of migration 069. A blank p_q matches nothing — browsing the roster is the facet''s job, not search''s. Runs as the calling role, so it reads only what migration 015 already publishes to anon. REQ-002, REQ-129, REQ-141.';

REVOKE ALL ON FUNCTION public.afrik_search_language_families(TEXT, INT, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_language_families(TEXT, INT, INT, TEXT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. afrik_search_languages — migration 068's body, plus the English ladder
--
-- A language's English name lives on its fiche (content.nameEn, indexed
-- nowhere), so the ladder reads it from the JSON. The ISO 639-3 exact test
-- stays: a code is a code in both locales.
-- ────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.afrik_search_languages(TEXT, INT, INT);

CREATE OR REPLACE FUNCTION public.afrik_search_languages(
  p_q      TEXT DEFAULT NULL,
  p_limit  INT  DEFAULT 20,
  p_offset INT  DEFAULT 0,
  p_lang   TEXT DEFAULT 'fr'
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
         CASE WHEN p_lang = 'en' THEN COALESCE(l.content ->> 'nameEn', l.name)
              ELSE l.name END AS sort_name,
         CASE
           WHEN q.is_browse THEN 0::real
           ELSE GREATEST(
             CASE WHEN q.tsq IS NOT NULL
                  THEN ts_rank('{0.1,0.3,0.6,1.0}', l.search_vector, q.tsq)
                  ELSE 0 END,
             CASE WHEN q.tsq_unaccent IS NOT NULL
                  THEN ts_rank('{0.1,0.3,0.6,1.0}', l.name_unaccent_vector,
                               q.tsq_unaccent)
                  ELSE 0 END,
             CASE
               WHEN en.name_key IS NULL THEN 0::real
               WHEN en.name_key = q.exact_key THEN 1.0::real
               WHEN starts_with(en.name_key, q.exact_key) THEN 0.6::real
               WHEN position(q.exact_key IN en.name_key) > 0 THEN 0.3::real
               ELSE 0::real
             END
           )::real
         END AS relevance,
         -- Exact on the ISO 639-3 id, on the accent/case-folded name, or on
         -- the folded English name under the English locale — a reader who
         -- types "swa" has named the language exactly as precisely as one
         -- who types "Swahili" (REQ-136 AC: "a language name — or an ISO
         -- code").
         (q.exact_key IS NOT NULL
          AND (lower(l.id) = q.exact_key
               OR public.afrik_unaccent(lower(l.name)) = q.exact_key
               OR (en.name_key IS NOT NULL AND en.name_key = q.exact_key))
         ) AS exact_match
  FROM public.afrik_languages l
  CROSS JOIN q
  CROSS JOIN LATERAL (
    SELECT CASE WHEN p_lang = 'en' AND q.exact_key IS NOT NULL
                     AND nullif(l.content ->> 'nameEn', '') IS NOT NULL
                THEN public.afrik_unaccent(lower(l.content ->> 'nameEn')) END
           AS name_key
  ) en
  WHERE q.is_browse
        OR (q.tsq IS NOT NULL AND l.search_vector @@ q.tsq)
        OR (q.tsq_unaccent IS NOT NULL
            AND l.name_unaccent_vector @@ q.tsq_unaccent)
        OR (en.name_key IS NOT NULL
            AND position(q.exact_key IN en.name_key) > 0)
),
page AS (
  SELECT m.* FROM matched m
  ORDER BY m.exact_match DESC, m.relevance DESC, m.sort_name ASC, m.id ASC
  LIMIT COALESCE(p_limit, 20) OFFSET COALESCE(p_offset, 0)
),
enriched AS (
  SELECT page.exact_match, page.relevance, page.sort_name,
         page.id::text          AS id,
         page.name              AS "name",
         page.content ->> 'nameEn' AS "nameEn",
         page.family_id::text   AS "familyId",
         lf.name_fr             AS "familyName",
         lf.name_en             AS "familyNameEn",
         page.exact_match       AS "exactMatch",
         page.content,
         CASE WHEN (SELECT is_browse FROM q) THEN NULL ELSE ts_headline(
           'french',
           COALESCE(page.sort_name, ''),
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
    (SELECT jsonb_agg(to_jsonb(e) - 'exact_match' - 'sort_name'
                      ORDER BY e.exact_match DESC, e.relevance DESC,
                               e.sort_name ASC, e.id ASC)
       FROM enriched e),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_languages(TEXT, INT, INT, TEXT) IS
  'Ranked, paginated language search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Matches on the weighted search_vector (migration 055: A = ISO 639-3 id and sourced name, B = alternate names, C = derived name) OR the accent-insensitive name_unaccent_vector (migration 068), both queried with a last-word prefix operator (public.afrik_prefix_tsquery) — REQ-136. With p_lang = ''en'' (migration 082) the accent-folded content.nameEn also matches through the families'' ladder — exact (1.0) > prefix (0.6) > substring (0.3). The exact-match bonus fires on the ISO 639-3 id as well as either name. Each row carries nameEn and familyNameEn beside name and familyName. No confidence/classification filters: afrik_languages carries neither. SECURITY INVOKER: reads only afrik_languages and afrik_language_families, already published to anon by migration 006.';

REVOKE ALL ON FUNCTION public.afrik_search_languages(TEXT, INT, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_languages(TEXT, INT, INT, TEXT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- Verification (after the corpus reload has filled afrik_countries.name_en)
-- ────────────────────────────────────────────────────────────────────────────
-- 1. The English name reaches the country, exactly:
--      SELECT public.afrik_search_countries('Chad', 5, 0, 'en') -> 'rows' -> 0;
--      -- expect id "TCD", exactMatch true, nameEn "Chad"
--
-- 2. And by prefix:
--      SELECT public.afrik_search_countries('Sou', 5, 0, 'en') #>> '{rows,0,id}';
--      -- expect SDN or SSD or ZAF (relevance 0.6 each, sorted on nameEn)
--
-- 3. The French ranking is unchanged — the same call without p_lang:
--      SELECT public.afrik_search_countries('Tchad', 5, 0) #>> '{rows,0,id}';
--      -- expect TCD, exactMatch true
--
-- 4. A family reaches its English name exactly instead of the prose tier:
--      SELECT public.afrik_search_language_families('Cushitic', 5, 0, 'en')
--             -> 'rows' -> 0;
--      -- expect relevance 1.0, exactMatch true
--
-- 5. A language by its English name:
--      SELECT public.afrik_search_languages('Standard Arabic', 5, 0, 'en')
--             #>> '{rows,0,id}';
--      -- expect arb
--
-- 6. Peoples project the family's English name:
--      SELECT public.afrik_search_peoples('Yoruba') #>> '{rows,0,languageFamilyNameEn}';
--
-- 7. Exactly one signature per function — an overload here answers PGRST203:
--      SELECT proname, count(*) FROM pg_proc
--       WHERE proname IN ('afrik_search_peoples', 'afrik_search_countries',
--                         'afrik_search_language_families', 'afrik_search_languages')
--       GROUP BY 1;
--      -- expect count 1 on every row
--
-- 8. The query log refuses a row with no locale:
--      INSERT INTO public.search_query_log (query, result_count) VALUES ('x', 0);
--      -- expect: null value in column "lang" violates not-null constraint
--
-- 9. Callable with the anon key — the SECURITY INVOKER claim:
--      SET ROLE anon; SELECT public.afrik_search_countries('Chad', 1, 0, 'en'); RESET ROLE;
