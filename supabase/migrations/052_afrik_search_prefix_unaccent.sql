-- Migration 052 — Prefix matching and accent-insensitive name matching (REQ-129)
--
-- Context: REQ-129 requires "bamba" to find "Bambara" and "mande" (no accent)
-- to find "Mandé". Neither holds today. websearch_to_tsquery has no prefix
-- operator, so a partial final word never matches a longer indexed lexeme.
-- And although migration 044's own comment asserted the stock 'french' text
-- search configuration "already unaccents for matching purposes", the
-- REQ-129 business value states plainly that "mande" does not surface
-- "Mandé" today — that assumption did not hold in practice. This migration
-- stops depending on incidental stemmer behaviour and makes both guarantees
-- explicit.
--
-- Two changes, scoped to what REQ-129 actually asks for — "an incomplete
-- term must match entities whose *indexed name* begins with it":
--
--   1. Prefix matching, on the whole matched surface. `websearch_to_tsquery`
--      is replaced by `public.afrik_prefix_tsquery`, which stems each word of
--      the input individually and appends the `:*` prefix operator to only
--      the *last* one — a search-as-you-type pattern where already-typed
--      words match as words and the trailing word matches as a stem prefix.
--      This runs against the existing weighted `search_vector` (migration
--      043), so prose and exonym matches (e.g. "Wollo" finding Amhara) keep
--      working exactly as before.
--
--   2. Accent-insensitive matching, scoped to the entity's own name
--      (`name_main` / `name_fr` — the "indexed name" REQ-129 names), not the
--      full prose surface. A new generated, indexed column holds that name
--      run through `public.afrik_unaccent` before `to_tsvector`, so the
--      accent fold happens once, in storage, "by construction" rather than
--      being left to whichever stemmer behaviour happens to apply on a given
--      query. The match predicate becomes an OR of the original weighted
--      vector and this new unaccented-name vector, so a query that only
--      matches through the accent-insensitive path still surfaces the row.
--
-- `public.afrik_unaccent` wraps the two-argument `unaccent(regdictionary,
-- text)` used already in 044. That form is documented there as IMMUTABLE
-- (unlike the one-argument `unaccent(text)`, which resolves its dictionary
-- through search_path and is only STABLE) — which is exactly what a
-- GENERATED column requires, and why 044 uses that form and not the other
-- one. Wrapping it here names the contract once instead of repeating the
-- `'extensions.unaccent'::regdictionary` cast at every call site.
--
-- `public.afrik_prefix_tsquery` never returns NULL for a non-blank,
-- all-stopword input (e.g. "le") — it falls back to a token that matches no
-- real document. Returning NULL there would be indistinguishable from browse
-- mode (blank `p_q`) in the callers below, which treat a NULL tsquery as
-- "no text predicate, list everything". Browse mode itself is now carried by
-- its own `is_browse` flag rather than inferred from a NULL tsquery, so the
-- two cases can no longer be confused.
--
-- Out of scope: pg_trgm and its index (tracked separately — "Migration:
-- install pg_trgm and its index (DEC-034)"). This migration does not touch
-- 043 or 044 in place; both are superseded by CREATE OR REPLACE here with the
-- same function signatures, so the query layer needs no change.
--
-- Note: this drops websearch_to_tsquery syntax (quoted phrases, OR,
-- exclusions) in favour of the search-as-you-type prefix behaviour. That loss
-- is accepted by DEC-034.
--
-- Idempotent: CREATE OR REPLACE FUNCTION, ADD COLUMN IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS, REVOKE then GRANT.
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project. Both must be applied before the application code
-- that calls these functions is deployed, or every search answers PGRST202
-- — the functions keep their existing signatures, so this is a behaviour
-- change on already-deployed call sites, not a new contract.

-- ────────────────────────────────────────────────────────────────────────────
-- 0. Helper functions
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.afrik_unaccent(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, extensions, pg_temp
AS $$
  SELECT extensions.unaccent('extensions.unaccent'::regdictionary,
                             COALESCE(p_text, ''));
$$;

COMMENT ON FUNCTION public.afrik_unaccent(TEXT) IS
  'IMMUTABLE accent fold, usable inside a GENERATED column or an index expression. Wraps the two-argument unaccent(regdictionary, text) form (documented IMMUTABLE in migration 044), never the one-argument unaccent(text), which is only STABLE.';

REVOKE ALL ON FUNCTION public.afrik_unaccent(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_unaccent(TEXT)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.afrik_prefix_tsquery(p_text TEXT)
RETURNS tsquery
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_catalog, pg_temp
AS $$
  WITH tokens AS (
    SELECT tok, ord
    FROM regexp_split_to_table(btrim(COALESCE(p_text, '')), '\s+')
           WITH ORDINALITY AS t(tok, ord)
    WHERE tok <> ''
  ),
  lexemes AS (
    -- Each word is stemmed on its own so a "last word" can be identified
    -- before prefixing it; to_tsquery(websearch-style) has no such notion of
    -- word order once it has parsed a multi-word input.
    SELECT (tsvector_to_array(to_tsvector('french', tok)))[1] AS lex, ord
    FROM tokens
  ),
  filtered AS (
    -- max(ord) is recomputed here, after stopwords are dropped, so a
    -- trailing stopword (input "bamba le") does not leave the true last word
    -- ("bamba") without its prefix operator.
    SELECT lex, ord, max(ord) OVER () AS last_ord
    FROM lexemes
    WHERE lex IS NOT NULL
  )
  SELECT COALESCE(
    to_tsquery('french',
      (SELECT string_agg(
                CASE WHEN ord = last_ord THEN lex || ':*' ELSE lex END,
                ' & ' ORDER BY ord)
         FROM filtered)),
    -- All-stopword, non-blank input: match nothing, not everything. A NULL
    -- tsquery here would read as "no predicate" to the callers below, which
    -- is what a genuinely blank query means, not what this means.
    to_tsquery('french', 'zzz_afrik_no_match_zzz')
  );
$$;

COMMENT ON FUNCTION public.afrik_prefix_tsquery(TEXT) IS
  'Builds a French tsquery from free text with the :* prefix operator on only the last stemmed word — search-as-you-type: earlier words match as complete words, the trailing word matches as a stem prefix (REQ-129). Never NULL for non-blank input; an all-stopword input yields a tsquery matching no real document rather than being mistaken for a blank query.';

REVOKE ALL ON FUNCTION public.afrik_prefix_tsquery(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_prefix_tsquery(TEXT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Accent-insensitive name columns
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.afrik_peoples
  ADD COLUMN IF NOT EXISTS name_unaccent_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french', public.afrik_unaccent(COALESCE(name_main, '')))
  ) STORED;

COMMENT ON COLUMN public.afrik_peoples.name_unaccent_vector IS
  'tsvector of name_main with accents folded before tokenising, so a query normalised the same way (public.afrik_unaccent) matches regardless of how the reader typed accents. Scoped to the name only, not the full prose surface — REQ-129 is about the indexed name. Ranked alongside search_vector (migration 043) by public.afrik_search_peoples (migration 052).';

CREATE INDEX IF NOT EXISTS idx_afrik_peoples_name_unaccent_vector
  ON public.afrik_peoples USING gin(name_unaccent_vector);

ALTER TABLE public.afrik_countries
  ADD COLUMN IF NOT EXISTS name_unaccent_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french', public.afrik_unaccent(COALESCE(name_fr, '')))
  ) STORED;

COMMENT ON COLUMN public.afrik_countries.name_unaccent_vector IS
  'tsvector of name_fr with accents folded before tokenising. See afrik_peoples.name_unaccent_vector for the full rationale.';

CREATE INDEX IF NOT EXISTS idx_afrik_countries_name_unaccent_vector
  ON public.afrik_countries USING gin(name_unaccent_vector);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Peoples search — prefix + accent-insensitive name matching
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
    p.id, p.name_main, p.language_family_id, p.classification_status,
    p.content, p.created_at, p.updated_at,
    cs.score AS confidence,
    CASE
      WHEN q.is_browse THEN 0::real
      ELSE (
        GREATEST(
          CASE WHEN q.tsq IS NOT NULL
               THEN ts_rank('{0.1,0.3,0.6,1.0}', p.search_vector, q.tsq)
               ELSE 0 END,
          CASE WHEN q.tsq_unaccent IS NOT NULL
               THEN ts_rank('{0.1,0.3,0.6,1.0}', p.name_unaccent_vector,
                            q.tsq_unaccent)
               ELSE 0 END
        ) * (0.5 + 0.5 * COALESCE(cs.score, 0.5))
      )::real
    END AS relevance,
    (q.exact_key IS NOT NULL
     AND public.afrik_unaccent(lower(p.name_main)) = q.exact_key) AS exact_match
  FROM public.afrik_peoples p
  LEFT JOIN public.confidence_scores cs
    ON cs.entity_type = 'people' AND cs.entity_id = p.id
  CROSS JOIN q
  WHERE (q.is_browse
         OR (q.tsq IS NOT NULL AND p.search_vector @@ q.tsq)
         OR (q.tsq_unaccent IS NOT NULL
             AND p.name_unaccent_vector @@ q.tsq_unaccent))
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
    CASE WHEN (SELECT is_browse FROM q) THEN NULL ELSE ts_headline(
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
      COALESCE((SELECT tsq FROM q), (SELECT tsq_unaccent FROM q)),
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
  'Ranked, paginated peoples search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Matches on the weighted search_vector (migration 043) OR the accent-insensitive name_unaccent_vector (migration 052), both queried with a last-word prefix operator (public.afrik_prefix_tsquery) — REQ-129. A null or blank p_q switches both text predicates off (browse mode), which is how "peoples of family X" and "peoples of country Y" are served here. SECURITY INVOKER: reads only tables already published to anon by migrations 015 and 019.';

REVOKE ALL ON FUNCTION public.afrik_search_peoples(
  TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_peoples(
  TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Countries search — prefix + accent-insensitive name matching
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
  SELECT page.exact_match, page.relevance,
         page.id::text        AS id,
         page.name_fr         AS "nameFr",
         page.etymology,
         page.name_origin_actor AS "nameOriginActor",
         page.exact_match     AS "exactMatch",
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
    (SELECT jsonb_agg(to_jsonb(e) - 'exact_match'
                      ORDER BY e.exact_match DESC, e.relevance DESC,
                               e."nameFr" ASC, e.id ASC)
       FROM enriched e),
    '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.afrik_search_countries(TEXT, INT, INT) IS
  'Ranked, paginated countries search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Matches on the weighted search_vector (migration 043) OR the accent-insensitive name_unaccent_vector (migration 052), both queried with a last-word prefix operator (public.afrik_prefix_tsquery) — REQ-129. No confidence filters: confidence_scores covers entity_type=''people'' only (migration 014).';

REVOKE ALL ON FUNCTION public.afrik_search_countries(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_countries(TEXT, INT, INT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- 1. REQ-129 AC1 — a partial final word finds the longer indexed name:
--      SELECT jsonb_path_query_array(
--               public.afrik_search_peoples('bamba', 5, 0), '$.rows[*].nameMain');
--      -- expect an array containing "Bambara"
--
-- 2. REQ-129 AC2 — an unaccented query finds an accented name, by
--    construction rather than stemmer coincidence:
--      SELECT jsonb_path_query_array(
--               public.afrik_search_peoples('mande', 5, 0), '$.rows[*].nameMain');
--      -- expect an array containing a name that spells "Mandé" with the accent
--
-- 3. Existing prose matching is unaffected — 044's own regression case:
--      SELECT jsonb_path_query_array(
--               public.afrik_search_peoples('Bété', 20, 0), '$.rows[*].nameMain');
--      -- expect Bété first, Béti / Béti-Fang next, Amhara far down the list
--
-- 4. Browse mode still returns a family's peoples with a blank query:
--      SELECT public.afrik_search_peoples(NULL, 5, 0, NULL, NULL, NULL, 'FLG_KROU')
--             -> 'total';
--      -- expect the stored row count for FLG_KROU, every rows[*].snippet null
--
-- 5. An all-stopword, non-blank query matches nothing rather than everything:
--      SELECT public.afrik_search_peoples('le', 5, 0) -> 'total';
--      -- expect 0, not the size of the whole corpus
--
-- 6. Callable with the anon key, including the two new helper functions it
--    now depends on:
--      SET ROLE anon; SELECT public.afrik_search_peoples('bamba', 1, 0); RESET ROLE;
--      -- expect a result, not "permission denied for function"
--
-- 7. Countries: prefix and accent-insensitivity both hold on name_fr, e.g. a
--    partial, unaccented country name still resolves via the same mechanism
--    exercised in checks 1–2 above.
