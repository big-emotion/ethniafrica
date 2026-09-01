-- Migration 066 — Reach a name through an approximate input (REQ-135, ETNI-1457)
--
-- Context: the name entity (`afrik_patronymes`, migration 053) has no search
-- apparatus at all. Four distinct problems, four answers — conflating them
-- into one mechanism means at least one class of reader reaches nothing:
--
--   1. Phonetic transcription ("Keyta" for "Keïta") — no accent fold and no
--      trigram overlap bridges this (their trigram sets barely intersect); it
--      needs a phonetic code. fuzzystrmatch's dmetaphone(), installed here,
--      is IMMUTABLE (usable in a GENERATED column) and vowel-insensitive in
--      the way this case needs: "Keita" and "Keyta" both reduce to the same
--      code because dmetaphone treats a mid-word 'y' as a vowel.
--   2. A name with an apostrophe ("Eto'o") must be reachable by a prefix that
--      omits it ("Eto"). `public.afrik_unaccent` (052) folds accents but
--      passes punctuation through untouched, so "Eto'o" tokenises as its own
--      lexeme distinct from "Etoo" and a bare "Eto" prefix never matches it.
--      Fixed once, in the shared helper, per the ticket's own framing
--      ("extending the unaccented column of the search layer") rather than
--      duplicated per entity.
--   3. A single wrong character ("Masamba"/"Makala") — pg_trgm, the same
--      mechanism as migration 063, applied to this entity's name.
--   4. A short name that is also a common word ("Song") must rank its own
--      fiche above an incidental mention elsewhere — a weighted tsvector
--      (name = weight A, the rest of `content` = weight D) so ts_rank keeps
--      a real name match far ahead of a buried one, the same shape as
--      persons' full_name/role_category split (057).
--
-- `afrik_patronymes` (053) pulls only `name_system` and
-- `caste_or_social_function` out of `content` as real columns; the name
-- itself lives at `content->>'nameMain'` (DEC-039's per-subtype models,
-- public/modele-nom-*.json). `name_main` below is a GENERATED column over
-- that JSON path so every other generated column, and the ranking function,
-- can reference a real column rather than re-extracting the path everywhere
-- — jsonb's `->>` operator is immutable, so this is legal in a STORED
-- generated column exactly like the JSON-path columns already in this repo.
--
-- Caveat on step 2: `public.afrik_unaccent` is CREATE OR REPLACE'd in place,
-- so it changes behaviour for every existing caller — but a STORED generated
-- column only recomputes on write. `afrik_peoples`/`afrik_countries`/
-- `persons`.`name_unaccent_vector` (052, 065) do not retroactively pick up
-- the apostrophe fold until their rows are next written (the periodic full
-- corpus reload, `scripts/migrateAfrikToDatabase.ts`) — no acceptance
-- criterion of this ticket needs them to before then, and country names such
-- as "Côte d'Ivoire" are unaffected until that reload. Every column added by
-- *this* migration is computed after the replace, in the same migration, so
-- it is correct from the first write.
--
-- Scope — out (per the ticket): declared transliteration variants — no
-- algorithm bridges those; that is REQ-135's other half, a data problem
-- tracked separately, not this migration's.
--
-- Idempotent: CREATE OR REPLACE FUNCTION, CREATE EXTENSION/COLUMN/INDEX IF
-- NOT EXISTS, REVOKE then GRANT.
--
-- Rollout is two-step: the recette project (shmrjtnfbqzceovroqjj) first, then
-- the production project (jajggbeimfudpzcxytbb) by hand. Must be applied
-- before the application code calling afrik_search_patronymes is deployed,
-- or the query answers PGRST202.

