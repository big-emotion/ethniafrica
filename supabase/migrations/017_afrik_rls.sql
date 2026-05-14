-- Migration 017 — Enable Row Level Security on AFRIK tables
--
-- Context: migration 006 created the 5 AFRIK tables but never enabled RLS,
-- leaving them open to INSERT/UPDATE/DELETE from anyone holding the public
-- anon key (which ships in the browser bundle). All other tables in the
-- schema (V1 entities, module-zero fabric, api_keys, user_roles) had RLS;
-- AFRIK was the outlier.
--
-- Status (2026-05-14): equivalent statements were already applied to both
-- ethniafrica (prod) and ethniafrica-staging out-of-band, under the name
-- `afrik_enable_rls_public_read`. Verified: RLS enabled on all 5 tables,
-- 1 SELECT policy each. This file is the canonical version-controlled
-- record. All statements are idempotent (DROP POLICY IF EXISTS, ALTER
-- TABLE ... ENABLE RLS), so re-applying is a safe no-op.
--
-- Policy: public read (SELECT) only. Writes are performed exclusively by
-- the service-role key (which bypasses RLS) via:
--   - src/lib/afrik/loaders/*  (server-only data loaders)
--   - src/app/api/admin/contributions/[id]/route.ts  (admin merge step)
--
-- Anon callers can still SELECT every row (the data is intentionally public),
-- but cannot INSERT/UPDATE/DELETE.

-- ────────────────────────────────────────────────────────────────────────────
-- Enable RLS on each AFRIK table.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE afrik_countries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE afrik_language_families  ENABLE ROW LEVEL SECURITY;
ALTER TABLE afrik_languages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE afrik_peoples            ENABLE ROW LEVEL SECURITY;
ALTER TABLE afrik_people_countries   ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Public read policies. No write policies — service role is the only writer.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS afrik_countries_read_public          ON afrik_countries;
CREATE POLICY        afrik_countries_read_public          ON afrik_countries
  FOR SELECT USING (true);

DROP POLICY IF EXISTS afrik_language_families_read_public  ON afrik_language_families;
CREATE POLICY        afrik_language_families_read_public  ON afrik_language_families
  FOR SELECT USING (true);

DROP POLICY IF EXISTS afrik_languages_read_public          ON afrik_languages;
CREATE POLICY        afrik_languages_read_public          ON afrik_languages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS afrik_peoples_read_public            ON afrik_peoples;
CREATE POLICY        afrik_peoples_read_public            ON afrik_peoples
  FOR SELECT USING (true);

DROP POLICY IF EXISTS afrik_people_countries_read_public   ON afrik_people_countries;
CREATE POLICY        afrik_people_countries_read_public   ON afrik_people_countries
  FOR SELECT USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────────────────────
-- As anon key:
--   INSERT INTO afrik_countries (id, iso3, name_fr) VALUES ('x', 'XXX', 'X');
--   -- expected: ERROR: new row violates row-level security policy
--   SELECT count(*) FROM afrik_countries;
--   -- expected: existing row count (read still works)
