-- Migration 071 — the appellations surface becomes a nomenclature (REQ-054)
--
-- Context: `/fr/atlas/appellations` listed `name_records` one row per record,
-- which made the *link to a people* its unit of display rather than the name.
-- Three consequences, all visible in production data:
--
--   1. A name borne by several peoples appeared as several identical lines.
--      386 of the 3141 distinct forms are in that case — "Ayneha" four times
--      (four Songhay fiches), "Abahutu" three times. The one column that told
--      them apart, the people's name, was rendered `sr-only`, so a reader saw
--      a duplicate list and concluded the page duplicated the peoples index.
--   2. Paging over records rather than forms meant the count ("3679") and the
--      list (100 rows) counted different things.
--   3. Ordering by `sort_rank` put all 742 rank-0 endonyms first, so the first
--      page was entirely endonyms and the 2742 exonyms — 75% of the corpus —
--      were unreachable by scrolling.
--
-- This view makes the *form* the row: one entry per name, carrying the peoples
-- that bear it, the spellings it is written with, and the types it is recorded
-- under. Grouping has to happen in SQL rather than in the page, because a page
-- can only group the rows it has already fetched, which is what tied the bug
-- to pagination in the first place.
--
-- `security_invoker` is set so the reader's own RLS applies: a view defaults to
-- the definer's rights, which would have this bypass the public-read policy on
-- `name_records` instead of relying on it.

create or replace view afrik_name_forms
with (security_invoker = true) as
select
  -- The grouping key and the search key are deliberately the same column:
  -- two normalisations would let a name be found under a spelling it is not
  -- grouped under. `afrik_unaccent` is the IMMUTABLE wrapper (migration 044);
  -- bare `unaccent` is not, and must not be used here.
  lower(afrik_unaccent(nr.name_text)) as form_key,
  -- The spelling the corpus writes most often, not the alphabetically first:
  -- a form's display name should be the one a reader is likeliest to have
  -- met, and `min()` would pick by accident of collation.
  mode() within group (order by nr.name_text) as display_name,
  array_agg(distinct nr.name_text order by nr.name_text) as spellings,
  array_agg(distinct nr.name_type::text) as name_types,
  count(distinct nr.entity_id)::int as bearer_count,
  jsonb_agg(distinct jsonb_build_object('id', p.id, 'name', p.name_main))
    filter (where p.id is not null) as bearers,
  bool_or(nr.imposed_by is not null) as has_imposed,
  -- One representative note is enough for a listing: the fiche is where the
  -- full imposition context belongs. Its presence is what the listing needs
  -- to signal, so a colonial exonym is not shown as a neutral synonym.
  max(nr.why_problematic) as why_problematic,
  min(nr.language_of_origin) as language_of_origin
from name_records nr
left join afrik_peoples p on p.id = nr.entity_id
where nr.entity_type = 'people'
group by lower(afrik_unaccent(nr.name_text));

comment on view afrik_name_forms is
  'One row per distinct name form (accent- and case-folded) across name_records, with the peoples bearing it. Backs the Appellations nomenclature; see migration 071.';

grant select on afrik_name_forms to anon, authenticated;

-- How many records each filter can actually reach.
--
-- The surface offered five filters, two of which could return nothing: the
-- `surname` chip matched 0 records because v1 of `name_records` only ever
-- populated ethnonyms, and "noms imposés" matched 4 out of 3679. A reader who
-- clicked either got the empty state and no way to tell an empty filter from
-- an empty corpus. Reading the counts lets the page drop a chip the corpus
-- cannot fill and put a number on the ones it barely fills, so the filter row
-- follows the data instead of a hard-coded list.
create or replace view afrik_name_type_counts
with (security_invoker = true) as
select
  nr.name_type::text as name_type,
  count(*)::int as record_count,
  count(*) filter (where nr.imposed_by is not null)::int as imposed_count
from name_records nr
where nr.entity_type = 'people'
group by nr.name_type;

comment on view afrik_name_type_counts is
  'Record counts per name_type, so the Appellations filter row can drop a chip the corpus cannot fill. See migration 071.';

grant select on afrik_name_type_counts to anon, authenticated;
