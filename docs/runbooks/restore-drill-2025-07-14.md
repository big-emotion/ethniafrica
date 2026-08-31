# Restore drill — 2025-07-14

**Status: historical record of 2025-07-14. Not current procedure.**
For how to run a restore today, see [`restore-procedure.md`](./restore-procedure.md).

This is the only restore drill on record, and it predates most of the schema (the corpus it
validated was six checks wide; the validator now runs many more). It is kept because it is the
only measured evidence the RTO target is achievable, not because it describes the current
database.

**Operator:** platform operator
**Drill type:** quarterly restore drill — the first, and to date the last

---

## Summary

| Item                  | Value                                                |
| --------------------- | ---------------------------------------------------- |
| Backup source         | most recent daily logical backup (2025-07-13)        |
| Recovery method       | logical restore via `pg_restore`                     |
| Throwaway project     | `restore-drill-2025-07-14` (deleted after the drill) |
| Validation            | `scripts/validateAfrikData.ts`                       |
| Total wall-clock time | ~45 minutes                                          |
| RTO target / met      | ≤ 4 h / yes                                          |
| RPO target / met      | ≤ 24 h / yes                                         |

---

## Steps executed

### 1. Throwaway project created

```bash
supabase projects create "restore-drill-2025-07-14" \
  --region eu-central-1 \
  --db-password "<redacted>"
# Duration: ~3 minutes
```

> The region recorded here does not match the project that exists today
> (`shmrjtnfbqzceovroqjj` is in `eu-west-1`). Read the region from
> `supabase projects list` rather than from this record.

### 2. Backup restored

```bash
pg_restore --verbose --no-acl --no-owner \
  -d "postgresql://postgres:<redacted>@db.<throwaway-ref>.supabase.co:5432/postgres" \
  ./backup-2025-07-13.dump
# Duration: ~30 minutes
```

### 3. Validation

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<throwaway-ref>.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="<redacted>" \
npx tsx scripts/validateAfrikData.ts
```

Output as recorded on the day:

```
📈 RÉSUMÉ:
   ✅ Succès: 4
   ⚠️  Avertissements: 2
   ❌ Erreurs: 0

Exit code: 0
```

> Two caveats on that result, both known since. The script validates the **JSON corpus on
> disk**, not the restored database — so a green run was never proof the restore itself was
> good. And its `RÉSUMÉ` block undercounts: it prints only the legacy checks while running
> many more. The current runbook adds direct row-count and RLS checks against the restored
> database for exactly these reasons.

### 4. Cleanup

```bash
supabase projects delete "<throwaway-ref>"
# Duration: ~1 minute
```

---

## Timeline

| Step                      | Start         | End           | Duration    |
| ------------------------- | ------------- | ------------- | ----------- |
| Throwaway project created | 09:00 UTC     | 09:03 UTC     | 3 min       |
| Backup downloaded         | 09:03 UTC     | 09:08 UTC     | 5 min       |
| `pg_restore`              | 09:08 UTC     | 09:38 UTC     | 30 min      |
| Validation                | 09:38 UTC     | 09:44 UTC     | 6 min       |
| Cleanup                   | 09:44 UTC     | 09:45 UTC     | 1 min       |
| **Total**                 | **09:00 UTC** | **09:45 UTC** | **~45 min** |

---

## Issues encountered

None on the day. The drill completed well within the RTO target.

---

## What happened to the schedule

The record set the next drill for 2025-10-14 and said a reminder was automated via
`.github/workflows/backup-drill-reminder.yml`. **That workflow does not exist in the
repository** — it either never landed or was removed, and no drill has been recorded since.
The quarterly cadence has therefore not been kept. Restoring the cadence, with or without
automation, is an open action.
