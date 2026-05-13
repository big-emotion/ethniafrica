# Supabase Restore Procedure

**RTO target:** ≤ 4 hours  
**RPO target:** ≤ 24 hours  
**Region:** eu-central-1

---

## Contacts & Escalation

| Role | Contact | When to escalate |
|------|---------|-----------------|
| Platform lead | @platform-lead (Slack #ops-alerts) | Immediately on P1 data loss |
| Supabase support | support@supabase.io / [support portal](https://supabase.com/support) | If CLI restore fails or PITR unavailable |
| On-call engineer | PagerDuty rotation | If platform lead unreachable > 15 min |

---

## Prerequisites

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Authenticate
supabase login

# Verify access to the project
supabase projects list
```

## Restore from PITR (Point-In-Time Recovery)

Use PITR when you need to recover to a specific timestamp within the last 7 days.

```bash
# 1. Identify the target recovery timestamp (ISO 8601 UTC)
RECOVERY_TIME="2025-07-14T03:00:00Z"   # adjust to desired point in time

# 2. Create a throwaway project for the restore drill
supabase projects create "restore-drill-$(date +%Y-%m-%d)" \
  --region eu-central-1 \
  --db-password "<secure-temp-password>"

# 3. Note the new project ref (output from step 2)
THROWAWAY_REF="<new-project-ref>"

# 4. Trigger PITR restore via Supabase dashboard or Management API
#    Dashboard: Project Settings → Database → Backups → Restore to point in time
#    API (requires service role key with management scope):
curl -X POST "https://api.supabase.com/v1/projects/${THROWAWAY_REF}/database/restore" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"recovery_time_target_unix\": $(date -d \"${RECOVERY_TIME}\" +%s)}"

# 5. Wait for restore to complete (check dashboard or poll API)
# Typical restore time: 15–60 minutes depending on database size

# 6. Update environment to point at throwaway project
export NEXT_PUBLIC_SUPABASE_URL="https://${THROWAWAY_REF}.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="<throwaway-anon-key>"
export SUPABASE_SERVICE_ROLE_KEY="<throwaway-service-role-key>"
```

## Restore from Daily Logical Backup

Use when PITR is unavailable or a full logical restore is needed.

```bash
# 1. Download the latest backup from Supabase dashboard
#    Project Settings → Database → Backups → Scheduled Backups → Download

# 2. Create a throwaway project
supabase projects create "restore-drill-$(date +%Y-%m-%d)" \
  --region eu-central-1 \
  --db-password "<secure-temp-password>"

THROWAWAY_REF="<new-project-ref>"
THROWAWAY_DB_URL="postgresql://postgres:<password>@db.${THROWAWAY_REF}.supabase.co:5432/postgres"

# 3. Restore the logical backup
pg_restore --verbose --no-acl --no-owner \
  -d "${THROWAWAY_DB_URL}" \
  ./backup-<date>.dump

# Alternative if backup is SQL format:
psql "${THROWAWAY_DB_URL}" < ./backup-<date>.sql
```

## Validate the Restored Database

```bash
# Run the AfrikData validation script against the restored project
NEXT_PUBLIC_SUPABASE_URL="https://${THROWAWAY_REF}.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="<throwaway-anon-key>" \
npx tsx scripts/validateAfrikData.ts 2>&1 | tee /tmp/restore-validation.log

echo "Exit code: $?"
```

## Post-Restore Checklist

- [ ] Validation script exits with code 0 (or only warnings)
- [ ] Row counts match production snapshot (spot check 3 tables)
- [ ] Application can authenticate via Supabase Auth on throwaway project
- [ ] Total wall-clock time ≤ 4 hours (RTO)
- [ ] Recovery point ≤ 24 hours before incident (RPO)

## Cleanup — Delete Throwaway Project

```bash
# Delete the throwaway project after drill/recovery validation
supabase projects delete "${THROWAWAY_REF}"

# Confirm deletion in dashboard: app.supabase.com → All projects
```

## Drill Schedule

Drills must be executed quarterly. Results are documented in:  
`docs/runbooks/restore-drill-<YYYY-MM-DD>.md`

A GitHub Actions workflow (`.github/workflows/backup-drill-reminder.yml`) opens a quarterly reminder issue tagged `area:operations` and `type:drill`.

---

## Timelines

| Phase | Target |
|-------|--------|
| Incident declared → restore started | ≤ 30 min |
| Restore started → validation complete | ≤ 3 h 30 min |
| **Total RTO** | **≤ 4 hours** |
| **RPO (max data loss)** | **≤ 24 hours** |
