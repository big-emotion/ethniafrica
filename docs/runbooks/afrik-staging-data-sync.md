# AFRIK Staging Data Synchronization

This runbook synchronizes the canonical AFRIK JSON sources into Supabase staging.
It does not authorize or perform a production rollout.

## Safety properties

- The command accepts only `--target=staging`.
- `NEXT_PUBLIC_SUPABASE_URL` must exactly match
  `AFRIK_STAGING_SUPABASE_URL` before the admin client is constructed.
- Preview is the default. Writes require the additional `--apply` flag.
- Synchronization is non-destructive: it upserts source records and relations but
  does not prune database-only rows.
- Existing `created_at` values are preserved. Successful upserts update
  `updated_at`.
- Data is processed in AFRIK hierarchy order: language families, peoples,
  countries, then people/country relations.
- Apply mode compares every source `content` object with staging again after the
  upserts. Residual drift makes the command fail.

## Prerequisites

1. Obtain explicit approval for a staging write.
2. Take a staging data snapshot that can restore the five AFRIK tables:
   `afrik_language_families`, `afrik_languages`, `afrik_peoples`,
   `afrik_countries`, and `afrik_people_countries`.
3. Configure staging-only credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<staging-project-ref>.supabase.co
   AFRIK_STAGING_SUPABASE_URL=https://<staging-project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>
   ```

4. Validate the canonical source corpus:

   ```bash
   npx tsx scripts/validateAfrikData.ts
   ```

## Preview

Preview reads staging and reports missing or stale source records without
upserting anything:

```bash
npx tsx scripts/migrateAfrikToDatabase.ts --target=staging
```

Review the reported drift before approving apply mode. In particular, confirm
that `FLG_AFROASIATIQUE`, `PPL_BETE`, and affected countries appear when their
staging content differs from the repository source.

## Apply to staging

Run only after the preview and snapshot have been reviewed:

```bash
npx tsx scripts/migrateAfrikToDatabase.ts --target=staging --apply
```

A successful run has no insertion errors and reports `hasDrift: false` in the
post-sync verification. If the command fails, retain
`dataset/source/afrik/logs/migration_errors_<date>.json` for diagnosis, then
restore the pre-sync snapshot if staging is not internally consistent.

## Verification evidence for ETNI-396

Evidence recorded on 2026-07-24:

- Drift, target-guard, and migration integration tests: 24 passed, 0 failed.
- `npx tsx scripts/validateAfrikData.ts`: 0 errors and 0 warnings.
- FR28 hard band `[95,105]%`: passed.
- FR28 strict target `[99,101]%`: passed with no deviations.
- `npx tsx scripts/ci/checkEditorialRules.ts`: 0 errors, 2 warnings. The warnings
  are missing endonyms for `PPL_MANDE_DU_SUD` and `PPL_KIRDI`.
- The repository audit dated 2026-07-21 still records 80 forbidden Tier-3 source
  entries across 73 fiches and no machine-readable `tier` field in the strict
  models. This synchronization does not modify claims or citations, so those
  source-tier deviations remain unchanged.
- No live staging or production database was read or written by the ETNI-396
  local automation. The commands above require a separately approved operator
  run.

## Production boundary

This script deliberately rejects `--target=production`. Production
synchronization requires a separate change, a fresh production backup, explicit
approval, staging evidence, and a dedicated rollout/rollback plan.
