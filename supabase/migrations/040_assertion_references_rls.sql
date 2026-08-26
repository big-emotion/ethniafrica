-- Migration 040 — Enable Row Level Security on assertion_references
--
-- Context: migration 031 created assertion_references but never enabled RLS,
-- no policy and no grants — the same defect migration 019 fixed for the AFRIK
-- tables, repeated four months later on a table nobody re-checked. Under
-- Supabase's default public-schema grants the table is therefore writable by
-- anyone holding the public anon key, which ships in the browser bundle: an
-- anonymous visitor can forge or delete the source link behind any assertion,
-- which is the one thing this corpus must never let happen.
--
-- Every other table in the normalized-sources chain is already covered —
-- sources and assertions got RLS in 017/023 — assertion_references was the
-- lone gap. `scripts/ci/checkRlsCoverage.ts` now replays the whole migration
-- set and fails on any table that never reaches an ENABLE ROW LEVEL SECURITY,
-- so the next occurrence is caught on the pull request instead of an audit.
--
-- Rollout is two-step, recette first then prod — the two Supabase projects are
-- both labelled "production" and drift when a migration is applied to only one.
-- All statements are idempotent (DROP POLICY IF EXISTS, ALTER TABLE ... ENABLE
-- RLS), so re-applying is a safe no-op.
--
-- Policy: public read (SELECT) only, matching sources and assertions — the
-- citation graph is intentionally public and carries no personal data. The
-- only writer today is linkReferenceToAssertion() in
-- src/api/v2/services/reference-library.ts, which goes through
-- createAdminClient() and so bypasses RLS on the service-role key. No write
-- policy is created: anon and authenticated roles must never write here.

-- ────────────────────────────────────────────────────────────────────────────
-- Enable RLS.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE assertion_references ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Public read policy. No write policy — service role is the only writer.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS assertion_references_read_public ON assertion_references;
CREATE POLICY        assertion_references_read_public ON assertion_references
  FOR SELECT USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- As anon key:
--   DELETE FROM assertion_references WHERE true;
--   -- expected: 0 rows affected (no DELETE policy exists)
--   INSERT INTO assertion_references (assertion_id, source_id, locator_type, locator_value)
--     VALUES (gen_random_uuid(), gen_random_uuid(), 'page', '1');
--   -- expected: ERROR: new row violates row-level security policy
--   SELECT count(*) FROM assertion_references;
--   -- expected: existing row count (read still works)
