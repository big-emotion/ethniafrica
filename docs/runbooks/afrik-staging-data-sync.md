# Runbook — AFRIK corpus synchronization

Loads the canonical AFRIK JSON fiches from `dataset/source/afrik/` into Supabase. The fiches in
git are the editorial source of truth; the database is a projection of them.

This runbook covers **data**. The schema those tables live in is a separate concern with its
own two-step rule — see [`migration-state.md`](./migration-state.md).

---

## Which environment am I actually writing to?

Read this before choosing a `--target`. The two name spaces do not line up, and the mismatch
has already cost an audit real time (ETNI-1199).

| What                                    | Value                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Supabase project `shmrjtnfbqzceovroqjj` | labelled **prod** in the Supabase dashboard                             |
| The application environment it backs    | **recette**                                                             |
| The constant naming it in this repo     | `AFRIK_PRODUCTION_SUPABASE_URL` (`scripts/lib/afrikMigrationTarget.ts`) |
| The flag that reaches it                | `--target=production`                                                   |

So `--target=production` writes to the project Supabase calls prod, which backs the
application's recette. Confirm the destination with whoever owns the environment before running
with `--apply`; do not infer it from the flag name.

`--target=staging` requires `AFRIK_STAGING_SUPABASE_URL` to be set and to equal
`NEXT_PUBLIC_SUPABASE_URL`. Where that variable is unset — which is the normal state on a dev
machine — the staging target cannot be used at all.

Renaming that constant so the flag names an environment rather than a label is an open
follow-up.

---

## Prerequisites

**Node ≥ 22.** `@supabase/supabase-js` needs a native `WebSocket`; on Node 20 the run dies with
`Node.js detected but native WebSocket not found` before any write — and before the target
guard runs, so a wrong `--target` will not even be caught. Note that `package.json` pins the
_application_ to Node `20.x`; the loaders are the exception.

**Migration `037_colonization_event_types.sql` must be applied**, or the `migration_event_type`
enum rejects `imposed_name` and `resistance` with `22P02` and the corpus loads 4 of its 6
fiches. Read-only probe — `400` means missing, `200` means applied:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/migration_events?select=id&event_type=eq.imposed_name" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

**Migration `038_user_roles_rls_recursion_fix.sql` must be applied**, or every anonymous read of
`migration_events` and `name_records` fails with `42P17` recursion. The rows load fine; you just
cannot verify them through the UI. Probe by reading either table **with the anon key** — the
service role bypasses RLS and proves nothing.

**Migration `039_restore_sources_title_unique.sql` must be applied**, or every `upsertSource`
fails with `no unique or exclusion constraint matching the ON CONFLICT specification`, which
aborts the enclosing fiche and leaves the corpus at zero rows.

All three are applied by a human, never auto-applied. Their current state per project is in
[`migration-state.md`](./migration-state.md).

---

## Safety properties

- The target is mandatory and must be exactly `staging` or `production`; anything else is
  rejected.
- For `--target=production`, `NEXT_PUBLIC_SUPABASE_URL` must exactly match the locked
  `AFRIK_PRODUCTION_SUPABASE_URL` constant before the admin client is constructed. For
  `--target=staging`, it must match `AFRIK_STAGING_SUPABASE_URL`.
- Preview is the default. Writes require the additional `--apply` flag.
- Non-destructive: it upserts source records and relations, and never prunes database-only rows.
- Existing `created_at` values are preserved; successful upserts update `updated_at`.
- Processed in AFRIK hierarchy order: language families, languages, peoples, countries, then
  people/country relations.
- Apply mode re-compares every source `content` object against the target after the upserts.
  Residual drift makes the command fail.

---

## Before running

1. Get explicit approval for a write to the chosen environment.
2. Take a snapshot that can restore the AFRIK tables: `afrik_language_families`,
   `afrik_languages`, `afrik_peoples`, `afrik_countries`, `afrik_people_countries` — plus
   `migration_events`, `migration_event_peoples`, `name_records` and `afrik_people_relations`
   when loading those corpora.
3. Configure credentials for that one environment:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   # staging target only — must equal NEXT_PUBLIC_SUPABASE_URL
   AFRIK_STAGING_SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```

4. Validate the canonical corpus:

   ```bash
   npx tsx scripts/validateAfrikData.ts
   npx tsx scripts/ci/checkEditorialRules.ts
   ```

   > `validateAfrikData.ts`'s printed `RÉSUMÉ` block undercounts — it reports only the legacy
   > checks while running many more, and persists only those to
   > `dataset/source/afrik/logs/validation_report.json`. Read the full output, and do not treat
   > `Avertissements: 0` as a clean corpus.

---

## Preview

Preview reads the target and reports missing or stale records without writing anything:

```bash
npx tsx scripts/migrateAfrikToDatabase.ts --target=<staging|production>
```

Review the reported drift before approving apply mode.

The preview summary also reports how many fiches parsed per corpus. **Compare those against the
files on disk before applying** — a parser rejection shows up here as a count shortfall plus a
`Failed to parse` line, and means the load would silently under-fill:

```bash
ls dataset/source/afrik/migrations/*.json | wc -l   # expect 6
ls dataset/source/afrik/relations/*.json | wc -l    # expect 12
ls dataset/source/afrik/noms/*.json | wc -l         # expect 1 — but see below
```

---

## Apply

Only after the preview and the snapshot have been reviewed:

```bash
npx tsx scripts/migrateAfrikToDatabase.ts --target=<staging|production> --apply
```

A successful run has no insertion errors and reports `hasDrift: false` in the post-sync
verification. On failure, keep `dataset/source/afrik/logs/migration_errors_<date>.json` for
diagnosis, then restore the pre-sync snapshot if the target is not internally consistent.

`.github/workflows/production-data-sync.yml` runs this same validate → preview → apply sequence
automatically after a successful Vercel _Production_ deployment of `main`, against the same
hard-coded project ref. If you are loading by hand shortly after a deploy, check whether that
workflow has already done it.

---

## Verify the load

Read the row counts back and compare them against the files on disk. Any shortfall means fiches
were rejected during parsing or insertion — do not treat the run as successful.

| Table                     | Expected rows |
| ------------------------- | ------------- |
| `migration_events`        | 6             |
| `migration_event_peoples` | 22            |
| `afrik_people_relations`  | 12            |
| `fiche_revisions`         | 18            |
| `assertions`              | 18            |
| `name_records`            | **0**         |

`name_records = 0` is correct, not a failure. The only file in
`dataset/source/afrik/noms/` is `PPL_YORUBA.json`, which carries `_meta.illustrative: true` and
is skipped by design. `/fr/noms` stays empty until someone authors a real dossier, and any
ticket expecting a non-zero name count is mis-specified.

A `HEAD` request with `Prefer: count=exact` reads a count without fetching rows:

```bash
curl -sI "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/migration_events?select=*" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | grep -i content-range
```

Then confirm idempotency: run the same `--apply` command a second time and read the counts
again. They must be unchanged — the loaders upsert on the source id and never prune.

Finally, load `/fr/migrations` as an anonymous visitor. If it renders an empty state while the
counts above are non-zero, the rows are present and RLS is blocking the read — check migration
`038`.

---

## Known limitation

`nameRecordJsonLoader` does not create a `fiche_revisions` row, unlike the migration and
relation loaders. This is deliberate rather than an oversight: its assertions key to the
_people_ fiche, and a name dossier is not a snapshot of that fiche, so which revision it should
attach to is an unresolved modelling decision. It will matter the first time a real name dossier
is authored.
