-- Migration 045 — Carry the country chapeau through to the database
--
-- Context: the country syntheses published on LinkedIn ("Anciens noms et
-- appellations / Groupes ethniques principaux / Héritage culturel / Langues
-- et identité") turned out to be a *view*, not editorial copy: every rubric
-- already maps onto a field of modele-pays.json, on all 54 fiches. One did
-- not — the chapeau, the two or three sentences a reader takes away if they
-- read nothing else. It was written into the corpus as a top-level `summary`
-- field.
--
-- Top-level is the reason this migration exists. `content` is JSONB and would
-- have carried a new key for free, but the chapeau belongs with the identity
-- fields it sits beside in the model — nameFr, nameOfficial, etymology — not
-- inside the evolving content blob. The cost is one column and one line in
-- upsertCountries; the alternative was a field whose home contradicts the
-- model that defines it.
--
-- Without this column the corpus load drops the chapeau silently:
-- scripts/migrateAfrikToDatabase.ts maps afrik_countries column by column, so
-- an unmapped field does not error, it simply never arrives. The 54 chapeaux
-- would have lived in git and nowhere else.
--
-- Deliberately NOT added to the search vector of migration 043. The chapeau
-- is derived from fields that vector already weighs — name_fr at A, etymology
-- at C — so indexing it too would count the same lexemes twice and quietly
-- re-flatten the ranking that 043 and 044 exist to sharpen.

ALTER TABLE afrik_countries
  ADD COLUMN IF NOT EXISTS summary text;

COMMENT ON COLUMN afrik_countries.summary IS
  'Chapeau of 2-3 sentences summarising the fiche. Asserts nothing the rest of the fiche does not already assert, and therefore carries no sources of its own.';
