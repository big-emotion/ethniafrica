# Runbook — Supabase migration state

**Last verified:** 2026-08-28 (live read of `supabase_migrations.schema_migrations`)
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

### Why the production-backing project's state is still unread

The ref `jajggbeimfudpzcxytbb` was supplied by the environment owner on 2026-08-26 and is now
the value of the `PRODUCTION_SUPABASE_URL` repository secret. It has **not been verified from
here**: the Supabase access token available to tooling in this repository sees exactly one
project (`shmrjtnfbqzceovroqjj`, org `yrdutxiucwjgsqexvcop`), and a `get_project` call against
the production ref returns "You do not have permission to perform this action". So its ledger
could not be read, and the state column below **is deliberately left unread rather than
guessed**.

Getting it wrong is not silent: `resolveAfrikSyncTarget` refuses to sync unless the active
Supabase URL equals the configured production one, and refuses outright if that value is the
recette ref. A wrong ref fails the job; it does not write anywhere.

To fill it in, authenticate against the account that owns it and run:

```
mcp__supabase__list_projects
mcp__supabase__list_migrations  { project_id: "<production-backing-ref>" }
```

Then complete the identity row above and the right-hand column of the state table below, and
update the "Last verified" date.

---

## State table

Read from the recette-backing project's (`shmrjtnfbqzceovroqjj`)
`supabase_migrations.schema_migrations` ledger on 2026-08-26. **Only the recette column is a
measurement.** The production column is not "presumed unapplied" — it is unread, because this
repository's credentials cannot reach that project.

| File                                          | Recette (`shmrjtnfbqzceovroqjj`)            | Production (`?`) |
| --------------------------------------------- | ------------------------------------------- | ---------------- |
| `001_initial_schema.sql`                      | applied (`001`)                             | unknown          |
| `002_add_enriched_fields.sql`                 | applied (`002`)                             | unknown          |
| `003_add_unique_constraint_sources_title.sql` | applied (`003`) — but see the caveat below  | unknown          |
| `004_change_ancient_names_to_jsonb.sql`       | applied (`004`)                             | unknown          |
| `005_add_country_sections_4_and_6.sql`        | applied (`005`)                             | unknown          |
| `006_afrik_schema.sql`                        | applied (`006`)                             | unknown          |
| `007_remove_v1_add_v2_contribution_types.sql` | applied (`007`)                             | unknown          |
| `008_user_roles.sql`                          | applied (`008`)                             | unknown          |
| `009_module_zero_fabric.sql`                  | applied (`009`)                             | unknown          |
| `010_classification_status_enum.sql`          | applied (`010`)                             | unknown          |
| `011_assertions_triggers.sql`                 | applied (`011`)                             | unknown          |
| `012_api_keys.sql`                            | applied (`012`)                             | unknown          |
| `013_api_keys_tier.sql`                       | applied (`013`)                             | unknown          |
| `014_flags_severity_auto.sql`                 | applied (`014`)                             | unknown          |
| `015_module_zero_fabric_align.sql`            | applied (`015`)                             | unknown          |
| `016_module_zero_triggers.sql`                | applied (`016`)                             | unknown          |
| `017_editorial_doctrine_rls_lockdown.sql`     | applied (`017`)                             | unknown          |
| `018_editorial_doctrine_seed.sql`             | applied (`018`)                             | unknown          |
| `019_afrik_rls.sql`                           | applied (`019`)                             | unknown          |
| `020_per_assertion_fiche_revisions.sql`       | applied (`020`)                             | unknown          |
| `021_revisions_ddl.sql`                       | applied (`021`)                             | unknown          |
| `022_flags_full_ddl.sql`                      | applied (`022`)                             | unknown          |
| `023_moderator_schema.sql`                    | applied (`023`)                             | unknown          |
| `024_pg_notify_cache_invalidation.sql`        | applied (`024`)                             | unknown          |
| `025_search_vectors.sql`                      | applied (`025`)                             | unknown          |
| `026_contributor_profiles.sql`                | applied (`026`)                             | unknown          |
| `027_contributor_erasure.sql`                 | applied (`027`)                             | unknown          |
| `028_language_tree_support.sql`               | applied (`028`)                             | unknown          |
| `029_names_atlas.sql`                         | applied (`029`)                             | unknown          |
| `030_people_relations.sql`                    | applied (`030`)                             | unknown          |
| `031_normalized_sources.sql`                  | applied (`031`)                             | unknown          |
| `032_oral_narratives.sql`                     | applied (`032`)                             | unknown          |
| `033_rights_consent_access_controls.sql`      | applied (`033`)                             | unknown          |
| `034_source_working_assets.sql`               | applied (`034`)                             | unknown          |
| `035_migration_events.sql`                    | applied (`035`)                             | unknown          |
| `036_quiz_engine.sql`                         | applied (`036`)                             | unknown          |
| `037_colonization_event_types.sql`            | applied — ledger version `20260825211643`   | unknown          |
| `038_user_roles_rls_recursion_fix.sql`        | applied — ledger version `20260825211702`   | unknown          |
| `039_restore_sources_title_unique.sql`        | applied — ledger version `20260825211737`   | unknown          |
| `040_assertion_references_rls.sql`            | applied (`040`)                             | unknown          |
| `041_one_source_tier_vocabulary.sql`          | applied (`041`)                             | unknown          |
| `042_migration_ledger_introspection.sql`      | applied (`042`)                             | unknown          |
| `043_afrik_search_vector_weights.sql`         | applied (`043`) — see the repair note below | unknown          |
| `044_afrik_ranked_search.sql`                 | objects live; ledger row awaiting re-record | unknown          |

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
contains. **Re-run `migrate-recette.yml` to close this.** The functions are live and verified
in the meantime; only the bookkeeping is outstanding.

Note that run will still fail on the three drifts below (`018`, `038`, `039`), which predate
this and have made the workflow red since 2026-08-26.

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
