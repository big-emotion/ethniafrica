# DBA Runbook: Bypassing the `revisions` Append-Only Invariant

**Table**: `revisions`
**Enforced by**: Migration `018_revisions_ddl.sql`, trigger `revisions_enforce_append_only`
**Story**: ETNI-45

---

## Background

The `revisions` table is append-only by design (AR14). Every row represents a published, frozen snapshot of an entity's state. Once a revision is published it must never be modified or deleted, because pinned-version URLs depend on the data being immutable.

The BEFORE UPDATE and BEFORE DELETE triggers on `revisions` reject all mutations unconditionally — including those issued by a superuser — unless the session-level GUC `app.bypass_revisions_append_only` is set to `'true'`. This GUC is the single supported bypass path. Every bypass is recorded in `audit_log`.

---

## When a Bypass Is Justified

A bypass is **only** justified in the following scenarios:

1. **Correcting a critical data corruption** introduced before the append-only trigger was installed (i.e., before migration 018).
2. **Purging personally identifiable information** under a verified legal obligation (GDPR erasure request, court order). The PII must be redacted in-place — the revision row itself must not be deleted unless the entire snapshot is PII.
3. **Emergency rollback** of a migration that accidentally populated `snapshot_jsonb` with garbage data, when a re-publish is not yet feasible.

**You must open a Jira ticket** (`ETNI` project) referencing this runbook before executing the bypass. The ticket is the audit trail that explains _why_ the bypass was necessary.

---

## Procedure

### Prerequisites

- You must hold a Supabase database role with the `SET` privilege on `app.bypass_revisions_append_only` (i.e., a superuser or a role explicitly granted this privilege by a superuser).
- You must have an open Jira ticket explaining the justification.

### Steps

```sql
-- 1. Open a transaction so the bypass window is as narrow as possible.
BEGIN;

-- 2. Enable the bypass for this session only (LOCAL = transaction-scoped).
--    This does NOT persist after COMMIT or ROLLBACK.
SET LOCAL app.bypass_revisions_append_only = 'true';

-- 3. Perform the remediation (UPDATE or DELETE).
--    The trigger will log a row to audit_log automatically.
UPDATE revisions
SET snapshot_jsonb = jsonb_set(snapshot_jsonb, '{content,pii_field}', 'null'::jsonb)
WHERE id = '<revision-uuid>';

-- 4. Verify the audit_log entry was created.
SELECT *
FROM audit_log
WHERE action = 'dba_revisions_append_only_bypass'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Commit only after confirming the audit entry is present.
COMMIT;
```

> **Warning**: If you use `SET` (without `LOCAL`) the GUC persists for the entire database session and will suppress the trigger for all subsequent statements, including from other connections sharing the same session (if using a connection pooler). Always use `SET LOCAL` inside a transaction.

### Post-procedure checklist

- [ ] Confirm the `audit_log` row exists (`action = 'dba_revisions_append_only_bypass'`).
- [ ] Add a comment on the Jira ticket with the `audit_log` row `id` and a summary of what was changed.
- [ ] If the correction affects a live pinned-version URL, coordinate with the editorial team to republish the revision through the normal moderation workflow (Epic 5).

---

## How the Trigger Works

The `revisions_enforce_append_only()` function:

1. Reads `current_setting('app.bypass_revisions_append_only', true)`.
2. If the value is `'true'`, inserts a row into `audit_log` (action `dba_revisions_append_only_bypass`) and allows the operation.
3. Otherwise, raises `SQLSTATE 23000` (restrict_violation) with a message directing the caller to this runbook.

The trigger fires for **both** UPDATE and DELETE operations via the `revisions_no_update` and `revisions_no_delete` triggers respectively.
