-- 028_language_tree_support.sql
-- 006 already indexes afrik_languages(family_id), afrik_peoples(language_family_id),
-- and name_main standalone — no FK index is missing. The single addition is the
-- composite serving branch pagination's ORDER BY name_main within one family.
-- Speculative at 924 rows (the planner may ignore it); added as a cheap, idempotent
-- forward bet on NFR16's 10x scale.
--
-- Idempotent; applied manually by a human via `supabase db push` per the AR45
-- runbook — never auto-applied.
CREATE INDEX IF NOT EXISTS idx_afrik_peoples_family_name
  ON afrik_peoples(language_family_id, name_main);