-- ────────────────────────────────────────────────────────────────────────────
-- 0. Extensions
-- ────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA extensions;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. public.afrik_unaccent — fold apostrophes as well as accents
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.afrik_unaccent(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, extensions, pg_temp
AS $$
  SELECT replace(
           replace(
             extensions.unaccent('extensions.unaccent'::regdictionary,
                                 COALESCE(p_text, '')),
             '''', ''),
           '’', '');
$$;

COMMENT ON FUNCTION public.afrik_unaccent(TEXT) IS
  'IMMUTABLE accent fold, usable inside a GENERATED column or an index expression. Also strips straight (U+0027) and typographic (U+2019) apostrophes, so "Eto''o" and "Eto’o" both fold to "Etoo" and a prefix that omits the apostrophe ("Eto") still matches (REQ-135). Wraps the two-argument unaccent(regdictionary, text) form (documented IMMUTABLE in migration 044), never the one-argument unaccent(text), which is only STABLE.';

REVOKE ALL ON FUNCTION public.afrik_unaccent(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_unaccent(TEXT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. afrik_patronymes — name column, unaccent/phonetic/weighted-tsvector
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.afrik_patronymes
  ADD COLUMN IF NOT EXISTS name_main TEXT
  GENERATED ALWAYS AS (content ->> 'nameMain') STORED;

COMMENT ON COLUMN public.afrik_patronymes.name_main IS
  'The name text, lifted out of content->>''nameMain'' (DEC-039''s per-subtype models) as a real, indexable column. content stays the editorial source of truth; this column exists only for search. REQ-135.';

ALTER TABLE public.afrik_patronymes
  ADD COLUMN IF NOT EXISTS name_unaccent_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french', public.afrik_unaccent(COALESCE(content ->> 'nameMain', '')))
  ) STORED;

COMMENT ON COLUMN public.afrik_patronymes.name_unaccent_vector IS
  'tsvector of name_main with accents and apostrophes folded before tokenising (public.afrik_unaccent), mirroring afrik_peoples.name_unaccent_vector (052). REQ-135.';

CREATE INDEX IF NOT EXISTS idx_afrik_patronymes_name_unaccent_vector
  ON public.afrik_patronymes USING gin(name_unaccent_vector);

ALTER TABLE public.afrik_patronymes
  ADD COLUMN IF NOT EXISTS name_phonetic TEXT
  GENERATED ALWAYS AS (
    extensions.dmetaphone(public.afrik_unaccent(COALESCE(content ->> 'nameMain', '')))
  ) STORED;

COMMENT ON COLUMN public.afrik_patronymes.name_phonetic IS
  'dmetaphone() code of the accent/apostrophe-folded name — a phonetic transcription such as "Keyta" reaches the canonical "Keïta" even though neither an accent fold nor a trigram overlap bridges the two spellings (REQ-135 AC1). fuzzystrmatch''s dmetaphone is IMMUTABLE, hence usable here.';

CREATE INDEX IF NOT EXISTS idx_afrik_patronymes_name_phonetic
  ON public.afrik_patronymes(name_phonetic);

CREATE INDEX IF NOT EXISTS idx_afrik_patronymes_name_main_trgm
  ON public.afrik_patronymes
  USING gin (
    (extensions.unaccent('extensions.unaccent'::regdictionary, lower(name_main)))
    extensions.gin_trgm_ops
  );

-- setweight: A = the name itself (nameMain), D = the rest of `content`
-- verbatim, so a coincidental mention of the query text somewhere else in
-- the fiche never outranks an actual name match (REQ-135 AC4). Deliberately
-- not folding in attestedForms at weight A: generated columns forbid
-- subqueries, so the only subquery-free way to reach into that JSON array is
-- a raw ::text cast, which would carry its own key names ("spelling",
-- "tier", "official"...) into the highest-weight tier and let an unrelated
-- query for e.g. "official" match every patronyme — worse than the D tier
-- already covers it via the whole-content cast below.
ALTER TABLE public.afrik_patronymes
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('french', COALESCE(content ->> 'nameMain', '')), 'A')
    || setweight(to_tsvector('french', COALESCE(content::text, '')), 'D')
  ) STORED;

COMMENT ON COLUMN public.afrik_patronymes.search_vector IS
  'Weighted French tsvector: A = nameMain (the name itself), D = the rest of content verbatim. A short name that is also a common word (e.g. "Song") ranks by its A-weight name match, far ahead of a D-weight incidental mention elsewhere in the fiche (REQ-135 AC4).';

CREATE INDEX IF NOT EXISTS idx_afrik_patronymes_search_vector
  ON public.afrik_patronymes USING gin(search_vector);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. afrik_search_patronymes
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
          extensions.unaccent('extensions.unaccent'::regdictionary,
                              lower(p.name_main)),
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
            extensions.unaccent('extensions.unaccent'::regdictionary,
                                lower(p.name_main)),
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
  'Ranked, paginated name (patronyme) search. Returns {"total": <corpus-wide match count>, "rows": [...]}. Ranked by exact accent/apostrophe-insensitive name match, then a lexical tier that is a prefix/accent-insensitive match on search_vector or name_unaccent_vector OR a dmetaphone phonetic match (REQ-135 AC1), then a pg_trgm similarity fallback (>= 0.4, mirroring 063) for a single-character typo with no lexical or phonetic match at all (AC3). A null or blank p_q browses the whole corpus. SECURITY INVOKER: reads only afrik_patronymes, already published to anon by migration 053.';

REVOKE ALL ON FUNCTION public.afrik_search_patronymes(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.afrik_search_patronymes(TEXT, INT, INT)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- 1. AC1 — a phonetic transcription reaches the canonical name:
--      SELECT public.afrik_search_patronymes('Keyta', 5, 0) #>> '{rows,0,nameMain}';
--      -- expect: Keïta (or the corpus's exact spelling), via name_phonetic
--
-- 2. AC2 — a prefix that omits the apostrophe reaches the name:
--      SELECT public.afrik_search_patronymes('Eto', 5, 0) #>> '{rows,0,nameMain}';
--      -- expect: Eto'o
--
-- 3. AC3 — a single wrong character still surfaces the intended name first:
--      SELECT public.afrik_search_patronymes('Masambo', 5, 0) #>> '{rows,0,nameMain}';
--      -- expect: Masamba, ranked ahead of Makala
--
-- 4. AC4 — the name itself outranks an incidental mention of the same string
--    elsewhere in another fiche's content:
--      SELECT public.afrik_search_patronymes('Song', 5, 0) #>> '{rows,0,nameMain}';
--      -- expect: Song, exactMatch true, ranked ahead of any row that only
--      -- matches through the D-weight content tier
--
-- 5. The trigram index, phonetic index and GIN indexes exist:
--      SELECT indexname FROM pg_indexes WHERE tablename = 'afrik_patronymes'
--       AND indexname IN ('idx_afrik_patronymes_name_main_trgm',
--                          'idx_afrik_patronymes_name_phonetic',
--                          'idx_afrik_patronymes_name_unaccent_vector',
--                          'idx_afrik_patronymes_search_vector');
--      -- expect 4 rows
--
-- 6. Callable with the anon key — this is the SECURITY INVOKER claim:
--      SET ROLE anon; SELECT public.afrik_search_patronymes('keita', 1, 0); RESET ROLE;
--      -- expect a result, not "permission denied for function"
