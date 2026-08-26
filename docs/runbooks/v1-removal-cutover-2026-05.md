# Runbook — V1 schema removal cutover (2026-05)

**Status: historical record of 2026-05-14. The cutover is complete; this is not a procedure to
run.**

Kept as the account of how the V1 schema left the databases, and because one loose end from it
is still open (see the bottom of this page). For applying a migration today, see
[`migration-state.md`](./migration-state.md).

**Migration:** `supabase/migrations/007_remove_v1_add_v2_contribution_types.sql`
**Applied:** 2026-05-14, staging then production, with an idempotent re-apply the same day
**Related issue:** AUDIT-5 (`#102`)

> The recette-backing project's ledger records this as plain version `007` today. The
> timestamped ledger entries from the day of the cutover were noted at the time but are not
> what that ledger now shows, so they are not reproduced here — read the live ledger, not this
> record, when you need the version strings.

---

## Why it happened

The V1 schema — `african_regions`, `countries` (v1), `ethnic_groups`, `ethnic_group_*`,
`languages` (v1), `sources` — had already been removed from the application code, but migration
`007` was committed and never applied. The databases therefore carried seven dead tables, a
fresh `supabase db reset` diverged from the deployed schema, and the V2 contribution types
existed in TypeScript but not necessarily in the `contribution_type` enum, so a V2 contribution
could fail at `INSERT` time.

This is the first recorded instance of the failure mode that
[`migration-state.md`](./migration-state.md) now exists to catch: **a merged migration is not an
applied migration.**

---

## What migration 007 did

1. Added the V2 contribution-type enum values with `ADD VALUE IF NOT EXISTS` (idempotent):
   `new_people`, `update_people`, `new_country`, `update_country`, `new_language_family`,
   `update_language_family`.
2. Dropped the V1 tables in dependency order: `ethnic_group_sources`,
   `ethnic_group_languages`, `ethnic_group_presence`, `ethnic_groups`, `languages` (v1),
   `sources`, `countries` (v1), `african_regions`.
3. Left the unused V1 enum values in `contribution_type` — Postgres has no `DROP VALUE`. They
   are inert.

Step 2 had a consequence nobody caught at the time. `DROP TABLE sources CASCADE` also dropped
`sources_title_key`, the UNIQUE constraint migration `003` had added so the AFRIK loaders could
upsert on `title`. Migration `009` recreated `sources` with `CREATE TABLE IF NOT EXISTS` and did
not restore it, and the ledger went on reporting `003` as applied. Every `upsertSource` failed
from then until migration `039` restored the constraint on 2026-08-25 — three months later.
That is why [`migration-state.md`](./migration-state.md) says to verify the object, not the
ledger row.

---

## How it was applied

Staging first, then production — the same ordering the two-step rule now formalises.

Pre-flight, all confirmed before applying:

- `git grep -nE "from\(['\"](ethnic_group|african_regions|sources)" src/ scripts/` returned no
  hits in routed code.
- No read replica or external system read the V1 tables.
- A `pg_dump` under 24 h old and restorable.
- The staging mirror had been reset from production within the previous 7 days.

Per environment: snapshot, `supabase db push`, then verification —

```sql
-- The V1 tables are gone (expected: 0 rows).
SELECT table_name FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN ('ethnic_group_sources','ethnic_group_languages',
                      'ethnic_group_presence','ethnic_groups',
                      'languages','sources','countries','african_regions');

-- The V2 enum values are present.
SELECT unnest(enum_range(NULL::contribution_type));
```

Followed by 30 minutes watching Sentry and the structured logs. No new errors appeared.

The migration was **not** reversible — it drops tables and their data. The rollback plan was a
restore from the pre-cutover dump, or PITR where available.

---

## Outcome and open loose end

The V1 tables are gone and the V2 enum values are present on the databases that were in use.
Verified again during the 2026-05 audit.

**Still open:** five orphaned V1 `update_ethnicity` rows remain in `contributions`. They point
at entities that no longer exist. Nothing reads them and nothing breaks, but they are the last
V1 residue in the data and should be deleted or archived deliberately rather than left to be
rediscovered.

`src/lib/api/openapi.ts` — the V1 OpenAPI spec, flagged for deletion in the original follow-up
list — is still present in the tree. Whether it is still reachable is worth a look before
removing it.
