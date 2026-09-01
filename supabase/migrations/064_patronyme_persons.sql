-- Migration 064 — the deferred join: afrik_patronyme_persons
--
-- Story: ETNI-1462 (Serve the name through the public API).
--
-- 053_name_table.sql deferred this join deliberately: "a join table to
-- persons... is left to whichever ticket lands once the persons table
-- exists, rather than inventing an FK-less table now." The persons table
-- landed in migration 057 (ARCH-018). This is that ticket: the public name
-- endpoint (GET /api/v2/patronymes/{id}) needs to aggregate a name's
-- bearers, and there is nowhere to read that relation from without it.
--
-- Follows the afrik_patronyme_peoples / afrik_patronyme_countries pattern
-- exactly (053): composite primary key, no unique constraint on
-- patronyme_id alone, so a name borne by many persons is never forced to
-- one — matching AC1 of the ticket (fifty bearers, batched).
--
-- Idempotent throughout (IF NOT EXISTS / DROP-then-CREATE), same discipline
-- as 053/057/061. Human-applied via `supabase db push` (AR45 runbook); this
-- migration is code-complete without production application, and this
-- automation never applies it to any database. Two-step rollout: recette
-- first, production second.
-- =============================================================================

CREATE TABLE IF NOT EXISTS afrik_patronyme_persons (
  patronyme_id TEXT NOT NULL REFERENCES afrik_patronymes(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  PRIMARY KEY (patronyme_id, person_id)
);

COMMENT ON TABLE afrik_patronyme_persons IS
  'Many-to-many relation between names (afrik_patronymes) and named persons '
  '(persons, ARCH-018) — the name''s bearers. Deferred by 053 until the '
  'persons table existed; closed here. ETNI-1462.';

CREATE INDEX IF NOT EXISTS idx_afrik_patronyme_persons_patronyme_id ON afrik_patronyme_persons(patronyme_id);
CREATE INDEX IF NOT EXISTS idx_afrik_patronyme_persons_person_id ON afrik_patronyme_persons(person_id);

-- =============================================================================
-- RLS — public read, service-role-only writes (pattern from 053/057)
-- =============================================================================
ALTER TABLE afrik_patronyme_persons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS afrik_patronyme_persons_read_public ON afrik_patronyme_persons;
CREATE POLICY afrik_patronyme_persons_read_public ON afrik_patronyme_persons
  FOR SELECT USING (true);

-- Deliberately no INSERT/UPDATE/DELETE policy for anon or authenticated —
-- writes flow only through the service-role loader, which bypasses RLS via
-- SUPABASE_SERVICE_ROLE_KEY (same posture as afrik_patronyme_peoples and
-- afrik_patronyme_countries).
