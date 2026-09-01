# Runbook — Supabase migration state

**Last verified:** 2026-08-31 (live read of `supabase_migrations.schema_migrations` on **both** projects)
**Applies to:** every file under `supabase/migrations/`

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

| File                                          | Recette (`shmrjtnfbqzceovroqjj`)                              | Production (`jajggbeimfudpzcxytbb`)                    |
| --------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| `001_initial_schema.sql`                      | applied (`001`)                                               | applied                                                |
| `002_add_enriched_fields.sql`                 | applied (`002`)                                               | applied                                                |
| `003_add_unique_constraint_sources_title.sql` | applied (`003`) — but see the caveat below                    | applied                                                |
| `004_change_ancient_names_to_jsonb.sql`       | applied (`004`)                                               | applied                                                |
| `005_add_country_sections_4_and_6.sql`        | applied (`005`)                                               | applied                                                |
| `006_afrik_schema.sql`                        | applied (`006`)                                               | applied                                                |
| `007_remove_v1_add_v2_contribution_types.sql` | applied (`007`)                                               | applied                                                |
| `008_user_roles.sql`                          | applied (`008`)                                               | applied                                                |
| `009_module_zero_fabric.sql`                  | applied (`009`)                                               | applied                                                |
| `010_classification_status_enum.sql`          | applied (`010`)                                               | applied                                                |
| `011_assertions_triggers.sql`                 | applied (`011`)                                               | applied                                                |
| `012_api_keys.sql`                            | applied (`012`)                                               | applied                                                |
| `013_api_keys_tier.sql`                       | applied (`013`)                                               | applied                                                |
| `014_flags_severity_auto.sql`                 | applied (`014`)                                               | applied                                                |
| `015_module_zero_fabric_align.sql`            | applied (`015`)                                               | applied                                                |
| `016_module_zero_triggers.sql`                | applied (`016`)                                               | applied                                                |
| `017_editorial_doctrine_rls_lockdown.sql`     | applied (`017`)                                               | applied                                                |
| `018_editorial_doctrine_seed.sql`             | applied (`018`)                                               | applied                                                |
| `019_afrik_rls.sql`                           | applied (`019`)                                               | applied                                                |
| `020_per_assertion_fiche_revisions.sql`       | applied (`020`)                                               | applied                                                |
| `021_revisions_ddl.sql`                       | applied (`021`)                                               | applied                                                |
| `022_flags_full_ddl.sql`                      | applied (`022`)                                               | applied                                                |
| `023_moderator_schema.sql`                    | applied (`023`)                                               | applied                                                |
| `024_pg_notify_cache_invalidation.sql`        | applied (`024`)                                               | applied                                                |
| `025_search_vectors.sql`                      | applied (`025`)                                               | applied                                                |
| `026_contributor_profiles.sql`                | applied (`026`)                                               | applied                                                |
| `027_contributor_erasure.sql`                 | applied (`027`)                                               | applied                                                |
| `028_language_tree_support.sql`               | applied (`028`)                                               | applied                                                |
| `029_names_atlas.sql`                         | applied (`029`)                                               | applied                                                |
| `030_people_relations.sql`                    | applied (`030`)                                               | applied                                                |
| `031_normalized_sources.sql`                  | applied (`031`)                                               | applied                                                |
| `032_oral_narratives.sql`                     | applied (`032`)                                               | applied                                                |
| `033_rights_consent_access_controls.sql`      | applied (`033`)                                               | applied                                                |
| `034_source_working_assets.sql`               | applied (`034`)                                               | applied                                                |
| `035_migration_events.sql`                    | applied (`035`)                                               | applied                                                |
| `036_quiz_engine.sql`                         | applied (`036`)                                               | applied                                                |
| `037_colonization_event_types.sql`            | applied — ledger version `20260825211643`                     | applied                                                |
| `038_user_roles_rls_recursion_fix.sql`        | applied — ledger version `20260825211702`                     | applied                                                |
| `039_restore_sources_title_unique.sql`        | applied — ledger version `20260825211737`                     | applied                                                |
| `040_assertion_references_rls.sql`            | applied (`040`)                                               | applied                                                |
| `041_one_source_tier_vocabulary.sql`          | applied (`041`)                                               | applied                                                |
| `042_migration_ledger_introspection.sql`      | applied (`042`)                                               | applied                                                |
| `043_afrik_search_vector_weights.sql`         | applied (`043`) — see the repair note below                   | applied                                                |
| `044_afrik_ranked_search.sql`                 | applied (`044`)                                               | applied                                                |
| `045_afrik_countries_summary.sql`             | applied (`045`)                                               | applied                                                |
| `046_quiz_stimulus.sql`                       | applied (`046`)                                               | applied                                                |
| `047_quiz_bank_indexes.sql`                   | applied (`047`)                                               | applied                                                |
| `048_antibot.sql`                             | applied (`048`)                                               | applied                                                |
| `049_afrik_countries_name_official.sql`       | applied (`049`)                                               | applied                                                |
| `050_search_query_log.sql`                    | not measured after `049`                                      | not measured after `049`                               |
| `051_revision_publication.sql`                | pending — not applied by ETNI-70                              | pending — not applied by ETNI-70                       |
| `052_afrik_search_prefix_unaccent.sql`        | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                |
| `054_afrik_people_languages.sql`              | pending — human-applied via `supabase db push`, recette first | pending — human-applied via `supabase db push`, second |
| `056_afrik_language_family_search_vector.sql` | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                |
| `058_afrik_people_prose_search_vector.sql`    | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                |
| `060_afrik_spelling_aliases.sql`              | pending — applies on merge via `migrate-recette.yml`          | pending — apply by hand                                |

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

Production is deliberately **not** automated. The two-step rule is recette first, verify on the
recette application, then production — and the second step is a decision, not a consequence of
a merge.

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
