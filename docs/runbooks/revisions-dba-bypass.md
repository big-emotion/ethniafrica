# Runbook — bypassing the `revisions` append-only invariant

**Table:** `revisions`
**Enforced by:** `supabase/migrations/021_revisions_ddl.sql` — function
`revisions_enforce_append_only()`, triggers `revisions_no_update` and `revisions_no_delete`
**Story:** ETNI-45

---

## Background

`revisions` is append-only by design (AR14). Every row is a published, frozen snapshot of an
entity's state. Once a revision is published it must never be modified or deleted, because
pinned-version URLs depend on the data being immutable — a reader following a pinned link must
see what the link promised.

The BEFORE UPDATE and BEFORE DELETE triggers reject every mutation unconditionally, **including
a superuser's**, unless the session GUC `app.bypass_revisions_append_only` is set to `'true'`.
That GUC is the single supported bypass path, and every bypass writes a row to `audit_log`.

---

## When a bypass is justified

Only these three:

1. **Correcting critical data corruption** introduced before the append-only trigger was
   installed — that is, before migration `021`.
2. **Purging personally identifiable information** under a verified legal obligation (GDPR
   erasure request, court order). Redact the PII in place; do not delete the revision row
   unless the entire snapshot is PII.
3. **Emergency rollback** of a migration that populated `snapshot_jsonb` with garbage, when a
   re-publish is not yet feasible.

**Open a Jira ticket in `ETNI` referencing this runbook before executing the bypass.** The
ticket is the audit trail that explains _why_ — the `audit_log` row only records _that_.

---

## Prerequisites

- A Supabase database role with the `SET` privilege on `app.bypass_revisions_append_only` — a
  superuser, or a role a superuser has explicitly granted it.
- An open Jira ticket with the justification.

---

## Procedure

```sql
-- 1. Open a transaction so the bypass window is as narrow as possible.
BEGIN;

-- 2. Enable the bypass for this transaction only.
SET LOCAL app.bypass_revisions_append_only = 'true';

-- 3. Perform the remediation. The trigger logs to audit_log automatically.
UPDATE revisions
   SET snapshot_jsonb = jsonb_set(snapshot_jsonb, '{content,pii_field}', 'null'::jsonb)
 WHERE id = '<revision-uuid>';

-- 4. Verify the audit_log entry exists.
SELECT *
  FROM audit_log
 WHERE action = 'dba_revisions_append_only_bypass'
 ORDER BY created_at DESC
 LIMIT 5;

-- 5. Commit only after confirming the audit entry is present.
COMMIT;
```

> **Use `SET LOCAL`, never bare `SET`.** A bare `SET` persists for the whole database session
> and suppresses the trigger for every subsequent statement — and behind a connection pooler,
> that session is shared, so the invariant would be silently off for other callers too.

### Post-procedure checklist

- [ ] The `audit_log` row exists with `action = 'dba_revisions_append_only_bypass'`.
- [ ] The Jira ticket carries a comment with that row's `id` and a summary of what changed.
- [ ] If the correction affects a live pinned-version URL, coordinate with editorial to
      republish the revision through the normal moderation workflow.

---

## How the trigger works

`revisions_enforce_append_only()`:

1. Reads `current_setting('app.bypass_revisions_append_only', true)`.
2. If the value is `'true'`, inserts an `audit_log` row (action
   `dba_revisions_append_only_bypass`, with `override_reason` recorded in its metadata) and
   allows the operation.
3. Otherwise raises `SQLSTATE 23000` (`restrict_violation`) with a message pointing back here.

Both `revisions_no_update` and `revisions_no_delete` call it, so UPDATE and DELETE are covered
by the same code path — and so is the audit logging.
