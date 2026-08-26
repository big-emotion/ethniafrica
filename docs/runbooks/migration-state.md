# Runbook — Supabase migration state

**Last verified:** 2026-08-26 (live read via the Supabase MCP `list_migrations`)
**Applies to:** every file under `supabase/migrations/`

Two Supabase projects are both labelled **production**. That collision is the reason this
document exists: "we pushed it to production" does not identify a database here. Always name
the environment the project _backs_, never the label the dashboard shows.

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

|                       | Backs **recette**                                                       | Backs **production**       |
| --------------------- | ----------------------------------------------------------------------- | -------------------------- |
| Supabase project ref  | `shmrjtnfbqzceovroqjj`                                                  | _not recorded — see below_ |
| Dashboard name        | `ethniafrica` (has also been labelled _prod_)                           | _unknown_                  |
| Region                | `eu-west-1`                                                             | _unknown_                  |
| Created               | 2026-07-24                                                              | _unknown_                  |
| Named in this repo as | `AFRIK_PRODUCTION_SUPABASE_URL` (`scripts/lib/afrikMigrationTarget.ts`) | —                          |
| Reached by the flag   | `--target=production`                                                   | —                          |

Two consequences of that third row, both traps:

- `scripts/lib/afrikMigrationTarget.ts` hard-codes `shmrjtnfbqzceovroqjj` as
  `AFRIK_PRODUCTION_SUPABASE_URL`. So `npx tsx scripts/migrateAfrikToDatabase.ts
--target=production` writes to the **recette-backing** project. The flag name does not
  describe the environment.
- `.github/workflows/production-data-sync.yml` sets the same ref as
  `NEXT_PUBLIC_SUPABASE_URL` and runs on a successful Vercel _Production_ deployment of
  `main`. Whatever that workflow syncs lands in the recette-backing project too.

Renaming that constant is an open follow-up. Until it is renamed, confirm the target with the
environment owner before any run with `--apply`.

### The identity above is not fully settled

Two signals in the repository disagree, and this document cannot resolve it from the tree alone:

- Project records from 2026-08 (and migration `039`'s own header comment, which says the corpora
  "loaded 0 rows against **recette**") place `shmrjtnfbqzceovroqjj` behind the **recette**
  application.
- `.github/workflows/production-data-sync.yml` targets that same ref on a successful Vercel
  **Production** deployment of `main`, and then POSTs a cache revalidation to
  `https://ethniafrica.com`.

If the first is right, a production deploy is syncing the corpus into the recette database and
revalidating a site it did not write to. If the second is right, the recette application has
been reading the production database. Either way something is mis-wired.

**Resolving this is a prerequisite for trusting the state table below.** Confirm with the
environment owner which application each project actually serves, then correct this section —
and note that the fix probably belongs in the workflow or the constant, not only in this
document.

### Why the production-backing project has no row here

The Supabase access token available to tooling in this repository can see exactly one project
(`shmrjtnfbqzceovroqjj`, org `yrdutxiucwjgsqexvcop`). The production-backing project is under
credentials that token does not carry, so its ledger could not be read and **is deliberately
left blank rather than guessed**.

To fill it in, authenticate against the account that owns it and run:

```
mcp__supabase__list_projects
mcp__supabase__list_migrations  { project_id: "<production-backing-ref>" }
```

Then complete the identity row above and the right-hand column of the state table below, and
update the "Last verified" date.

---

## State table

Read from the recette-backing project's `supabase_migrations.schema_migrations` ledger on
2026-08-26.

