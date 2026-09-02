-- Migration 078 — The sources directory: the missing column and its indexes
--
-- Context: /fr/sources is a hand-written bibliography of about ninety
-- citations, disconnected from the 4 395 rows the corpus actually rests on.
-- Turning it into a searchable directory needs three things the database does
-- not have yet: the `publisher` column the code has always believed in, an
-- index behind the substring search the reader will type, and an index behind
-- the reverse lookup that answers "which fiches cite this source".
--
-- Purely additive: one nullable column, five indexes. No data is rewritten, no
-- function is redefined, no RLS policy changes. `sources` and `assertions`
-- keep the public-read policies of 017/023.
--
-- ── 1. sources.publisher — a column the code has been reading for months ───
-- `src/api/v2/services/reference-library.ts` selects `publisher` in
-- SOURCE_COLUMNS, filters on it in searchReferences(), and inserts it in
-- createReference(); `src/api/v2/schemas/sources.ts` publishes it in the
-- `Source` contract. The column exists in none of the 77 migrations before
-- this one — grep for it and every hit is TypeScript. So it was never dropped,
-- it was never created: the service was written against a schema that never
-- shipped, and every one of those three code paths answers PostgREST 42703.
-- Nobody saw it because all three sit behind the authenticated reference
-- library, and the public `Source` payload simply reported `null`.
--
-- Creating the column is the smaller repair. Deleting the field instead would
-- take a publisher a contributor typed and drop it on the floor, and would
-- leave the public contract advertising a field with no way to ever fill it.
--
-- ── 2. Substring search over title and author ─────────────────────────────
-- The directory searches with `ilike '%term%'`, not full text. That is a
-- deliberate choice, not a shortcut: these titles are institutional and mostly
-- English ("World Population Prospects 2024", "CIA — The World Factbook"), so
-- a French text-search configuration would stem them into noise, and a reader
-- looking through a bibliography types a fragment — "Ethnologue", "UNESCO" —
-- which is a substring question. pg_trgm answers exactly that question, and
-- the extension is already installed in `extensions` by migration 063, so this
-- costs two indexes and no new infrastructure.
--
-- The alternative — a generated `search_vector` column on `sources` — was
-- rejected on risk, not on merit. `sources_title_key UNIQUE (title)` is the
-- conflict target of `upsert(onConflict: "title")` in four AFRIK loaders, and
-- migration 039 exists because a regression on that constraint left corpora
-- loading zero rows. A table carrying that much load-bearing weight does not
-- get a new generated column to save a sequential scan over 4 395 rows.
--
-- ── 3. assertions.source_ids — the reverse lookup ─────────────────────────
-- Every read of the citation graph so far has gone forwards: given entities,
-- find their sources (`getSourcesMap`). The directory needs the other
-- direction — given a source, find the fiches citing it — which is
-- `source_ids @> ARRAY[$1]`. `source_ids` is a UUID[] with no foreign key, so
-- PostgREST cannot embed it and the array containment operator is the only
-- path. Without a GIN index that operator scans all 11 500 assertions on every
-- source page.
--
-- Note that `assertion_references` already carries
-- `idx_assertion_references_source_id`, the index this lookup would want — but
-- that table holds zero rows, because no loader ever wrote it. Until it is
-- populated (a later, separate piece of work), `source_ids` is where the
-- citation graph actually lives.
--
-- ── Rollout ───────────────────────────────────────────────────────────────
-- Two steps, recette first then production. Both Supabase projects label their
-- environment "production" — a project has exactly one environment and
-- Supabase names it that — so the label says nothing about which application
-- the project serves. `shmrjtnfbqzceovroqjj` serves recette;
-- `jajggbeimfudpzcxytbb` serves production and is applied by hand, because
-- nothing in the workflows does it.
--
-- Every statement is IF NOT EXISTS, so re-applying is a safe no-op.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. The column the service has always assumed.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS publisher TEXT;

COMMENT ON COLUMN sources.publisher IS
  'Publisher or issuing body, as cited. Added by 078 — the reference-library service had read, filtered and written this column since ETNI-666 without it existing.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Substring search. pg_trgm is installed in `extensions` by migration 063;
--    repeated here so this file stands alone on a fresh database.
-- ────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS idx_sources_title_trgm
  ON public.sources
  USING gin (title extensions.gin_trgm_ops);

COMMENT ON INDEX idx_sources_title_trgm IS
  'Backs title ILIKE ''%term%'' in the sources directory search (getSourcesFacetPage).';

CREATE INDEX IF NOT EXISTS idx_sources_author_trgm
  ON public.sources
  USING gin (author extensions.gin_trgm_ops);

COMMENT ON INDEX idx_sources_author_trgm IS
  'Backs author ILIKE ''%term%'' in the sources directory search (getSourcesFacetPage).';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. The reverse lookup: which fiches cite this source.
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assertions_source_ids
  ON public.assertions
  USING gin (source_ids);

COMMENT ON INDEX idx_assertions_source_ids IS
  'Backs source_ids @> ARRAY[id] in getSourceCitations — the source-to-fiches direction of the citation graph.';

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Facet filters. idx_sources_tier and idx_sources_verified_at already
--    exist (015); these two complete the set the directory offers.
--
--    A caveat worth recording rather than discovering: source_kind is set on
--    20 rows out of 4 395 and year on 48. Both indexes are cheap and correct,
--    but neither will do much work until the corpus fills those columns — the
--    directory offers each facet only over the values actually present.
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sources_source_kind
  ON public.sources (source_kind);

COMMENT ON INDEX idx_sources_source_kind IS
  'Backs the provenance facet of the sources directory. Sparse: 20 of 4 395 rows carry a source_kind.';

CREATE INDEX IF NOT EXISTS idx_sources_year
  ON public.sources (year);

COMMENT ON INDEX idx_sources_year IS
  'Backs the decade facet of the sources directory. Sparse: 48 of 4 395 rows carry a year.';

-- ────────────────────────────────────────────────────────────────────────────
-- Verification, after applying to each project:
--
--   SELECT indexname FROM pg_indexes
--    WHERE tablename IN ('sources', 'assertions')
--      AND indexname IN ('idx_sources_title_trgm', 'idx_sources_author_trgm',
--                        'idx_assertions_source_ids', 'idx_sources_source_kind',
--                        'idx_sources_year');
--   -- expect 5 rows
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'sources' AND column_name = 'publisher';
--   -- expect 1 row
--
--   EXPLAIN ANALYZE SELECT id FROM sources WHERE title ILIKE '%ethnolog%';
--   -- expect a Bitmap Index Scan on idx_sources_title_trgm
-- ────────────────────────────────────────────────────────────────────────────
