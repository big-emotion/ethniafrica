# Corpus translation waves (ETNI-1880)

The English corpus is produced in bounded waves, never in one sweep. This file
is the ledger: one section per wave, recording what was authorised before any
paid call and what was actually produced after it. A wave that is not written
down here has not been approved.

ETNI-1880's first acceptance criterion is procedural rather than technical —
the record list, provider, model, concurrency and budget ceiling must exist in
writing _before_ the provider is invoked. The reason is that a translation
wave is the one step in this pipeline that spends money and that cannot be
reproduced byte-for-byte on a re-run, so an unrecorded wave cannot be audited
afterwards.

Mechanics, drift handling and the deferral form live in
`docs/runbooks/corpus-translation.md`. Classification, glossary and register
rules live in `.claude/skills/afrik-translator/`. Neither this file nor the
command touches Supabase or `SITE_LOCALE_MODE`.

## Baseline — 2026-09-07

Measured with `npm run check:translation-parity -- --all` at `ddbd0226`:

| Metric                      | Count |
| --------------------------- | ----- |
| Records scanned             | 1718  |
| English sidecars present    | 5     |
| Explicit deferrals          | 13    |
| Unaccounted parity findings | 1700  |
| People translated           | 0/776 |
| Countries translated        | 0/54  |

## Wave 1 — West African anchor set

**Status: awaiting authorisation. No paid call has been made.**

Ten records: four countries and the six peoples the corpus names as their
principal groups. The set is chosen so that the English quiz corpus gets a
closed cluster rather than scattered entities — `quizTranslationCorpus.ts`
admits an entity to a non-French bank only when its translation exists and has
not drifted, so a people whose country is untranslated yields questions that
cannot name their own subject. Every people here has its country in the same
wave, and the six span five linguistic families, which is what lets the sweep
build family- and country-keyed rounds instead of one flat pool.

Selection was measured, not assumed: each record fills every field
`quizFicheAdapter.ts` reads (12/12 for peoples, 6/6 for countries), so the
wave is the highest question-yield ten records available.

### Record list

| ID          | Kind    | Family / path   | Leaves  | Review-required |
| ----------- | ------- | --------------- | ------- | --------------- |
| PPL_HAUSA   | people  | FLG_TCHADIQUE   | 58      | 3               |
| PPL_YORUBA  | people  | FLG_BENOUECONGO | 55      | 3               |
| PPL_IGBO    | people  | FLG_BENOUECONGO | 42      | 3               |
| PPL_ASANTE  | people  | FLG_NIGERCONGO  | 53      | 3               |
| PPL_WOLOF   | people  | FLG_ATLANTIQUE  | 54      | 2               |
| PPL_MALINKE | people  | FLG_MANDE       | 65      | 3               |
| NGA         | country | pays/NGA.json   | 98      | 22              |
| GHA         | country | pays/GHA.json   | 73      | 15              |
| SEN         | country | pays/SEN.json   | 75      | 15              |
| MLI         | country | pays/MLI.json   | 90      | 19              |
| **Total**   | —       | —               | **663** | **88**          |

### Execution parameters

| Parameter         | Value                                             |
| ----------------- | ------------------------------------------------- |
| Command           | `npm run translate:record -- --id <ID> --lang en` |
| Provider          | `claudeCliProvider` (local `claude` CLI)          |
| Model             | `sonnet` (default)                                |
| Concurrency       | 3 (default)                                       |
| Budget per record | USD 0.75 (`--max-budget-usd 0.75`)                |
| Wave ceiling      | USD 5.00                                          |
| Estimated actual  | ~USD 1.10 (100,672 prompt tokens in, ~55k out)    |

The per-record ceiling is raised from the 0.50 default because the four
country records carry 73–98 leaves each; the estimate still leaves the wave
ceiling roughly four times the expected spend.

### Dry-run evidence

All ten dry-runs completed at `ddbd0226`, exit 0, `cost $0.0000`, no provider
call. Counts in the table above are the dry-run's own figures.

### Review-required inventory

88 paths need a named human reader before any provenance may become
`machine_reviewed` (ETNI-1878). They fall into four families:

- **Appellation judgement (17 paths, peoples).**
  `content.appellations.originOfExonyms`, `.whyProblematic`,
  `.contemporaryUsage` on each people. These carry the decolonial reading of
  why an exonym is contested; a translation that flattens the hedging changes
  the editorial position.
- **Proper names that must not be translated (32 paths).**
  `content.kingdoms[n].name` across the four countries. A polity name is an
  invariant, and the risk is the reverse of mistranslation — it is a name
  silently Anglicised.
- **Appellation remarks on major peoples (30 paths).**
  `content.majorPeoples[n].appellationRemarks` on the four countries.
- **Country identity fields (9 paths).** `nameOfficial`, `etymology`,
  `content.historicalNames.formerNames[n]`.

`etymology` and `formerNames` are the two the reviewer should read first: they
are the fields where a colonial-era name has to survive translation _with_ its
explanation, which is the rule `checkEditorialRules.ts` enforces on the French
side and which no gate checks on the English side.

### Post-execution record

Filled in after the wave runs. Left empty on purpose until then.

| Field                                 | Value |
| ------------------------------------- | ----- |
| Executed at                           | —     |
| Records translated / skipped / failed | —     |
| Actual provider cost                  | —     |
| Parity result for changed pairs       | —     |
| Review paths inspected                | —     |
