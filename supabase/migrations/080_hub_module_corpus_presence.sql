-- =============================================================================
-- Migration 080: one relation that answers "does this corpus hold anything"
-- =============================================================================
-- The hub, the home constellation and the header all mark a module « Bientôt »
-- when the table behind it is empty (REQ-106/REQ-114). The question is
-- legitimate; the way it was asked was not.
--
-- `hasAtLeastOneRow` sent PostgREST `select("*", { count: "exact", head: true })`
-- once per data source. Two costs came out of that, and both were measured on
-- recette on 2026-09-02:
--
--   • an exact count is a whole-relation question, so the answer time grows
--     with the corpus. `afrik_peoples` holds 790 rows and 38 MB, of which
--     37.7 MB is TOASTed JSONB `content`. The request took 21 seconds when it
--     answered at all, and otherwise died on `canceling statement due to
--     statement timeout` — the `anon` role carries `statement_timeout = 3s`.
--     The site read that failure as "no peoples" and hid a loaded corpus
--     behind « Bientôt » for the next sixty seconds;
--   • seven to nine round trips per render, on a layout that runs under every
--     page of `/fr`.
--
-- `exists (select 1 from …)` answers the same question in one page read: the
-- planner stops at the first row and never touches TOAST. Gathering the nine
-- sources into one view makes it one round trip as well.
--
-- Why a view and not a materialised view: there is nothing to precompute. The
-- expensive part was never the reading, it was asking for a count of rows
-- nobody wanted; a materialised view would trade that for a refresh job and a
-- staleness window, and would go on reporting a corpus the loader has just
-- deleted. `exists` is already O(1).
--
-- ── Why `security_invoker` ────────────────────────────────────────────────
-- A view runs with its owner's privileges by default, which would let this one
-- report on tables the caller cannot read — the exposure 077 spent a migration
-- closing elsewhere. `security_invoker = true` makes each `exists` obey the
-- caller's own RLS, so the view answers exactly what the direct probe answered
-- and nothing more. In practice all nine tables carry a public read policy;
-- the one that filters (`quiz_questions`, `revoked_at is null`) keeps filtering
-- here, which is the intended reading: a bank of revoked questions has nothing
-- to serve.
--
-- ── The list is a contract ────────────────────────────────────────────────
-- The rows below mirror the `dataSource` values declared in
-- `src/lib/hubs/moduleRegistry.ts`. A source declared there and missing here
-- resolves to "unknown", which the resolver now reads as "offered" — so the
-- omission would publish a module whose table is empty, silently.
-- `moduleAvailability.test.ts` holds the two lists to each other.
-- =============================================================================

create or replace view hub_module_corpus_presence
with (security_invoker = true) as
select 'afrik_peoples'::text as data_source,
       exists (select 1 from afrik_peoples) as has_rows
union all
select 'afrik_countries',
       exists (select 1 from afrik_countries)
union all
select 'afrik_language_families',
       exists (select 1 from afrik_language_families)
union all
select 'afrik_languages',
       exists (select 1 from afrik_languages)
union all
select 'afrik_patronymes',
       exists (select 1 from afrik_patronymes)
union all
-- Mirrors the filter `names.ts#listNames` applies, so the module is judged on
-- the records the Appellations atlas actually renders rather than on every
-- name in the table.
select 'name_records',
       exists (select 1 from name_records where entity_type = 'people')
union all
select 'migration_events',
       exists (select 1 from migration_events)
union all
select 'afrik_people_relations',
       exists (select 1 from afrik_people_relations)
union all
select 'quiz_questions',
       exists (select 1 from quiz_questions);

comment on view hub_module_corpus_presence is
  'One row per hub module data source: whether the corpus behind it holds anything a reader could open. Replaces a per-table exact count that timed out on afrik_peoples. See migration 080.';

grant select on hub_module_corpus_presence to anon, authenticated;
