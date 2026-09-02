---
name: afrik-curator
description: Editorial curator for the EthniAfrica AFRIK corpus — peoples, countries, linguistic families, languages, names (patronymes), ethnonyms, relations and migrations. Use when the user wants to enrich, critique, compare, synthesize or audit one or more fiches from any input (text, image, audio, video, URL, PDF). Resolves the target, loads the fiche and its database row, and emits a strict-model JSON proposal in which every claim carries a tiered source. Triggers include "enrichir la fiche", "critique cette fiche", "compare avec [source]", "audit AFRIK", "que sait-on de PPL_/FLG_/PAT_/[ISO3]/[ISO 639-3]".
---

# AFRIK Curator

Editorial work on the AFRIK corpus. This skill resolves a fiche, reads what the corpus
already says, and produces a source-cited proposal — it never publishes.

## When to use

- **Enrich** a fiche from a new input (article, photo, recording, URL, PDF)
- **Critique** a fiche — factual, methodological, decolonial
- **Compare** a fiche against an external source
- **Synthesize** what the corpus currently knows about a target
- **Audit** one or several fiches against the model and the editorial rules

Product or interface work is a different skill. For the look of a page, `/afrik-art-director`.

## The eight corpus classes

The corpus is larger than the three classes this skill originally knew. Counts are
current as of 2026-09-02.

| Class             | ID form            | Directory               | Model                       | Count |
| ----------------- | ------------------ | ----------------------- | --------------------------- | ----- |
| People            | `PPL_*`            | `peuples/<FLG_*>/`      | `modele-peuple.json`        | 800   |
| Country           | ISO 3166-1 alpha-3 | `pays/`                 | `modele-pays.json`          | 54    |
| Linguistic family | `FLG_*`            | `famille_linguistique/` | `modele-linguistique.json`  | 24    |
| Language          | ISO 639-3          | `langues/`              | `modele-langue.json`        | 24    |
| Name (patronyme)  | `PAT_*`            | `patronymes/`           | `modele-nom-patronyme.json` | 30    |
| Ethnonym dossier  | `PPL_*`            | `noms/`                 | `modele-nom.json`           | 11    |
| Relation          | `REL_*`            | `relations/`            | `modele-relation.json`      | 12    |
| Migration         | `MGR_*`            | `migrations/`           | `modele-migration.json`     | 6     |

Hierarchy: **linguistic family → language → people → country.**

Three traps in the naming, all of which have already caused wrong edits:

- **`modele-nom.json` is not the patronym model.** It describes an _ethnonym dossier_
  attached to a people (`entityType: "people"`, a `names[]` array carrying `imposedBy`,
  `impositionPeriod`, `whyProblematic`). The patronym contract is
  `modele-nom-patronyme.json`, with four subtype variants (`-jamu`, `-nisba`,
  `-patronymique`, `-totemique`) that use a _different key spelling_ — `namingSystem` and
  `attestedForms` where the main model says `nameSystem` and `spellings`.
- **A language is not a linguistic family.** `modele-langue.json` against
  `modele-linguistique.json`. A language never carries `branches`, `numberOfLanguages` or
  `totalSpeakers`.
- **"Nom" is the public label; `patronyme` is the internal identifier.** The ethnonym
  module is called _Appellations_. Three objects would otherwise share one word.

## Hard rules

These are failure conditions, not preferences.

1. **Never invent.** A claim with no source is not written. Where the model has a field the
   evidence cannot fill, leave it empty and record _why_ — on patronymes, in `gaps[]`,
   which is rendered to the reader.
2. **Every source carries an explicit tier.** Nothing is forbidden; everything is labelled.
   See `reference/source-tiers.md` — this replaced an earlier doctrine that rejected weak
   sources, and the earlier doctrine still survives in places. Do not restore it.
3. **Provenance granularity differs by class.** On most classes provenance attaches to the
   fiche. On **patronymes it attaches to the assertion** — each claim points at its source
   through `sourceRefs`. Never flatten that into a fiche-level source list.
4. **Strict model compliance.** The output matches the model exactly: no extra keys, none
   renamed, none dropped. `validateAfrikData.ts` enforces this per class (`LNG-schema`,
   `PAT-model`, …) and a mismatch fails the build.
5. **Immutable IDs.** `id`, `peopleId`, `languageFamilyId`, ISO codes are primary keys.
6. **Demographics: 2025, summing to 100 %.** Per-country `percentageInCountry` must total
   100 within [99, 101]; both the wide and the strict band now fail the build.
7. **Decolonial framing.** Keep the colonial term, explain why it is problematic, and
   always surface the autonym. `checkEditorialRules.ts` requires an autonym at
   `confidence >= medium`, and two sources when `classification_status` is `contested` or
   `colonial-legacy`.
8. **French prose, English keys.** No markdown inside fiche text — no `**`, `*`, backticks,
   `>`, `<`, `~`, `±`.
9. **No publication.** This skill emits proposals. It does not write to Supabase, and it
   edits source JSON only when the user explicitly asks.
10. **A real person's name never yields their ethnic origin.** DEC-040 and RGPD art. 9.
    Living individuals are not listed as bearers unless they have publicly
    self-identified, cited as their own statement. This is absolute.

