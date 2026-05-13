# Supabase Backup Configuration

**Region:** eu-central-1  
**Last verified:** 2025-07-14  
**Screenshot:** `docs/infra-backup-screenshot-2025-07-14.png` — Supabase dashboard view of Project Settings → Database → Backups (captured 2025-07-14)

---

## Point-In-Time Recovery (PITR)

| Setting | Value |
|---------|-------|
| PITR enabled | ✅ Yes |
| Retention window | 7 days (minimum required) |
| Region | eu-central-1 |

PITR must be verified in the Supabase dashboard under:  
**Project Settings → Database → Backups → Point-in-Time Recovery**

## Daily Logical Backups

| Setting | Value |
|---------|-------|
| Daily backups enabled | ✅ Yes |
| Backup type | Logical (pg_dump) |
| Retention | 7 days |
| Schedule | 00:00 UTC daily |

Daily backups are visible in:  
**Project Settings → Database → Backups → Scheduled Backups**

## Compliance References

- AR21: Data durability — PITR ensures ≤ 24 h RPO
- AR37: Operational trustworthiness — documented and regularly tested backup/restore cycle

## How to Update This Document

1. Log in to [app.supabase.com](https://app.supabase.com)
2. Navigate to your project → **Settings → Database → Backups**
3. Verify PITR is enabled and retention ≥ 7 days
4. Take a timestamped screenshot and save as `docs/infra-backup-screenshot-<YYYY-MM-DD>.png`
5. Update the **Last verified** date above
6. Commit both files together
