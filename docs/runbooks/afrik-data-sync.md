# Runbook — AFRIK corpus synchronization

Loads the canonical AFRIK JSON fiches from `dataset/source/afrik/` into Supabase. The fiches in
git are the editorial source of truth; the database is a projection of them.

This runbook covers **data**. The schema those tables live in is a separate concern with its
own two-step rule — see [`migration-state.md`](./migration-state.md).

---

## Which environment am I writing to?

`--target` names the **application** environment, and the two possible values are `recette` and
`production` — the same vocabulary as the branches and the Vercel environments.

| Application environment | Supabase project                | Where the loader reads its URL                                              |
| ----------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| `recette`               | `shmrjtnfbqzceovroqjj`          | `AFRIK_RECETTE_SUPABASE_URL`, checked into `scripts/lib/afrikSyncTarget.ts` |
| `production`            | not recorded in this repository | the `AFRIK_PRODUCTION_SUPABASE_URL` environment variable — no default       |

Every Supabase project has exactly one environment and Supabase calls it "production", so that
label never identifies the application environment. `shmrjtnfbqzceovroqjj`'s dashboard says
"production" and the project backs **recette**. Read the environment off the `--target` value,
never off a Supabase dashboard.

This distinction used to be wrong in code, and the wrongness was enforced rather than caught:
`AFRIK_PRODUCTION_SUPABASE_URL` was a checked-in constant holding the recette ref, so
`--target=production` threw _unless_ it was pointed at recette (ETNI-1199). The production URL
is now configuration with no default, and configuring it as the recette project is refused.

`--target=staging` is retired: it throws an error naming `recette` as its replacement.
`AFRIK_STAGING_SUPABASE_URL` is read by nothing and can be deleted from any `.env.local` that
still carries it.

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

- The target is mandatory and must be exactly `recette` or `production`; anything else is
  rejected, and `staging` is rejected with a message naming its replacement.
- Every check below runs before the admin client is constructed, so a wrong target fails
  without opening a connection.
- For `--target=recette`, `NEXT_PUBLIC_SUPABASE_URL` must be the recette project.
- For `--target=production`, `AFRIK_PRODUCTION_SUPABASE_URL` must be set, must not be the
  recette project, and `NEXT_PUBLIC_SUPABASE_URL` must equal it. Pointing at recette while
  declaring production fails with an error that says so.