| File                                          | Recette (`shmrjtnfbqzceovroqjj`)           | Production (`?`) |
| --------------------------------------------- | ------------------------------------------ | ---------------- |
| `001_initial_schema.sql`                      | applied (`001`)                            | unknown          |
| `002_add_enriched_fields.sql`                 | applied (`002`)                            | unknown          |
| `003_add_unique_constraint_sources_title.sql` | applied (`003`) — but see the caveat below | unknown          |
| `004_change_ancient_names_to_jsonb.sql`       | applied (`004`)                            | unknown          |
| `005_add_country_sections_4_and_6.sql`        | applied (`005`)                            | unknown          |
| `006_afrik_schema.sql`                        | applied (`006`)                            | unknown          |
| `007_remove_v1_add_v2_contribution_types.sql` | applied (`007`)                            | unknown          |
| `008_user_roles.sql`                          | applied (`008`)                            | unknown          |
| `009_module_zero_fabric.sql`                  | applied (`009`)                            | unknown          |
| `010_classification_status_enum.sql`          | applied (`010`)                            | unknown          |
| `011_assertions_triggers.sql`                 | applied (`011`)                            | unknown          |
| `012_api_keys.sql`                            | applied (`012`)                            | unknown          |
| `013_api_keys_tier.sql`                       | applied (`013`)                            | unknown          |
| `014_flags_severity_auto.sql`                 | applied (`014`)                            | unknown          |
| `015_module_zero_fabric_align.sql`            | applied (`015`)                            | unknown          |
| `016_module_zero_triggers.sql`                | applied (`016`)                            | unknown          |
| `017_editorial_doctrine_rls_lockdown.sql`     | applied (`017`)                            | unknown          |
| `018_editorial_doctrine_seed.sql`             | applied (`018`)                            | unknown          |
| `019_afrik_rls.sql`                           | applied (`019`)                            | unknown          |
| `020_per_assertion_fiche_revisions.sql`       | applied (`020`)                            | unknown          |
| `021_revisions_ddl.sql`                       | applied (`021`)                            | unknown          |
| `022_flags_full_ddl.sql`                      | applied (`022`)                            | unknown          |
| `023_moderator_schema.sql`                    | applied (`023`)                            | unknown          |
| `024_pg_notify_cache_invalidation.sql`        | applied (`024`)                            | unknown          |
| `025_search_vectors.sql`                      | applied (`025`)                            | unknown          |
| `026_contributor_profiles.sql`                | applied (`026`)                            | unknown          |
| `027_contributor_erasure.sql`                 | applied (`027`)                            | unknown          |
| `028_language_tree_support.sql`               | applied (`028`)                            | unknown          |
| `029_names_atlas.sql`                         | applied (`029`)                            | unknown          |
| `030_people_relations.sql`                    | applied (`030`)                            | unknown          |
| `031_normalized_sources.sql`                  | applied (`031`)                            | unknown          |
| `032_oral_narratives.sql`                     | applied (`032`)                            | unknown          |
| `033_rights_consent_access_controls.sql`      | applied (`033`)                            | unknown          |
| `034_source_working_assets.sql`               | applied (`034`)                            | unknown          |
| `035_migration_events.sql`                    | applied (`035`)                            | unknown          |
| `036_quiz_engine.sql`                         | applied (`036`)                            | unknown          |
| `037_colonization_event_types.sql`            | applied — ledger version `20260825211643`  | unknown          |
| `038_user_roles_rls_recursion_fix.sql`        | applied — ledger version `20260825211702`  | unknown          |
| `039_restore_sources_title_unique.sql`        | applied — ledger version `20260825211737`  | unknown          |
| `040_assertion_references_rls.sql`            | **not applied**                            | **not applied**  |

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

`037`, `038` and `039` were applied through the Supabase MCP `apply_migration`, which stamps a
timestamp version (`20260825211643`, `20260825211702`, `20260825211737`) instead of the file's
numeric prefix. The migrations are genuinely applied, but a tool that compares the ledger's
_version strings_ against the filenames — `supabase migration list`, or a naive script — will
report all three as pending.

**Match on the migration name, not the version**, when reconciling. The names recorded
(`colonization_event_types`, `user_roles_rls_recursion_fix`, `restore_sources_title_unique`)
line up exactly with the files.

If a future `supabase db push` re-runs them because of this mismatch, that is survivable only
because all three are written idempotently. Do not rely on that for new migrations — write
them idempotently anyway.

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

## Applying a migration — the checklist

Copy this into the ticket. Both halves, every time.

**Recette-backing project**

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

- [`afrik-staging-data-sync.md`](./afrik-staging-data-sync.md) — loading the AFRIK corpus once
  the schema is in place, and the same target-naming trap.
- [`restore-procedure.md`](./restore-procedure.md) — recovering when a migration goes wrong.
- [`../DEPLOYMENT.md`](../DEPLOYMENT.md) — where the two-step rule sits in the wider release.
