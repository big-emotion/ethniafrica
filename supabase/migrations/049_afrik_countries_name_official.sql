-- Migration 049 — Give the country protocol name a column to land in
--
-- Context: every country fiche in the corpus carries two names. `nameFr` is
-- the name of ordinary use ("Afrique du Sud"); `nameOfficial` is the protocol
-- name, the one a state signs treaties under, and it holds the local-language
-- form beside the French ("République d'Afrique du Sud (Republic of South
-- Africa)"). The two are the head of a country fiche: the h1 and the line
-- under it.
--
-- The corpus has always held both, on all 54 fiches, and FR33 in
-- validateAfrikData.ts *fails the build* when `nameFr` merely repeats
-- `nameOfficial`. But migration 006 created five columns and `name_official`
-- was not one of them, so the loader had nowhere to write it and dropped it
-- silently — an unmapped field does not error, it simply never arrives. The
-- detail mapper then fell back to `nameFr`, and the h1 resolves to the same
-- French common name through Intl.DisplayNames. Result: all 54 fiches printed
-- their name twice, while a CI gate stood guard over a distinction the
-- database could not represent.
--
-- Top-level rather than a key in `content`, for the same reason as the
-- chapeau in 045: this is identity, read on every render of the head, not a
-- rubric of the document.
--
-- Nullable on purpose. The column is empty until the corpus is reloaded
-- (`scripts/migrateAfrikToDatabase.ts`), and the fiche head reads an absent
-- official name as "say nothing" rather than as an error — which is also what
-- it must do should a future fiche legitimately have no protocol name.

ALTER TABLE afrik_countries
  ADD COLUMN IF NOT EXISTS name_official TEXT;

COMMENT ON COLUMN afrik_countries.name_official IS
  'Protocol name of the state, French form with the local-language form in parentheses. Distinct from name_fr, the name of ordinary use; FR33 fails the build if a fiche makes them identical.';