- Preview is the default. Writes require the additional `--apply` flag.
- Upsert-only by default: it upserts source records and relations. Rows the corpus no longer
  declares are reported on every run and deleted only with `--prune --apply`, and never above
  5 % of a table (`ORPHAN_SHARE_CAP`) — see [Retiring a people identifier](#retiring-a-people-identifier).
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

   For `--target=recette`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://shmrjtnfbqzceovroqjj.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<the recette project's service-role key>
   ```

   For `--target=production` — both URLs must name the production project, and be identical:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<production-project-ref>.supabase.co
   AFRIK_PRODUCTION_SUPABASE_URL=https://<production-project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<the production project's service-role key>
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
npx tsx --conditions=react-server scripts/migrateAfrikToDatabase.ts --target=<recette|production>
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
npx tsx --conditions=react-server scripts/migrateAfrikToDatabase.ts --target=<recette|production> --apply
```

A successful run has no insertion errors and reports `hasDrift: false` in the post-sync
verification. On failure, keep `dataset/source/afrik/logs/migration_errors_<date>.json` for
diagnosis, then restore the pre-sync snapshot if the target is not internally consistent.

`.github/workflows/production-data-sync.yml` runs this same validate → preview → apply sequence
automatically after a successful Vercel _Production_ deployment of `main`. If you are loading by
hand shortly after a deploy, check whether that workflow has already done it — see
[the automated production sync](#the-automated-production-sync) for the secrets it needs.

---

## The automated recette sync

`recette-data-sync.yml` loads the corpus into recette on every push to `recette` that touches
`dataset/source/afrik/**`, the loaders, or the sync script — and on manual dispatch. It reads
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the **`recette` GitHub
Environment** (the job pins `environment: recette`), not from plain repository secrets — the
`recette` environment must provide both.

Until it existed, **nothing loaded the corpus into recette**: the only two loader calls in the
repository were `--target=production`. A merge applied its migrations here and left the corpus
at whatever someone had last loaded by hand, which is the mechanism behind "I contributed and I
see nothing".

Three properties worth knowing:

- It validates the corpus against the strict models **before** loading, so a fiche that
  violates its model never reaches the database.
- It runs `check:migration-state` first and **refuses to load ahead of a pending migration**.
  `migrate-recette.yml` fires on the same push, so on a merge carrying both a migration and a
  fiche the two workflows are concurrent; this is what makes the ordering explicit rather than
  a race.
- It cannot reach production. `AFRIK_PRODUCTION_SUPABASE_URL` is left unset, and the loader
  resolves `--target=recette` against a checked-in project ref.

Without the credentials it **fails**, deliberately, rather than skipping: this workflow only
ever runs on a push to `recette` or a manual dispatch, never from a fork, so the credentials are
always readable, and an absent value means the environment is misconfigured. A skipped load is
indistinguishable from a successful one on the board — that indistinguishability is the defect
this workflow exists to close, so it is not reintroduced by treating a missing credential as
"skip".

### Cache invalidation: deliberately absent

`production-data-sync.yml` ends with a step that POSTs to `/api/admin/revalidate` for the tags
`afrik-language-families`, `afrik-peoples` and `afrik-countries`. `recette-data-sync.yml` has no
equivalent step, and that is a decision, not an oversight:

- Vercel no longer auto-deploys recette (`vercel.json`: `git.deploymentEnabled: false`); the
  recette preview is only rebuilt on demand, via the deploy hook in
  `deploy-preview-recette.yml`. A corpus load and a rebuild are two independent, manually
  triggered events, so there is no deploy step this sync could chain a revalidation off the way
  production does.
- Even granting a running recette instance, the AFRIK read services
  (`src/api/v2/services/{countryFacet,languagesFacet,languageFamilyAtlas,continentPeopleCounts}.ts`)
  cache with `unstable_cache(..., { revalidate: 3600 })` — time-based, with no `tags` option.
  Nothing in the codebase attaches the `afrik-language-families` / `afrik-peoples` /
  `afrik-countries` tags to a cache entry; only the revalidate route and
  `src/lib/cache/dataVersion.ts` reference those strings. Mirroring production's step onto
  recette would call `revalidateTag()` against tags no cache entry carries — it would not bust
  the caches that actually matter, so it would add a false sense of freshness rather than real
  invalidation.

The bound on staleness for recette is therefore the same one-hour `revalidate` window the
service layer already has everywhere, which is acceptable for a review environment that is not
serving continuous public traffic. Revisit this if the AFRIK service caches ever gain real
`tags`, or if recette starts auto-deploying again.

---

## The automated production sync

The workflow chains off the **OVH production deploy** (`workflow_run` on "Deploy Production
(OVH)"), runs `--target=production`, then POSTs a cache revalidation to
`https://ethniafrica.com`. It used to key on a Vercel _Production_ deployment of `main`;
production left Vercel, so `vercel[bot]` will never create such a deployment again and the
workflow would simply have stopped running, silently. Note that `workflow_run` only fires for a
workflow file that lives on the **default branch** — on `recette` alone it is inert.

It reads two repository secrets, **both belonging to the Supabase project that backs
production**:

| Secret                                 | Used as                                                        |
| -------------------------------------- | -------------------------------------------------------------- |
| `PRODUCTION_SUPABASE_URL`              | `NEXT_PUBLIC_SUPABASE_URL` and `AFRIK_PRODUCTION_SUPABASE_URL` |
| `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY`                                    |

They exist only in GitHub Actions; nothing local reads them under these names. They are
deliberately distinct from the `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
repository secrets, which are **recette's** and are what the rest of CI uses.

With either secret missing the job **fails** and names the one that is absent. It does not skip:
a skipped sync leaves the production corpus stale while the deploy reports success, which is
exactly the failure mode this workflow used to have.

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
| `name_records`            | ~3 727        |

This row used to read **0**, on the reasoning that the only file in
`dataset/source/afrik/noms/` was `PPL_YORUBA.json`, which carries `_meta.illustrative: true`
and is skipped by design. That stopped being true. `name_records` now has three feeders, and a
count near zero is a failure rather than the expected state:

| Feeder                                                 | Rows   |
| ------------------------------------------------------ | ------ |
| `nameRecordJsonLoader` — 10 real dossiers in `noms/`   | 17     |
| `patronymeJsonLoader` — one per spelling, `surname`    | 31     |
| `peopleAppellationLoader` — derived from people fiches | ~3 679 |

`PPL_YORUBA.json` is still illustrative and still skipped, so 10 of the 11 dossiers load.

Note that the 31 `surname` rows sit in a partition the listing excludes: both
`afrik_name_forms` and `afrik_name_type_counts` filter `where nr.entity_type = 'people'`, so
they are present in the table and invisible in `/fr/atlas/appellations` (ETNI-1821).

A `HEAD` request with `Prefer: count=exact` reads a count without fetching rows:

```bash
curl -sI "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/migration_events?select=*" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | grep -i content-range
```

Then confirm idempotency: run the same `--apply` command a second time and read the counts
again. They must be unchanged — the loaders upsert on the source id, and without `--prune`
nothing is deleted.

Finally, load `/fr/migrations` as an anonymous visitor. If it renders an empty state while the
counts above are non-zero, the rows are present and RLS is blocking the read — check migration
`038`.

---

## Retiring a people identifier

A merge or rename of a `PPL_*` id is decided in git, in
`dataset/source/afrik/_retired-identifiers.json`: the retired fiche is deleted, its successor
absorbs it, every inbound reference is repointed, and the fiche page redirects the old URL to
the successor's. `validateAfrikData.ts` (FR27 Retired identifiers) refuses a ledger whose retired
ids still have a fiche or whose successors do not. None of that touches a database, and the
automated syncs never pass `--prune`, so after the merge lands each target still serves the
retired rows until a human removes them — in two steps, recette first, then production.

### 1. Recette, after the merge to `recette`

`recette-data-sync.yml` has already upserted the keepers and any renamed ids as new rows.
Preview the orphans first, and read the whole list: the share is measured against the rows in
the database, and recette has carried orphans of its own before (14 for seven months), so the
preview shows those too. Every row named must be one you expected to lose.

```bash
npx tsx --conditions=react-server scripts/migrateAfrikToDatabase.ts --target=recette --prune
npx tsx --conditions=react-server scripts/migrateAfrikToDatabase.ts --target=recette --prune --apply
```

A refusal (`Corpus orphan prune refused`) is a red run on purpose: the orphan share exceeds
`ORPHAN_SHARE_CAP` and the corpus load is likelier broken than the deletions real. Do not raise
the cap; find out why the corpus came back short.

The prune deletes from `afrik_peoples`, and the foreign keys cascade to
`afrik_people_countries`, `afrik_people_languages`, `afrik_patronyme_peoples` and the
person↔people link. `afrik_people_relations` and `migration_event_peoples` restrict instead:
a retired id still named there fails the delete, which is the signal that a relation or a
migration was not repointed in git.

### 2. The rows no foreign key reaches

Seven tables key a `TEXT entity_id` to a people with no constraint, so their rows outlive the
prune: `assertions`, `fiche_revisions`, `name_records`, `quiz_questions`, `flags`, `afrik_media`
and `oral_narratives`. The public readers join `afrik_peoples`, so nothing stale is served, but
the rows are dead weight and their counts drift the audits. Build the id list from the ledger
and run this against the same target, in the SQL editor for recette and through the SSH tunnel
`deploy-production.yml` uses for production (see `docs/runbooks/ovh-production-deploy.md`):

```bash
jq -r '[.[] | select(.decision != "kept-distinct") | .retiredId] | map("('" + . + "')") | join(", ")' \
  dataset/source/afrik/_retired-identifiers.json
```

```sql
-- Paste the list the jq command printed in place of the VALUES rows.
WITH retired(entity_id) AS (VALUES ('PPL_EXAMPLE_A'), ('PPL_EXAMPLE_B'))
, revoked AS (
  UPDATE quiz_questions q SET revoked_at = now(), revoked_reason = 'people id retired'
  FROM retired r WHERE q.entity_type = 'people' AND q.entity_id = r.entity_id AND q.revoked_at IS NULL
  RETURNING q.id
)
, d1 AS (DELETE FROM assertions a       USING retired r WHERE a.entity_type = 'people' AND a.entity_id = r.entity_id RETURNING 1)
, d2 AS (DELETE FROM fiche_revisions f  USING retired r WHERE f.entity_type = 'people' AND f.entity_id = r.entity_id RETURNING 1)
, d3 AS (DELETE FROM name_records n     USING retired r WHERE n.entity_type = 'people' AND n.entity_id = r.entity_id RETURNING 1)
, d4 AS (DELETE FROM flags fl           USING retired r WHERE fl.entity_type = 'people' AND fl.entity_id = r.entity_id RETURNING 1)
, d5 AS (DELETE FROM afrik_media m      USING retired r WHERE m.entity_type = 'people' AND m.entity_id = r.entity_id RETURNING 1)
, d6 AS (DELETE FROM oral_narratives o  USING retired r WHERE o.entity_type = 'people' AND o.entity_id = r.entity_id RETURNING 1)
SELECT (SELECT count(*) FROM revoked) AS quiz_revoked,
       (SELECT count(*) FROM d1) AS assertions,
       (SELECT count(*) FROM d2) AS fiche_revisions,
       (SELECT count(*) FROM d3) AS name_records,
       (SELECT count(*) FROM d4) AS flags,
       (SELECT count(*) FROM d5) AS afrik_media,
       (SELECT count(*) FROM d6) AS oral_narratives;
```

Quiz questions are revoked rather than deleted because the table is revocable by design and
`quiz_stats` counts revocations; a flag raised against a retired fiche is closed with its fiche.

### 3. Production, after the Release

`production-data-sync.yml` chains off the deploy and upserts, never prunes. Once it has run,
repeat both steps with `--target=production`. The loader reads the target from
`AFRIK_PRODUCTION_SUPABASE_URL`, which has no default; export it and the matching service-role
key from the self-hosted stack before running, and check the preview names the same ids you
pruned from recette:

```bash
export AFRIK_PRODUCTION_SUPABASE_URL=https://supabase.ethniafrica.com
export NEXT_PUBLIC_SUPABASE_URL="$AFRIK_PRODUCTION_SUPABASE_URL"
export SUPABASE_SERVICE_ROLE_KEY=<production service-role key>
npx tsx --conditions=react-server scripts/migrateAfrikToDatabase.ts --target=production --prune
npx tsx --conditions=react-server scripts/migrateAfrikToDatabase.ts --target=production --prune --apply
```

Then the SQL above, through the tunnel. Forgetting this step leaves the retired rows served by
`/api/v2/peoples/{id}` and listed in the sitemap while the pages redirect elsewhere.

---

## Known limitation

`nameRecordJsonLoader` does not create a `fiche_revisions` row, unlike the migration and
relation loaders. This is deliberate rather than an oversight: its assertions key to the
_people_ fiche, and a name dossier is not a snapshot of that fiche, so which revision it should
attach to is an unresolved modelling decision. It will matter the first time a real name dossier
is authored.
