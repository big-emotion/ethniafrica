# AFRIK Data Synchronization

This runbook synchronizes the canonical AFRIK JSON sources into Supabase.

## Which environment am I actually writing to?

Read this before choosing a `--target`. The two name spaces do not line up, and
the mismatch has already cost an audit real time (ETNI-1199).

| What                                    | Value                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Supabase project `shmrjtnfbqzceovroqjj` | labelled **prod** in the Supabase dashboard                             |
| The application environment it backs    | **recette**                                                             |
| The constant naming it in this repo     | `AFRIK_PRODUCTION_SUPABASE_URL` (`scripts/lib/afrikMigrationTarget.ts`) |
| The flag that reaches it                | `--target=production`                                                   |

So `--target=production` writes to the project Supabase calls prod, which serves
the application's recette. Confirm the target with whoever owns the environment
before running with `--apply`; do not infer it from the flag name alone.

`--target=staging` requires `AFRIK_STAGING_SUPABASE_URL` to be set and to match
`NEXT_PUBLIC_SUPABASE_URL`. Where that variable is unset, the staging target
cannot be used at all.

## Prerequisites specific to the migrations / names / relations corpora

- **Node ≥ 22.** `@supabase/supabase-js` needs a native `WebSocket`; on Node 20
  the run dies with `Node.js detected but native WebSocket not found` before any
  write is attempted.
- **Migration `037_colonization_event_types.sql` must be applied**, or the
  `migration_event_type` enum rejects `imposed_name` and `resistance` with
  `22P02` and the corpus loads 4 of its 6 fiches. Probe it read-only with
  `GET /rest/v1/migration_events?select=id&event_type=eq.imposed_name`: `400` means
  the migration is missing, `200` means it is applied.
- **Migration `038_user_roles_rls_recursion_fix.sql` must be applied**, or every
  anonymous read of `migration_events` and `name_records` fails with `42P17`
  recursion, so a load cannot be verified through the UI even when the rows are
  present. Probe it by reading either table with the anon key.

Both are applied by a human via `supabase db push` per the AR45 runbook and are
never auto-applied.

## Safety properties

- The command accepts `--target=staging` or `--target=production`; the target is
  mandatory and is rejected if it is anything else.
- For `--target=production`, `NEXT_PUBLIC_SUPABASE_URL` must exactly match the
  locked `AFRIK_PRODUCTION_SUPABASE_URL` constant before the admin client is
  constructed.
- For `--target=staging`, `NEXT_PUBLIC_SUPABASE_URL` must exactly match
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

1. Obtain explicit approval for a write to the chosen environment.
2. Take a data snapshot that can restore the five AFRIK tables:
   `afrik_language_families`, `afrik_languages`, `afrik_peoples`,
   `afrik_countries`, and `afrik_people_countries` — plus `migration_events`,
   `migration_event_peoples`, `name_records` and `afrik_people_relations` when
   loading those corpora.
3. Configure credentials for that one environment:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   # staging target only — must equal NEXT_PUBLIC_SUPABASE_URL
   AFRIK_STAGING_SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```

4. Validate the canonical source corpus:

   ```bash
   npx tsx scripts/validateAfrikData.ts
   ```

## Preview

Preview reads the target and reports missing or stale source records without
upserting anything:

```bash
npx tsx scripts/migrateAfrikToDatabase.ts --target=<staging|production>
```

Review the reported drift before approving apply mode. In particular, confirm
that `FLG_AFROASIATIQUE`, `PPL_BETE`, and affected countries appear when their
target content differs from the repository source.

The preview summary also reports how many fiches parsed per corpus. Compare
those against the files on disk before applying — a parser rejection shows up
here as a count shortfall plus a `Failed to parse` line, and means the load
would silently under-fill:

```bash
ls dataset/source/afrik/migrations/*.json | wc -l   # expect 6
ls dataset/source/afrik/noms/*.json | wc -l         # expect 1
ls dataset/source/afrik/relations/*.json | wc -l    # expect 12
```

## Apply

Run only after the preview and snapshot have been reviewed:

```bash
npx tsx scripts/migrateAfrikToDatabase.ts --target=<staging|production> --apply
```

A successful run has no insertion errors and reports `hasDrift: false` in the
post-sync verification. If the command fails, retain
`dataset/source/afrik/logs/migration_errors_<date>.json` for diagnosis, then
restore the pre-sync snapshot if staging is not internally consistent.

## Verify the load

Read the row counts back and compare them against the files on disk. Any
shortfall means fiches were rejected during parsing or insertion — do not treat
the run as successful:

| Table                    | Expected rows |
| ------------------------ | ------------- |
| `migration_events`       | 6             |
| `name_records`           | 1             |
| `afrik_people_relations` | 12            |

A `HEAD` request with `Prefer: count=exact` reads a count without fetching rows:

```bash
curl -sI "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/migration_events?select=*" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | grep -i content-range
```

Then confirm idempotency: run the same `--apply` command a second time and read
the counts again. They must be unchanged — the loaders upsert on the source id
and never prune database-only rows.

Finally, load `/fr/migrations` and `/fr/noms` as an anonymous visitor. If they
render an empty state while the counts above are non-zero, the rows are present
but RLS is blocking the read — check migration `038` (see Prerequisites).

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
