# Runbook — V1 schema removal cutover

**Migration:** `supabase/migrations/007_remove_v1_add_v2_contribution_types.sql`
**Date drafted:** 2026-05-14
**Status:** ready to apply — staging then production
**Owner:** TBD (assign before running)
**Related issue:** AUDIT-5 (`#102`)

## Why

The V1 schema (regions, countries v1, ethnic*groups, ethnic_group*\*, languages v1, sources) has been removed from the application code (see `MEMORY.md` — "V1 → V2 Migration COMPLETED"). Migration 007 was committed but never applied to production. As a result:

- Production still carries 7 dead V1 tables and unused enum values.
- A fresh dev database (after `supabase db reset`) diverges from production.
- The new V2 contribution types (`new_people`, `update_people`, `new_country`, `update_country`, `new_language_family`, `update_language_family`) are present in code but not necessarily in the production enum, so any V2 contribution path can fail at `INSERT` time.

## What migration 007 does

1. Adds the V2 contribution-type enum values (`ADD VALUE IF NOT EXISTS`, idempotent).
2. Drops the V1 tables in dependency order:
   - `ethnic_group_sources`, `ethnic_group_languages`, `ethnic_group_presence`
   - `ethnic_groups`, `languages` (v1), `sources`
   - `countries` (v1), `african_regions`
3. Leaves the unused V1 enum values in `contribution_type` — Postgres does not support `DROP VALUE`. They are harmless.

## Pre-flight (must be true before applying)

- [ ] `git grep -nE "from\(['\"](ethnic_group|african_regions|sources)" src/ scripts/` returns **zero** hits in code that is still routed.
- [ ] No active read replica or external system reads the V1 tables.
- [ ] `pg_dump` of production succeeded within the last 24 h and is restorable.
- [ ] Staging mirror was reset from production within the last 7 days.

## Steps — staging first

1. Take a staging snapshot:

   ```bash
   supabase --project-ref <staging-ref> db dump --data-only --file staging-pre-007.sql
   ```

2. Apply migration 007:

   ```bash
   supabase --project-ref <staging-ref> db push
   ```

3. Smoke-test V2 contribution flows in staging:

   ```bash
   # POST a `new_country` contribution via /api/admin/contributions
   # PATCH it to "approve" via /api/admin/contributions/[id]
   # Confirm the row lands in afrik_countries
   ```

4. Watch Sentry + structured logs for 30 minutes. No new errors expected.

## Steps — production

1. Schedule a low-traffic window (currently: weekday 03:00-04:00 CET).
2. Snapshot:

   ```bash
   supabase --project-ref <prod-ref> db dump --file prod-pre-007.sql
   ```

3. Apply:

   ```bash
   supabase --project-ref <prod-ref> db push
   ```

4. Verify the 7 V1 tables are gone:

   ```sql
   SELECT table_name
     FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'ethnic_group_sources', 'ethnic_group_languages',
        'ethnic_group_presence', 'ethnic_groups',
        'languages', 'sources', 'countries', 'african_regions'
      );
   -- expected: 0 rows
   ```

5. Verify the V2 enum values:

   ```sql
   SELECT unnest(enum_range(NULL::contribution_type));
   -- expected to include new_people, update_people, new_country,
   -- update_country, new_language_family, update_language_family
   ```

## Rollback

The migration is **not** trivially reversible: it drops tables and their data. If a regression appears post-deploy:

1. Restore from `prod-pre-007.sql` (point-in-time recovery is preferred if available — Supabase Pro has PITR).
2. Revert any application code that depends on the V2-only schema (none expected as of 2026-05-14).
3. Re-enable monitoring and post-mortem.

## Follow-up (after migration applies cleanly)

- Delete `src/lib/api/openapi.ts` (V1 OpenAPI spec) — already flagged in audit issue `#122 P1.2`.
- Close `#102`.
- Update `MEMORY.md` "V1 → V2 Migration" section: replace "(not yet applied to prod)" with the date of production cutover.