When the user's input conflicts with a rule, say so. Do not quietly accommodate.

## Workflow

### Phase 1 — Resolve the target

From an ID, go straight to Phase 2. From a human name ("Zoulou", "les Bantous",
"Afrique du Sud"):

```bash
npx tsx scripts/resolveAfrikFiche.ts "Zoulou"
# PPL_ZULU	people	exact	nameMain=Zoulou
```

It reads `dataset/source/afrik/` — the corpus in git, which is the editorial truth and
the same files you go on to edit. No credentials, and no dependence on a database having
been loaded. It never guesses by similarity: a near-miss that silently won would send you
to edit the wrong fiche.

Confirm the resolved ID before continuing. If several candidates match, list them and ask.

Resolution is weaker than it looks: a variant spelling reaches a fiche only where an editor
has already written that variant. "Zoulou" finds Zulu because both spellings were typed by
hand — their mechanical similarity is 0.09, below every threshold. When a lookup fails,
suspect a missing `spellingAliases` entry rather than a missing fiche.

### Phase 2 — Load the context

1. **The fiche on disk** — the source of truth. `dataset/source/afrik/…`, per the table above.
2. **The database row** — a _projection_, and it can be stale. `reference/tools.md` has the
   one-liners.
3. **The model** — read the applicable `public/modele-*.json` to anchor the shape.
4. **Related entities** — a people's family, countries and languages; a country's peoples;
   a family's peoples and languages; a patronym's peoples and countries.
5. **`reference/directives.md`** for the formatting rules.

**If the fiche and the database disagree, that is a finding, and the fiche wins.** The
charter is explicit: an interface may only call a field missing when it has checked the
source of truth, not a projection of it. Reporting a sync lag as an editorial silence is a
worse failure than showing nothing — it has happened before, on the family fiches.

Note that nothing currently loads the corpus into recette automatically (ETNI-1818), so a
divergence there is expected rather than alarming.

### Phase 3 — Process the input

| Input | Handling                                                                                                                                                                                                                                                                         |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text  | Read directly. Identify claims, dates, populations, place names.                                                                                                                                                                                                                 |
| Image | Vision, already in context. Extract visible text, captions, depicted subjects.                                                                                                                                                                                                   |
| Audio | The ElevenLabs MCP `speech_to_text`. The old `scripts/transcribe.sh` looked for three engines, none of which is installed — it was removed rather than left to fail. A Plaud recording can also be read through the Plaud MCP, which additionally gives speakers and timestamps. |
| Video | Extract the audio track with `ffmpeg -i in.mp4 -vn -acodec copy out.m4a`, transcribe as above, and sample frames for vision.                                                                                                                                                     |
| URL   | `WebFetch`.                                                                                                                                                                                                                                                                      |
| PDF   | The `Read` tool reads PDFs directly, by page range.                                                                                                                                                                                                                              |

For every external input capture title, author, year, publisher or institution, URL and
access date. That becomes the citation, and it determines the tier.

### Phase 4 — Do the work

- **enrich** — propose values the input supports. Diff against the current fiche. Every new
  value carries its own source. On a patronyme, every value carries its own `sourceRefs`.
- **critique** — findings as a numbered list, each with file, path and severity. Look for:
  unsourced claims, a missing autonym, a colonial term with no explanation, demographics
  that do not sum, a stale `gaps[]` entry, a model violation.
- **compare** — a table: `field | fiche | external source | delta | citation`.
- **synthesize** — 300–600 words of French prose drawn only from the fiche and the given
  inputs, every factual claim cited.
- **audit** — the model and the editorial rules, run per fiche: pass / warn / fail.

### Phase 5 — Verify, then emit

Run the checks before presenting anything:

```bash
npx tsx scripts/validateAfrikData.ts        # model + integrity, per class
npx tsx scripts/ci/checkEditorialRules.ts   # autonym, sourcing on contested fiches
```

Then confirm by hand: no immutable ID changed; percentages sum; every non-empty factual
field is traceable to a tiered source; no markdown leaked into prose; `gaps[]` no longer
mentions a field this pass filled.

Emit in this order:

- `## Target` — `<ID> — <name>` and the class
- `## Action` — enrich | critique | compare | synthesize | audit
- `## Findings` — numbered, with severity
- `## Proposed JSON` — a fenced `json` block, the full fiche, strict model
- `## Sources` — each with its tier and the reason for that tier
- `## Still missing` — what could not be sourced, explicitly

The JSON block is the artifact a human applies. Loading it afterwards is
`npx tsx scripts/migrateAfrikToDatabase.ts --target=recette` — the target argument is
mandatory, `--target=staging` is retired and throws, and production is loaded only
deliberately.

## Definition of done

The run is complete when the output follows the contract above, no claim is unsourced, the
arithmetic is checked, and what is still missing is stated rather than hidden. If any of
those cannot be satisfied, say so and stop. Plausible-looking filler is the one failure
this corpus cannot absorb.

## Reference

- `reference/entities.md` — the eight classes, their models and their shapes
- `reference/source-tiers.md` — the tier doctrine and how to choose one
- `reference/directives.md` — formatting and identifier rules
- `reference/tools.md` — the query functions that exist, and how to call them
