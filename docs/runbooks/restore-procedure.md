# Runbook — Supabase restore

**RTO target:** ≤ 4 hours
**RPO target:** ≤ 24 hours

Restores go to a **throwaway project**, never over a live one. You validate the restored copy
first, then decide whether to cut over. Restoring in place destroys the evidence you would need
if the restore itself turns out to be wrong.

Before you start, know which database you are recovering. Both Supabase projects label their
environment "production" — a Supabase project has exactly one environment and Supabase names it
that, so the label describes the project, not the application it serves.
`shmrjtnfbqzceovroqjj` backs recette; a second project backs production. Identity table:
[`migration-state.md`](./migration-state.md).

---

## Contacts and escalation

There is no on-call rotation and no PagerDuty on this project. Escalation is: the repository
owner, then Supabase support.

| Role             | Contact                                        | When                                                  |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------- |
| Repository owner | GitHub `@big-emotion/ethniafrica`              | immediately on suspected data loss                    |
| Supabase support | [support portal](https://supabase.com/support) | CLI restore fails, or PITR is unavailable on the plan |

PITR is a paid Supabase feature. Confirm it is enabled on the affected project before planning
a point-in-time recovery — if it is not, the logical-backup path below is the only option and
the achievable RPO is the age of the last scheduled backup.

---

## Prerequisites

```bash
npm install -g supabase
supabase login
supabase projects list        # confirm you can see the affected project
```

Create the throwaway project in the **same region as the project being restored**. Check it
first — the recette-backing project (`shmrjtnfbqzceovroqjj`) is in `eu-west-1`; do not assume
the other one matches.

```bash
supabase projects list        # read the region from this output
```

---

## Path A — point-in-time recovery

Use when you need a specific timestamp within the PITR retention window.

```bash
RECOVERY_TIME="2026-08-26T03:00:00Z"   # ISO 8601 UTC — the point you want back

supabase projects create "restore-$(date +%Y-%m-%d)" \
  --region <region-of-the-affected-project> \
  --db-password "<secure-temp-password>"

THROWAWAY_REF="<new-project-ref>"      # from the output above
```

Trigger the restore from the dashboard (Project Settings → Database → Backups → Restore to
point in time) or via the Management API:

```bash
curl -X POST "https://api.supabase.com/v1/projects/${THROWAWAY_REF}/database/restore" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"recovery_time_target_unix\": $(date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "${RECOVERY_TIME}" +%s)}"
```

> The `date` invocation above is BSD/macOS. On GNU/Linux use
> `date -d "${RECOVERY_TIME}" +%s`.

Restores typically take 15–60 minutes depending on database size.

---

## Path B — logical backup

Use when PITR is unavailable, or a full logical restore is what you want.

```bash
# 1. Download the latest scheduled backup:
#    Project Settings → Database → Backups → Scheduled Backups → Download

# 2. Throwaway project, same region as the affected one.
supabase projects create "restore-$(date +%Y-%m-%d)" \
  --region <region-of-the-affected-project> \
  --db-password "<secure-temp-password>"

THROWAWAY_REF="<new-project-ref>"
THROWAWAY_DB_URL="postgresql://postgres:<password>@db.${THROWAWAY_REF}.supabase.co:5432/postgres"

# 3. Restore.
pg_restore --verbose --no-acl --no-owner -d "${THROWAWAY_DB_URL}" ./backup-<date>.dump

# SQL-format backup instead:
psql "${THROWAWAY_DB_URL}" < ./backup-<date>.sql
```

---

## Validate the restored database

`scripts/validateAfrikData.ts` validates the **JSON corpus on disk**, not the database. It is a
useful signal that the repository and the restore describe the same corpus, but on its own it
does not prove the restore worked. Check the database directly as well.

```bash
npx tsx scripts/validateAfrikData.ts 2>&1 | tee /tmp/restore-validation.log
echo "Exit code: $?"
```

> Its printed summary undercounts: it reports the six legacy checks while running many more,
> and persists only those six to `dataset/source/afrik/logs/validation_report.json`. Read the
> full output, not the `RÉSUMÉ` block.

Then read the restored database itself. Row counts against the throwaway project, with the
service-role key of that throwaway project:

```bash
for t in afrik_language_families afrik_languages afrik_peoples afrik_countries \
         afrik_people_countries migration_events afrik_people_relations; do
  printf '%-28s ' "$t"
  curl -sI "https://${THROWAWAY_REF}.supabase.co/rest/v1/${t}?select=*" \
    -H "apikey: ${THROWAWAY_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${THROWAWAY_SERVICE_ROLE_KEY}" \
    -H "Prefer: count=exact" | grep -i content-range
done
```

Also confirm the migration ledger came back intact — a restore that loses it will make every
later migration look pending. Compare it against
[`migration-state.md`](./migration-state.md).

---

## Post-restore checklist

- [ ] Row counts match the pre-incident snapshot (spot-check at least three tables).
- [ ] The migration ledger matches the state table in [`migration-state.md`](./migration-state.md).
- [ ] An **anonymous** read succeeds on a public table — this is what proves RLS survived; the
      service-role key bypasses RLS and proves nothing.
- [ ] The application authenticates against the throwaway project.
- [ ] Wall-clock time within the 4 h RTO.
- [ ] Recovery point within 24 h of the incident (RPO).

---

## Cutover, if you are recovering for real

The throwaway project has different credentials from the one it replaces. Cutting over means
updating `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` in the Vercel project and redeploying — plus the AFRIK corpus
sync, which will otherwise keep writing to the old, damaged project:

- recovering the **recette** project also means editing `AFRIK_RECETTE_SUPABASE_URL` in
  `scripts/lib/afrikSyncTarget.ts`; that ref is checked in, so a throwaway project cannot be
  reached by `--target=recette` until it is changed;
- recovering the **production** project means repointing the `PRODUCTION_SUPABASE_URL` and
  `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` repository secrets, which is configuration — no code
  change needed. See [`afrik-data-sync.md`](./afrik-data-sync.md).

Prefer restoring _into_ the original project once the throwaway copy has proven the backup is
good. Cut over only when the original is unrecoverable.

---

## Cleanup

```bash
supabase projects delete "${THROWAWAY_REF}"
```

Confirm the deletion in the dashboard. A forgotten throwaway project holds a full copy of the
corpus and bills monthly.

---

## Drill schedule

Drills should run quarterly, each one recorded as `docs/runbooks/restore-drill-<YYYY-MM-DD>.md`.

**There is no automation for this.** An earlier version of this runbook claimed
`.github/workflows/backup-drill-reminder.yml` opened a quarterly reminder issue; that workflow
does not exist in the repository. Until someone adds it, the schedule is a manual commitment —
treat an absent drill record as an absent drill.

The only drill on record is [2025-07-14](./restore-drill-2025-07-14.md). Nothing since.

---

## Timelines

| Phase                                 | Target         |
| ------------------------------------- | -------------- |
| Incident declared → restore started   | ≤ 30 min       |
| Restore started → validation complete | ≤ 3 h 30 min   |
| **Total RTO**                         | **≤ 4 hours**  |
| **RPO (max data loss)**               | **≤ 24 hours** |
