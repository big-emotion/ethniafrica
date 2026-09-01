-- Migration 063 — Trigram fuzzy search for peoples names (DEC-034, ETNI-1411)
--
-- Context: migration 060 (ETNI-1408) covered DEC-034's first mechanism — an
-- editorial spelling-alias column — but a single-letter typo on a name that
-- carries no declared alias still surfaces no fiche at all. This migration is
-- DEC-034's second mechanism: pg_trgm fuzzy matching layered onto the ranking
-- function of migration 044, for the case no alias anticipates.
--
-- ── Extension + index ─────────────────────────────────────────────────────
-- pg_trgm installs into the `extensions` schema, following the same
-- convention as unaccent (migration 044) rather than public. The GIN index
-- is built on the accent-folded, lower-cased name_main — the same expression
-- the ranking function below compares against — so similarity()/`%` stay
-- index-backed instead of falling back to a sequential scan.
--
-- The fold goes through `public.afrik_unaccent` (052), never the raw
-- two-argument `extensions.unaccent(regdictionary, text)` that 044 calls:
-- despite 044's comment, that form is STABLE here (pg_proc.provolatile = 's'
-- on both projects), and an index expression must be IMMUTABLE — building
-- this index on the raw call is rejected outright. The ranking function must
-- use the wrapper too, not just the index: an index on afrik_unaccent() with
-- a predicate on the raw call is a different expression, so the planner never
-- matches the two and the fallback tier silently seq-scans afrik_peoples.
--
-- ── Ranking rule ─────────────────────────────────────────────────────────
-- afrik_search_peoples (migration 044) gains a fallback tier, not a
-- replacement: a row only takes the trigram path when the lexical predicate
-- (websearch_to_tsquery over search_vector) finds nothing for it. Ordering
-- adds an explicit `lexical_match` tier ahead of the continuous `relevance`
-- score — ORDER BY exact_match DESC, lexical_match DESC, relevance DESC —
-- so a real lexical or exact match always outranks a fuzzy-only one
-- regardless of how the two magnitudes compare; encoding that guarantee as a
-- boolean tier is what makes it hold independently of how similarity() and
-- ts_rank happen to scale against each other, rather than by tuning constants
-- against one another.
--
-- The similarity threshold is 0.4 — above pg_trgm's own default operator
-- threshold (0.3), chosen so the two documented non-goals stay out:
--   - "gour" vs "Gur": a 3-letter word compared against a 4-letter one is
--     already a marginal trigram overlap (close to 0.3), and belongs to the
--     alias mechanism of migration 060, not this one.
--   - "bt": two characters is too short to form a meaningful trigram set at
--     all; similarity() against any real name stays far below the threshold.
-- A single-letter change on an ordinary multi-syllable name (e.g. "Wolof" ->
-- "Wolog") comfortably clears 0.4. See the regression tests of ETNI-1662 for
-- both directions.
--
-- Idempotent: CREATE EXTENSION/INDEX IF NOT EXISTS, CREATE OR REPLACE
-- FUNCTION, REVOKE then GRANT.
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project (jajggbeimfudpzcxytbb) by hand. Migration-queue
-- position 6 of the program, after 060 (ETNI-1408). Must not merge
-- concurrently with any other migration in the program (check:migration-files
-- rejects a duplicate version and a hole in the sequence).

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS idx_afrik_peoples_name_main_trgm
  ON public.afrik_peoples
  USING gin (
    (public.afrik_unaccent(lower(name_main)))
    extensions.gin_trgm_ops
  );

-- ────────────────────────────────────────────────────────────────────────────
-- afrik_search_peoples — same signature as migration 044, fuzzy fallback added
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
  'Ranked, paginated peoples search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Ranked by exact name_main match, then a lexical match on the weighted search_vector (ts_rank times a confidence multiplier), then a pg_trgm similarity fallback (>= 0.4) for a query that finds no lexical match at all — DEC-034''s typo-tolerance mechanism, migration 063. A null or blank p_q switches the text predicate off, which is how "peoples of family X" and "peoples of country Y" are served here. SECURITY INVOKER: reads only tables already published to anon by migrations 015 and 019.';

REVOKE ALL ON FUNCTION public.afrik_search_peoples(
  TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_peoples(
  TEXT, INT, INT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- 1. pg_trgm landed in `extensions`, not public:
--      SELECT n.nspname FROM pg_extension e
--        JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname='pg_trgm';
--      -- expect: extensions
--
-- 2. The trigram index exists:
--      SELECT indexname FROM pg_indexes
--       WHERE tablename = 'afrik_peoples'
--         AND indexname = 'idx_afrik_peoples_name_main_trgm';
--      -- expect 1 row
--
-- 3. AC — a single-letter typo surfaces the fiche even though it lexically
--    matches nothing:
--      SELECT public.afrik_search_peoples('Wolog', 5, 0) #>> '{rows,0,nameMain}';
--      -- expect: Wolof
--
-- 4. Non-goal — "gour" and "bt" are not resolved by this mechanism:
--      SELECT public.afrik_search_peoples('gour', 5, 0) -> 'total';
--      SELECT public.afrik_search_peoples('bt', 5, 0) -> 'total';
--      -- expect 0 for both, confirming they remain the alias mechanism's job
--
-- 5. A lexical/exact match still outranks a fuzzy-only one:
--      SELECT public.afrik_search_peoples('Bété', 20, 0) #>> '{rows,0,nameMain}';
--      -- expect Bété first (unchanged from migration 044), never a fuzzy
--      -- neighbour ahead of the exact name
--
-- 6. Callable with the anon key — this is the SECURITY INVOKER claim:
--      SET ROLE anon; SELECT public.afrik_search_peoples('Wolog', 1, 0); RESET ROLE;
--      -- expect a result, not "permission denied for function"
