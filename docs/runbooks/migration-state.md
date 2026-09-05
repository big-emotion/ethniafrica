# Runbook — Supabase migration state

**Last verified:** 2026-08-31 (live read of `supabase_migrations.schema_migrations` on **both** projects)
**Applies to:** every file under `supabase/migrations/`

> **13 of the 81 migration files are not in the table below.** They were added after the last
> full read, so this runbook has never recorded whether either project carries them:
>
> `053_name_table`, `057_person_schema`, `064_patronyme_persons`, `065_afrik_search_persons`,
> `067_patronyme_name_record_source_tiers`, `071_afrik_name_forms`, `074_admin_allowlist`,
> `075_flag_reporter_contacts`, `076_pin_function_search_path`, `077_unexpose_privileged_functions`,
> `079_sources_directory_indexes`, `080_hub_module_corpus_presence`, `081_contributions_into_flags`.
>
> Two of them — `076` and `077` — are security migrations, which is the worst class to be unsure
> about: pinning a function's `search_path` and unexposing privileged functions are exactly the
> changes whose absence on one project is invisible until it is exploited. Every migration is a
> two-step rollout, recette then production, and this list is the part of that rollout nobody can
> currently confirm. The next live read should cover all 13 and fold them into the table; until
> then, treat their state on **both** projects as unknown rather than applied.
>
> The scattered per-entry notes further down ("omitted from this table, added after the last full
> read") say the same thing one file at a time. This is the consolidated view, because a gap
> spread across six footnotes reads as housekeeping rather than as thirteen unverified schema
> changes.

There are two Supabase projects, and both look like "production" for a structural reason: **a
Supabase project has exactly one environment, and Supabase itself calls that environment
"production".** There is no staging branch inside a project. So "production" in a Supabase
dashboard names the project's only environment — never the application environment that
project serves.

The mapping is settled. **`shmrjtnfbqzceovroqjj` backs the recette application; it is not the
production database.** A second project backs production; this repository cannot see it (see
below). "We pushed it to production" still does not identify a database here — always name the
application environment the project _backs_, never the label the dashboard shows.

---

## The rule

Every migration has **two steps, never one**:

1. Apply it to the project backing **recette**. Verify it there, against the recette
   application — not against a SQL console.
2. Only then apply the **same** migration to the project backing **production**.

A migration task is not done after the first step. The Jira ticket must carry both, and the
table below must be updated in the same change that applies either one.

**Never** apply a migration to the production-backing project first, or alone. The recette
application is the only place where a schema change gets exercised by real code before it
reaches real users.

---

## Project identity

|                       | Backs **recette**                                                    | Backs **production**                                     |
| --------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| Supabase project ref  | `shmrjtnfbqzceovroqjj`                                               | `jajggbeimfudpzcxytbb` — given by the owner, see below   |
| Dashboard name        | `ethniafrica` — its environment is labelled _production_ by Supabase | _unknown_                                                |
| Region                | `eu-west-1`                                                          | _unknown_                                                |
| Created               | 2026-07-24                                                           | _unknown_                                                |
| Named in this repo as | `AFRIK_RECETTE_SUPABASE_URL` (`scripts/lib/afrikSyncTarget.ts`)      | the `AFRIK_PRODUCTION_SUPABASE_URL` environment variable |
| Reached by the flag   | `--target=recette`                                                   | `--target=production`                                    |

The corpus sync now names the **application** environment in both rows, so the flag and the
project agree. Only the recette ref is checked in; production is configuration with no default,
because a default is how the corpus reached the wrong database in the first place. Setting
`AFRIK_PRODUCTION_SUPABASE_URL` to the recette ref is refused outright, and so is declaring
`--target=production` while `NEXT_PUBLIC_SUPABASE_URL` points at recette.

### What this resolves

The identity is no longer in doubt: `shmrjtnfbqzceovroqjj` backs **recette**. Migration `039`'s
own header comment agrees — it records the corpora "loaded 0 rows against **recette**" against
that project.

The AFRIK sync that used to contradict that is fixed. It previously fired on a successful
Vercel **Production** deployment of `main`, wrote the corpus into `shmrjtnfbqzceovroqjj` — the
recette database — and POSTed a cache revalidation to `https://ethniafrica.com`, a site it had
not written to. `.github/workflows/production-data-sync.yml` now takes the production project
from two repository secrets, `PRODUCTION_SUPABASE_URL` and
`PRODUCTION_SUPABASE_SERVICE_ROLE_KEY`, and fails rather than skipping when either is missing.
See [`afrik-data-sync.md`](./afrik-data-sync.md).

This is the corpus only. **Schema migrations are still applied by hand, and still in two
steps** — nothing below is automated for the production-backing project.

### The production-backing project, read at last — and what the read found

The ref `jajggbeimfudpzcxytbb` was supplied by the environment owner on 2026-08-26. It could
not be verified from here for five days: the Supabase access token available to tooling in this
repository sees exactly one project (`shmrjtnfbqzceovroqjj`), and `get_project` against the
production ref answers "You do not have permission to perform this action". The MCP server still
cannot reach it. **A direct Postgres connection can**, with the database password from
Settings → Database, and that is how the column below stopped being a guess.

The first read, on 2026-08-31, found two things the table had been asserting wrongly.

**Production was at `019`, not `027`.** Thirty migrations were outstanding, not the twenty-two
this document implied. The gap had never been measured, only inferred from what `main` carried,
and `main` carrying a migration file says nothing about any database.

**The ledger was written in timestamp versions, not file versions.** Thirty rows, recorded by
`mcp__supabase__apply_migration` and by hand, under versions like `20260514155308` and names
offset by one from the repository (`008_module_zero_fabric` for what is `009` here). Because no
local file matched those versions, `supabase db push` refused outright with
`LegacyDbPushMissingLocalError` and the CLI's own suggestion — `migration repair --status
reverted` on all thirty, then `db pull` — would have adopted the drift as the new truth.

The repair that was actually correct, and is the one to reuse if this recurs:

```bash
# 1. Back up first. pg_dump must match the server major version (17).
/opt/homebrew/opt/postgresql@17/bin/pg_dump "$PROD_DB_URL" \
  --schema=public --schema=supabase_migrations --no-owner --no-privileges -f backup.sql

# 2. Clear the legacy timestamp rows. No schema change.
supabase migration repair --db-url "$PROD_DB_URL" --status reverted <the 30 timestamps>

# 3. Record what is genuinely applied, under the versions the files use.
supabase migration repair --db-url "$PROD_DB_URL" --status applied 001 002 ... 019

# 4. Confirm the plan is exactly the missing files, then apply.
supabase db push --db-url "$PROD_DB_URL" --include-all --dry-run
supabase db push --db-url "$PROD_DB_URL" --include-all
```

Step 3 is the one the CLI does not suggest and the one that matters: without it, `db push`
replays `001` onward, and `007_remove_v1_add_v2_contribution_types.sql` opens with
`DROP TABLE IF EXISTS sources CASCADE`.

**Verify by measuring, never by the tool's own report.** What was checked afterwards:

- ledger: 49 rows, `001` → `049`, no version outside that range;
- schema: `information_schema.columns` on both projects, **318 columns each, zero difference in
  either direction**;
- the functions the code calls: `afrik_search_peoples`, `afrik_search_countries`,
  `recompute_confidence`, `applied_migrations`, `enforce_name_record_sources`;
- `sources_tier_check` reads `official | referenced | unverified`, `sources_title_key` restored;
- data intact: 713 peoples, 54 countries, 1003 people-country links, 4 doctrine entries.

The eight columns the rollout dropped — `flags.flag_type`, `flags.created_by`,
`flags.description` and five on `revisions` — were on tables holding zero rows, checked before
applying rather than hoped for afterwards.

### The corpus is a separate question from the schema

The schema is now level across both projects. The **corpus is not**: production holds 713
peoples, 54 countries and 24 families, but **0 sources, 0 assertions and 0 languages**. The
`PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` repository secret does not exist, so
`production-data-sync.yml` fails rather than skips. Confidence chips and source transparency have
nothing to render until that secret is set and a load runs.

---

## State table

Rows `001` through `049` are measurements read from each project's
`supabase_migrations.schema_migrations` ledger on 2026-08-31 — recette over the Supabase MCP,
production over a direct Postgres connection. Rows added after that read state explicitly that
they have not been measured or applied; neither column infers database state from what a branch
carries.

The production column says `applied` rather than repeating each version string because its
ledger was rewritten during the 2026-08-31 repair: `001` → `019` were re-recorded under the
file versions after their legacy timestamp rows were cleared, and `020` → `049` were written by
`db push`. All 49 are present, and the two schemas are column-for-column identical.

| File                                          | Recette (`shmrjtnfbqzceovroqjj`)                              | Production (`jajggbeimfudpzcxytbb`)                              |
| --------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `001_initial_schema.sql`                      | applied (`001`)                                               | applied                                                          |
| `002_add_enriched_fields.sql`                 | applied (`002`)                                               | applied                                                          |
| `003_add_unique_constraint_sources_title.sql` | applied (`003`) — but see the caveat below                    | applied                                                          |
| `004_change_ancient_names_to_jsonb.sql`       | applied (`004`)                                               | applied                                                          |
| `005_add_country_sections_4_and_6.sql`        | applied (`005`)                                               | applied                                                          |
| `006_afrik_schema.sql`                        | applied (`006`)                                               | applied                                                          |
| `007_remove_v1_add_v2_contribution_types.sql` | applied (`007`)                                               | applied                                                          |
| `008_user_roles.sql`                          | applied (`008`)                                               | applied                                                          |
| `009_module_zero_fabric.sql`                  | applied (`009`)                                               | applied                                                          |
| `010_classification_status_enum.sql`          | applied (`010`)                                               | applied                                                          |
| `011_assertions_triggers.sql`                 | applied (`011`)                                               | applied                                                          |
| `012_api_keys.sql`                            | applied (`012`)                                               | applied                                                          |
| `013_api_keys_tier.sql`                       | applied (`013`)                                               | applied                                                          |
| `014_flags_severity_auto.sql`                 | applied (`014`)                                               | applied                                                          |
| `015_module_zero_fabric_align.sql`            | applied (`015`)                                               | applied                                                          |
| `016_module_zero_triggers.sql`                | applied (`016`)                                               | applied                                                          |
| `017_editorial_doctrine_rls_lockdown.sql`     | applied (`017`)                                               | applied                                                          |
| `018_editorial_doctrine_seed.sql`             | applied (`018`)                                               | applied                                                          |
| `019_afrik_rls.sql`                           | applied (`019`)                                               | applied                                                          |
| `020_per_assertion_fiche_revisions.sql`       | applied (`020`)                                               | applied                                                          |
| `021_revisions_ddl.sql`                       | applied (`021`)                                               | applied                                                          |
| `022_flags_full_ddl.sql`                      | applied (`022`)                                               | applied                                                          |
| `023_moderator_schema.sql`                    | applied (`023`)                                               | applied                                                          |
| `024_pg_notify_cache_invalidation.sql`        | applied (`024`)                                               | applied                                                          |
| `025_search_vectors.sql`                      | applied (`025`)                                               | applied                                                          |
| `026_contributor_profiles.sql`                | applied (`026`)                                               | applied                                                          |
| `027_contributor_erasure.sql`                 | applied (`027`)                                               | applied                                                          |
| `028_language_tree_support.sql`               | applied (`028`)                                               | applied                                                          |
| `029_names_atlas.sql`                         | applied (`029`)                                               | applied                                                          |
| `030_people_relations.sql`                    | applied (`030`)                                               | applied                                                          |
| `031_normalized_sources.sql`                  | applied (`031`)                                               | applied                                                          |
| `032_oral_narratives.sql`                     | applied (`032`)                                               | applied                                                          |
| `033_rights_consent_access_controls.sql`      | applied (`033`)                                               | applied                                                          |
| `034_source_working_assets.sql`               | applied (`034`)                                               | applied                                                          |
| `035_migration_events.sql`                    | applied (`035`)                                               | applied                                                          |
| `036_quiz_engine.sql`                         | applied (`036`)                                               | applied                                                          |
| `037_colonization_event_types.sql`            | applied — ledger version `20260825211643`                     | applied                                                          |
| `038_user_roles_rls_recursion_fix.sql`        | applied — ledger version `20260825211702`                     | applied                                                          |
| `039_restore_sources_title_unique.sql`        | applied — ledger version `20260825211737`                     | applied                                                          |
| `040_assertion_references_rls.sql`            | applied (`040`)                                               | applied                                                          |
| `041_one_source_tier_vocabulary.sql`          | applied (`041`)                                               | applied                                                          |
| `042_migration_ledger_introspection.sql`      | applied (`042`)                                               | applied                                                          |
| `043_afrik_search_vector_weights.sql`         | applied (`043`) — see the repair note below                   | applied                                                          |
| `044_afrik_ranked_search.sql`                 | applied (`044`)                                               | applied                                                          |
| `045_afrik_countries_summary.sql`             | applied (`045`)                                               | applied                                                          |
| `046_quiz_stimulus.sql`                       | applied (`046`)                                               | applied                                                          |
| `047_quiz_bank_indexes.sql`                   | applied (`047`)                                               | applied                                                          |
| `048_antibot.sql`                             | applied (`048`)                                               | applied                                                          |
| `049_afrik_countries_name_official.sql`       | applied (`049`)                                               | applied                                                          |
| `050_search_query_log.sql`                    | not measured after `049`                                      | not measured after `049`                                         |
| `051_revision_publication.sql`                | pending — not applied by ETNI-70                              | pending — not applied by ETNI-70                                 |
| `052_afrik_search_prefix_unaccent.sql`        | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                          |
| `054_afrik_people_languages.sql`              | pending — human-applied via `supabase db push`, recette first | pending — human-applied via `supabase db push`, second           |
| `056_afrik_language_family_search_vector.sql` | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                          |
| `058_afrik_people_prose_search_vector.sql`    | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                          |
| `060_afrik_spelling_aliases.sql`              | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                          |
| `061_name_alliances.sql`                      | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                          |
| `062_restore_038_rls_comments.sql`            | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                          |
| `063_afrik_search_trigram.sql`                | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                          |
| `066_afrik_search_patronymes.sql`             | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                          |
| `068_afrik_search_languages.sql`              | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                          |
| `069_unified_search_surface.sql`              | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                          |
| `070_afrik_search_leads.sql`                  | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                          |
| `072_people_historical_affiliation.sql`       | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                          |
| `073_afrik_media.sql`                         | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                          |
| `078_revoke_iso_code_questions.sql`           | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand, **before** the code deploys             |
| `082_afrik_search_english_names.sql`          | pending — applies on merge via `migrate-recette.yml`          | pending — the Release `migrate` job, **before** the code deploys |

> **REQ-127 (ETNI-1384).** `072` adds a `CHECK` constraint on `afrik_peoples.content` enforcing
> the same shape `checkHistoricalAffiliationModel` (FR111) already enforces on the JSON corpus:
> when `content->'historicalAffiliation'` is present, it carries a non-empty `description` and a
> non-empty `sources` array whose every entry has a `tier` from the corpus-wide
> `official`/`referenced`/`unverified` vocabulary. It is independent of `recompute_confidence()`
> and the assertions/sources tables — `historicalAffiliation` is a fiche-content field, not a
> normalized source row, so it does not participate in confidence scoring. File `071` is omitted
> from this table (added after the last full read, same as `050`/`064`/`065`/`067`); `072` is the
> next free version on `recette`.

> **REQ-002 (ETNI-1707).** `069` is the blocking SQL contract behind cross-kind search. It adds
> `public.afrik_search_normalized_score`, which maps each kind's own relevance onto one bounded
> `[0,1]` scale, and threads it through every search RPC. The problem it closes is that the
> per-kind scores were never comparable: peoples multiply `ts_rank` by a confidence weight,
> countries return a bare `ts_rank`, and families used a JavaScript tier ladder an order of
> magnitude larger than either — merging those numbers ranked by which kind a row came from. The
> score gives the match class (exact / lexical / fallback) a disjoint band and places the raw
> magnitude inside it, so the class dominates and the magnitude only breaks ties within one class.
> `relevance` and `exactMatch` keep their current values on every RPC; `normalizedScore` is added
> beside them, so nothing reading these functions has to change to keep working.
>
> `069` also gives two kinds an RPC for the first time: `afrik_search_language_families`, which
> reproduces `rankLanguageFamilies`' four tiers in SQL over the `056` search vector, and
> `afrik_search_quiz`, over the active bank only (`revoked_at IS NULL`, matching `036`'s RLS
> policy) and joined to each question's subject entity so a reader who types a people's name
> reaches the questions about it. That function's projection is a closed list: `options_fr` and
> `correct_option` are the answer key and are never returned, and `explanation_fr` is searched but
> never projected — including out of the snippet — because it states the answer in prose.
>
> Files `064`, `065` and `067` are omitted from this table (added after the last full read, same
> as `050`); `069` is the next free version after `068_afrik_search_languages`. Until production
> carries `069`, quiz questions and the family ladder rank on recette and not there, and a merged
> result list on production keeps ordering by kind.

> **REQ-141 / REQ-143 (ETNI-1857).** `082` is the per-locale half of search. It adds
> `afrik_countries.name_en` (filled by the corpus reload from the fiches' `nameEn`) and
> `search_query_log.lang` (`NOT NULL`, `en | fr`, **no default** — existing rows are backfilled to
> `fr` in the same statement block), and re-issues `afrik_search_peoples`, `_countries`,
> `_language_families` and `_languages` with a trailing `p_lang TEXT DEFAULT 'fr'`. Each old
> signature is **dropped before** the new one is created: a second parameter list beside the
> first is an overload, and PostgREST answers an overloaded name with `PGRST203`. The default
> keeps every existing caller valid, so the order between this migration and the code deploy only
> matters for English requests — the query layer sends `p_lang` only when the request carries a
> locale, and a French request is served identically by either definition. Verify with
> `SELECT proname, count(*) FROM pg_proc WHERE proname LIKE 'afrik_search_%' GROUP BY 1` — every
> count must be 1 — and with an insert into `search_query_log` that omits `lang`, which must fail.

> **REQ-136 (ETNI-1506).** `068` gives the language entity (`afrik_languages`) the search
> apparatus every other atlas entity already has: a `name_unaccent_vector` column (mirroring
> `afrik_peoples`/`afrik_countries`, `052`) and `afrik_search_languages`, modelled on
> `afrik_search_countries` (`052`) — no confidence/classification filters, since
> `afrik_languages` carries neither. It differs in one respect: the exact-match bonus fires on
> the ISO 639-3 id as well as on the name, so a reader who types "swa" reaches Swahili exactly as
> precisely as one who types its name (the language's `search_vector` already weights the ISO id
> at tier A since migration `055`, so no new column was needed for that half). File `067` is
> omitted from this table (added after the last full read, same as `050`/`064`/`065`); `068` is
> the next free version on `recette`.

> **REQ-135 (ETNI-1457).** `066` gives the name entity (`afrik_patronymes`, `053`) the search
> apparatus every other entity already has, plus one mechanism none of them do: a
> `name_phonetic` (fuzzystrmatch `dmetaphone()`) column and index, so a phonetic transcription
> ("Keyta") reaches a canonically spelled name ("Keïta") that neither an accent fold nor a
> trigram overlap would bridge. It also extends `public.afrik_unaccent` in place to fold
> apostrophes as well as accents — a shared helper, not a `afrik_patronymes`-only fix — and adds
> a `name_main`/`name_unaccent_vector`/`search_vector` trio and a trigram index following the
> `afrik_search_persons` (`065`) shape exactly. Files `064` and `065` are omitted from this table
> (added after the last full read, same as `050`); `066` is the next free version on `recette`.
> Because the apostrophe fold only affects a `name_unaccent_vector` on the next write of an
> existing row, `afrik_peoples`/`afrik_countries`/`persons` do not retroactively pick it up until
> their next full corpus reload — no acceptance criterion of this ticket needs them to sooner.

> **ETNI-1411 (DEC-034).** `063` is DEC-034's second mechanism: pg_trgm plus a trigram GIN index
> on the accent-folded `afrik_peoples.name_main`, and a fallback tier inside
> `afrik_search_peoples` (migration 044) so a single-letter typo with no declared alias still
> surfaces a fiche. The fallback only fires when the lexical predicate (`search_vector @@ tsq`)
> finds nothing, and an explicit `lexical_match` boolean orders ahead of the continuous
> `relevance` score, so a real lexical or exact match always outranks a fuzzy-only one regardless
> of magnitude. Similarity threshold 0.4 deliberately excludes the two documented non-goals —
> "gour" (too short for reliable trigrams) and "bt" (an abbreviation) — both of which remain
> migration 060's alias mechanism. Queue position 6, after 060 (ETNI-1408); no RPC signature
> change, so the query layer (`ftsSearchEntities`) and OpenAPI needed no edit. Rollout is
> two-step: recette applies automatically when this PR merges; production is manual, by hand.
> Until production carries `063`, a single-letter typo on a people's name resolves on recette but
> not yet on production.

> **Drift closure.** `062` restores the fourteen `COMMENT ON` statements that `038` declares and
> the database never received. `migrations:diff` reported three drifted migrations on recette;
> only this one was real. `018` differs by a trailing `;` and `039` by adjacent string literals
> that SQL concatenates — both produce identical state, and neither needs a migration. Every
> function and policy in `038` is byte-identical between file and database, so `062` carries no
> behaviour: it exists so a SECURITY DEFINER function's rationale is readable at query time
> rather than only in a file. ETNI-1186, DEC-017.

> **ETNI-1455.** `061` adds `afrik_patronyme_alliances`, a name-granularity table for sourced,
> symmetric alliances between two names (e.g. the Manding sanankuya), modelled on
> `afrik_people_relations` (`030`). A canonical-ordering `CHECK (name_id_a < name_id_b)` plus a
> `UNIQUE (name_id_a, name_id_b)` constraint make the reversed pair a rejected insert rather than
> a duplicate row (AC1); a `NOT NULL source_id` plus a `BEFORE INSERT OR UPDATE` source-or-drop
> trigger reject any edge with no source (AC2), and `tier` follows the one three-value vocabulary
> from `041`. Out of scope for this migration: seeding actual alliances (editorial) and the UI
> that renders them. Rollout is two-step: recette applies automatically when this PR merges;
> production is manual, by hand. Until production carries `061`, no alliance data can be written
> to either project — this migration is schema-only and ships with nothing seeded.

> **ETNI-1408 (DEC-034).** `060` adds a `spelling_aliases` JSONB column to `afrik_peoples` and
> `afrik_languages` and folds it into `search_vector` at weight B — the same weight `043`/`055`
> already give exonyms and alternate names, so a declared alternate spelling ranks alongside them
> rather than only at the low-weight prose tier. This PR's branch is stacked on the still-unmerged
> `ferry/ETNI-1405` branch (which carries `059_afrik_countries_prose_search_vector.sql`), purely so
> `check:migration-files` sees a contiguous sequence with no hole at `059`; `059`'s own row belongs
> to ETNI-1405's PR and is not duplicated here. Per the cross-cutting migration-queue rule, `060`
> must not merge concurrently with any other in-flight migration — in particular it should land
> after (or together with) `059`, never before it on `recette`. Rollout is two-step: recette
> applies automatically when this PR merges; production is manual, by hand. Until production
> carries `060`, a people's or language's declared spelling aliases are searchable on recette but
> not yet on production — matching behaviour is unchanged there, only recall widens once applied.

> **ETNI-1402 (DEC-028).** `058` widens `afrik_peoples.search_vector` — weight D now also
> covers `content->origins`, `->organization`, `->ethnicities`, `->culture` and
> `->historicalRole`, on top of the `content->appellations` weighting migration `043` already
> set (A on `name_main`/`selfAppellation`, B on `exonyms`, D on the rest of `appellations`).
> This is position 3 of the DEC-028 migration-queue program, after `056` (ETNI-1400); per the
> cross-cutting migration-queue rule it must not merge concurrently with any other migration in
> the program. Rollout is two-step: recette applies automatically when this PR merges into
> `recette`; production is manual, by hand. Until production carries `058`, the extra prose
> recall (a term that appears only in one of the five new sections, e.g. a historical figure
> named only in `historicalRole`) is absent on whichever project has not yet been migrated —
> matching behaviour is unchanged there, only recall widens once applied.

> **ETNI-1400 (DEC-028).** `056` adds `search_vector` to `afrik_language_families` —
> weight A on `name_fr`/`name_en`, weight D on every string inside
> `content->decolonialHeader` — plus its GIN index, so a term that appears only in a
> family's decolonial text now surfaces that family (`searchAfrikLanguageFamiliesByText`,
> `src/lib/supabase/queries/afrik/languageFamilies.ts`). This was authored and merged as `055`,
> but `055_afrik_language_search_vector.sql` (ETNI-1504) reached `recette` first and
> `check:migration-files` refuses a duplicate version, so this migration was renumbered to `056`
> in a follow-up PR. Rollout is two-step: recette applies automatically when that PR merges;
> production is manual. Until production carries `056`, `searchAfrikLanguageFamiliesByText`
> answers `column "search_vector" does not exist` there — deploy the migration to a project
> before the application code that queries it reaches that project.

Migration `051` adds the authenticated `publish_revision(uuid, text)` transaction boundary.
ETNI-70 deliberately leaves it unapplied: rollout remains recette first, application verification
second, then production, with a fresh ledger read after each step.

> **Correction, 2026-08-31 (ETNI-1397).** Migration `052` is the migration this ticket adds — it
> was authored as `051` but renumbered to `052` at merge time because `051_revision_publication.sql`
> (ETNI-70) reached `recette` first and `check:migration-files` refuses a duplicate version. `052`
> adds two functions (`afrik_unaccent`, `afrik_prefix_tsquery`), a `name_unaccent_vector` column on
> `afrik_peoples` and `afrik_countries`, and `CREATE OR REPLACE` on `afrik_search_peoples` /
> `afrik_search_countries` — REQ-129, prefix and accent-insensitive name matching. Rollout is
> two-step: recette applies automatically when this PR merges (`migrate-recette.yml`, no hole after
> `051`); production is manual. Until both projects carry `052`, `afrik_search_peoples` and
> `afrik_search_countries` keep their pre-`052` behaviour on whichever project has not been migrated
> — they do not error, because `CREATE OR REPLACE` preserves the existing signatures.

> **Correction, 2026-08-30.** The table stopped at `044` while `045` through `048` had already
> been applied to recette by `migrate-recette.yml`. A direct read of the recette ledger lists all
> four under their own numeric versions; the rows above now say so. The gap is the same failure
> mode the 2026-08-28 correction records — the automation applies migrations, this document is
> updated by hand, and nothing fails when the hand forgets.

> **Correction, 2026-08-28.** This table listed `040`, `041` and `042` as not applied. A direct
> read of the recette ledger shows all three present under their own numeric versions. The prose
> below was written before they were applied and was never revised — when the two disagree, the
> ledger is the fact and this document is the claim.

`040` enables row-level security on `assertion_references`, which `031` created with no RLS, no
policy and no grants — leaving it writable by anyone holding the anon key that ships in the
browser bundle. It is in the tree and on neither database. Both steps of the rollout are
outstanding.

---

## Three ways this state goes wrong silently

Each of these has already happened. They are listed so the next occurrence is recognisable
rather than mysterious.

### 1. Jira "Done" is not "applied"

ETNI-1186 was closed and its pull request merged while `037` and `038` were on **neither**
database. The ledger stopped at `036` while the repository was at `038`, and nothing in CI or
in the ticket workflow compares the two.

**Detect it before trusting a ticket.** Read-only probes, no writes, anon key where RLS is the
thing under test:

```bash
# 037 — the colonization enum. 400 = enum value missing, 200 = migration applied.
curl -s -o /dev/null -w '%{http_code}\n' \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/migration_events?select=id&event_type=eq.imposed_name" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# 038 — the user_roles RLS recursion fix. 42P17 in the body = still broken.
# Must use the ANON key: the service role bypasses RLS and proves nothing.
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/name_records?select=id&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

**Rule:** for anything under `supabase/migrations/`, the ticket is closed by a ledger read on
both projects, not by a merged PR.

### 2. The ledger version can disagree with the filename

The Supabase MCP `apply_migration` stamps a **timestamp** version (`20260828165455`) instead of
the file's numeric prefix. The migration is genuinely applied, but the ledger row no longer
names any file in `supabase/migrations/`.

**This breaks the recette workflow — it does not merely confuse a report.** On 2026-08-28,
`043` and `044` were applied through the MCP and the merge to `recette` then failed:

```
Remote migration versions not found in local migrations directory.
supabase migration repair --status reverted 20260828165455 20260828165554
```

`migrate-recette.yml` runs `supabase db push --include-all`, which reconciles on the **version
string**. A ledger version with no matching file makes it refuse to run at all and exit 1 —
so every later migration is blocked too, until the ledger is repaired. An earlier note here
guessed that push would simply re-run the migrations and called that survivable because they
are idempotent. That guess was wrong: nothing gets re-run, because nothing runs.

**Therefore: apply migrations with the CLI, not the MCP.** If the MCP has already been used,
repair the ledger before the next merge — either `supabase migration repair`, or directly:

```sql
UPDATE supabase_migrations.schema_migrations
   SET version = '043' WHERE name = 'afrik_search_vector_weights';
```

The `name` column is what stays trustworthy across this, which is why
`scripts/lib/migrationLedger.ts` reconciles on the name. `037`, `038` and `039` hit the same
trap and were repaired the same way; they now read `037`/`038`/`039`.

Renumbering is enough only when the recorded statements match the file. `044` was applied
through the MCP from hand-edited SQL — a different dollar-quote tag, and `COMMENT ON FUNCTION`
strings reworded to survive the paste — so after renumbering it read as **drifted** instead.
Its ledger row was therefore deleted rather than patched: with no row, the next
`supabase db push` applies the file itself and records the statements the file actually
contains. That is what happened — the workflow re-ran and logged
`Applying migration 044_afrik_ranked_search.sql`, and the ledger now reads `043` and `044`
under their own numbers, neither drifted.

**Deleting the row is the repair. Patching the version is not**, unless the recorded
statements already match the file.

The workflow run is still red, on the three drifts below (`018`, `038`, `039`). Those predate
this work and have made it red since 2026-08-26; they need their own ticket.

### 3. "Recorded as applied" does not mean the object still exists

Migration `003` added `sources_title_key UNIQUE (title)`. Migration `007` then ran
`DROP TABLE sources CASCADE`, taking the constraint with it, and `009` recreated the table with
`CREATE TABLE IF NOT EXISTS` and never restored it. The ledger still showed `003` as applied
for the whole of that window, so nothing flagged the loss — and every `upsertSource` in the
AFRIK loaders failed until `039` put the constraint back.

**Rule:** a later migration that drops or recreates a table invalidates every earlier migration
that added an object to it. When a migration includes `DROP TABLE … CASCADE` or
`CREATE TABLE IF NOT EXISTS` on a table an earlier migration touched, re-assert the earlier
objects explicitly in the new migration. Verify the object, not the ledger row.

---

## The automation, and what it does not cover

Two of the three failures above are now measured rather than remembered. The third — an object
dropped out from under a migration that stays recorded as applied — is not detectable from the
ledger, and the checklist below is what covers it.

### On every pull request — `check:migration-files`

`npm run check:migration-files` (in `ci.yml`) checks only what is knowable without a database:
no two files claiming the same version, no two sharing a name, no hole in the numbered
sequence. Whether a migration is _applied_ is deliberately not checked here — the migration a
pull request adds is pending by definition, so the question has no meaningful answer before
the merge.

Version and name collisions are the parallel-branch failure: two branches each add `043_`, git
merges both without complaint, and Postgres then applies them in filename order — so which one
wins is decided by the rest of the name rather than by anyone. A shared name is worse: the
ledger keys on name, so reconciliation can no longer tell which file a row refers to.

### On merge into `recette` — `migrate-recette.yml`

A push to `recette` that touches `supabase/migrations/**` applies the pending migrations to the
recette project, then re-runs the reconciliation to prove the apply did what it claimed. It
logs the SQL it is about to run first, so the job output is the record of what that deploy
changed in the database.

It needs one secret, **`RECETTE_SUPABASE_DB_URL`** — the recette project's Postgres connection
string (Supabase dashboard → Project Settings → Database → Connection string → URI, with the
password filled in). Without it the job **skips loudly** with a warning rather than failing, so
a fork or Dependabot pull request does not read as broken. Nothing is applied while that secret
is absent, which means the gap this workflow exists to close stays open until it is set.

### On a published Release — `deploy-production.yml`, the `migrate` job

Production used to be deliberately manual here, on the reasoning that the second step of the
two-step rule is a decision rather than a consequence. It stopped being manual once the ledger
became measurable, because **a step performed by hand before every deploy is a step that gets
skipped** — at the 4.1.0 release the runbook claimed production stood at `049` while thirty-two
migrations had landed on recette. The decision is still a decision; it is now expressed by
publishing the Release, which is already the only thing that deploys.

The job measures the ledger, refuses a `db push` plan wider than that measurement, applies, and
measures again. The deploy `needs:` it, so a Release published against a behind schema fails
before anything reaches the VPS.

#### Why it goes through an SSH tunnel

**The production Postgres is not on the internet, and no connection string changes that.**
Measured 2026-09-03: `supabase.ethniafrica.com` (`145.239.76.125`) answers on `443` and refuses
`5432` and `6543`. The v4.1.1 deploy read the ledger fine — that goes over PostgREST on 443 —
and then died on `dial error (connect ECONNREFUSED …:5432)` because `db push` needs Postgres
itself. The two production secrets had been pointing at **different machines**: the PostgREST
URL at the self-hosted stack, the DB URL at the retired hosted project `jajggbeimfudpzcxytbb`.

The symptom reads like a network problem — IPv6, a missing pooler, Network Restrictions — and is
none of those. There is no Supavisor pooler in front of a self-hosted stack.

Publishing 5432 so a runner could reach it would put the production database in front of
GitHub's entire address space; the runners have no stable range to restrict to. So the job opens
an SSH forward instead and `db push` keeps running on the runner, where the CLI, the migration
files and the ledger comparison already live. Only the network path moves.

Consequences, both asserted by `scripts/__tests__/deployProductionWorkflow.test.ts`:

- **There is no `PRODUCTION_SUPABASE_DB_URL`.** It was removed, because every one of the five
  deploys that failed on 2026-09-03 failed for the same underlying reason: a stored connection
  string and the machine disagreed. In order, it named the retired hosted project, then a port
  that is not published, then wanted TLS the server does not offer, then lacked a Supavisor
  tenant, then carried a password the pooler no longer held. A credential kept in two places
  drifts. The job now reads `POSTGRES_PASSWORD` from the stack's own `.env` over the SSH access it
  already needs for the tunnel, masks it, and builds the URL itself. The `.env` cannot be wrong
  about the stack it configures.
- **The forward targets the `supabase-db` container, not the host loopback.** Host port `5432` is
  **Supavisor**, the pooler: measured 2026-09-03 it published `127.0.0.1:5432` and
  `127.0.0.1:6543`, while `supabase-db` exposed `5432` only inside the Docker network. A pooler
  buys a migration nothing — `db push` opens one connection, runs DDL and leaves — and it cost two
  failures. Supavisor demands a tenant identifier in the username (`ENOIDENTIFIER`; the tenant is
  `POOLER_TENANT_ID`, still the shipped example value `your-tenant-id`), and it then authenticates
  with a copy of the password seeded at first boot. Recreating the container does **not** refresh
  that copy: the tenant row already exists and the seed does not overwrite it, so `28P01` survived
  a `--force-recreate` while the same password was verified working against the database directly.
- **The container address is resolved at tunnel time**, with `docker inspect` over the same SSH.
  Docker assigns it, so a pinned address breaks the next time the container is recreated.
- **`ExitOnForwardFailure=yes` is load-bearing.** Without it `ssh -f` exits 0 having established
  nothing, and the runner then has a local port that accepts no connection — which `db push`
  would report as a database problem.
- **The host key is pinned** through `SUPABASE_OVH_SSH_KNOWN_HOSTS`, for the same reason the
  deploy job pins Gravelines: an unpinned tunnel forwards a database credential to whoever
  answers on that address.
- **`sslmode=disable`.** The self-hosted Postgres offers no TLS and the Supabase CLI asks for it:
  v4.2.0 reached the server and died on `tls error (The server does not support SSL connections)`.
  Disabling it is correct rather than merely expedient — the bytes are already inside SSH.

### The plan gate was vacuous when the connection failed

Worth its own heading, because it is the failure mode this runbook exists to name. At v4.2.0 the
dry run failed to connect and the step reported **`planned=0 measured=20` and passed green**:

```
supabase db push … --dry-run | tee plan.txt     # exit code lost to the pipe
PLANNED=$(grep -cE … plan.txt || true)          # no match -> 0
[ "$PLANNED" -gt "$MEASURED" ]                  # 0 is never greater
```

Three separate things had to be wrong together, and each looked reasonable alone. The step now
sets `pipefail`, and **refuses a plan of zero** — it only runs when migrations are pending, so
planning none of them is not a quiet success. A gate that can only catch "too wide" cannot catch
"never happened".

Five secrets, alongside the existing `PRODUCTION_OVH_SSH_*` set for the application host — these
name the **Supabase** host (Francfort, `145.239.76.125:22`), which is a different machine from
the one that runs the app (Gravelines, `51.195.82.98:49152`):

| Secret                         | Value                                                     |
| ------------------------------ | --------------------------------------------------------- |
| `SUPABASE_OVH_SSH_KEY`         | private half of a CI-only keypair                         |
| `SUPABASE_OVH_SSH_KNOWN_HOSTS` | `ssh-keyscan -H <host>` output                            |
| `SUPABASE_OVH_SSH_HOST`        | the Supabase VPS address                                  |
| `SUPABASE_OVH_SSH_USER`        | the account whose `authorized_keys` holds the public half |
| `SUPABASE_OVH_SSH_PORT`        | `22` on that host                                         |

The key is **created, not retrieved** — there is no dashboard for a self-hosted stack, and the
Postgres password lives in the stack's own `.env` (`POSTGRES_PASSWORD`), not in a settings page:

```bash
ssh-keygen -t ed25519 -N "" -C "gha-migrate" -f ~/.ssh/gha_migrate
ssh-copy-id -i ~/.ssh/gha_migrate.pub <user>@<supabase-host>
gh secret set SUPABASE_OVH_SSH_KEY --repo big-emotion/ethniafrica < ~/.ssh/gha_migrate
ssh-keyscan -H <supabase-host> | gh secret set SUPABASE_OVH_SSH_KNOWN_HOSTS --repo big-emotion/ethniafrica
```

Re-running a failed deploy does **not** pick up a fixed workflow: a re-run replays the workflow
file as it was on the original run. After changing this job, a new Release is what exercises it.

### Nightly, and on demand — `check:migration-state`

`npm run check:migration-state` reconciles every file against the ledger and fails on three
states, all of which have occurred here:

| State      | Meaning                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------ |
| `pending`  | On disk, never applied. The database is behind the code.                                         |
| `orphaned` | Applied, but no file describes it any more. The schema cannot be rebuilt from the repository.    |
| `drifted`  | Applied, but the file changed afterwards. The two disagree, and the file is the one people read. |

A fourth, `unverifiable`, is reported but does not fail: migrations applied before the ledger
began storing statements cannot be checked for drift, and failing on them would flag the whole
early history.

It runs nightly in `data-integrity.yml` and inside `migrate-recette.yml`. It matches files to
ledger rows **by name, never by version** — see failure mode 2 above.

### Seeing what is pending

```bash
npm run migrations:diff            # what would run, names only
npm run migrations:diff -- --sql   # …with the statements
```

Both read `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, so pointing them at the
production project is a matter of exporting that project's values first. That is currently the
only way to fill in the production column of the state table.

### What the automation still cannot see

- **The production project.** Nothing automated reaches it. Its column in the state table stays
  unread until someone runs `migrations:diff` against it.
- **Failure mode 3 — an object dropped by a later migration.** The ledger still says the earlier
  migration was applied, and it was. Comparing files to the ledger cannot catch it; only
  verifying the object can. The checklist below is what covers that.
- **Anything applied by hand through the dashboard.** It lands in the ledger with no
  corresponding file and surfaces as `orphaned` on the next nightly run — which is the point,
  but only after the fact.

### Prerequisite

All of this reads the ledger through `public.applied_migrations()`, added by migration
`042_migration_ledger_introspection.sql`. Until `042` is applied to a database, the check
against it fails with a message naming that migration. Apply it first.

---

## Applying a migration — the checklist

Copy this into the ticket. Both halves, every time.

**Recette-backing project** — the merge applies the migration and reads the ledger back for
you (`migrate-recette.yml`), so on recette these boxes are a verification, not a procedure.
What CI cannot do is check that the object actually exists: it reads the ledger, and the ledger
records intent, not outcome. That box is still yours.

- [ ] Snapshot taken (Supabase dashboard → Database → Backups) and restorable.
- [ ] Migration applied.
- [ ] Ledger read back; the migration's **name** appears.
- [ ] The object it creates verified directly (constraint, enum value, policy, function) —
      not just the ledger row.
- [ ] Exercised through the recette application, with the anon key where RLS is involved.
- [ ] This document's state table updated.

**Production-backing project** — only after every box above is ticked

- [ ] Snapshot taken and restorable.
- [ ] Same migration file applied, unmodified.
- [ ] Ledger read back; the migration's name appears.
- [ ] Object verified directly.
- [ ] Exercised against the production application.
- [ ] This document's state table updated.

---

## Related

- [`afrik-data-sync.md`](./afrik-data-sync.md) — loading the AFRIK corpus once
  the schema is in place, and the same target-naming trap.
- [`restore-procedure.md`](./restore-procedure.md) — recovering when a migration goes wrong.
- [`../DEPLOYMENT.md`](../DEPLOYMENT.md) — where the two-step rule sits in the wider release.
