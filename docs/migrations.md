# Supabase migrations runbook

Apply migrations against the project's Supabase instance in numerical order.
Each entry below lists the schema changes and the story that drove them so
operators can correlate the migration with its rollout.

## How to apply

```bash
# Connect with the Supabase CLI linked to the target project.
supabase db push
```

Or copy the SQL of the file into the Supabase SQL editor and execute it once.

> All migrations in this repo are written to be **idempotent** — they use
> `IF NOT EXISTS` / `CREATE OR REPLACE` so they can be re-run safely.

## Migration log

### 013 — `flags.severity` & `flags.auto_generated`

- **File**: `supabase/migrations/013_flags_severity_auto.sql`
- **Story**: ETNI-177 / Story 0.20 / FR31 — Source-URL health → confidence
  recompute hook.
- **Changes**:
  - Adds nullable `severity TEXT CHECK (severity IN ('low','medium','high','critical'))`
    column to `flags`.
  - Adds `auto_generated BOOLEAN DEFAULT FALSE` column to `flags`.
  - Adds `idx_flags_flag_type` covering `flag_type`.
  - Adds partial index `idx_flags_auto_generated` for rows where
    `auto_generated = TRUE`.
- **Why**: the nightly `data-integrity` workflow opens public flags of type
  `unreachable_source` when a source URL has been broken for ≥ 7 consecutive
  days, and resolves them on recovery. The new columns let the recompute job
  (and consumers) distinguish auto-opened flags from human-curated ones and
  expose a severity level on the public fiche.
- **Rollback**: drop the two columns and the two indexes. The columns are
  nullable / default-valued, so dropping them is safe.
