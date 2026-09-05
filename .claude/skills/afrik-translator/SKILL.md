---
name: afrik-translator
description: Translation counterpart for the EthniAfrica AFRIK corpus and its editorial strings, between the two locales (fr ⇄ en, English default). Use when a fiche, a dossier, a home fact or a reader-facing note must exist in the other locale — it classifies every field before translating any of it, carries invariants over deliberately, translates class 2, flags class 3 for human review and refuses machine provenance for it, glosses from the source language the record names, keeps the English register of the brand charter, and never contradicts the bilingual glossary. Emits a sidecar proposal; never publishes. Triggers include "traduire la fiche", "traduis PPL_/FLG_/PAT_/[ISO3]", "translate this fiche", "version anglaise", "classe de traduction", "glossaire bilingue", "revue de traduction", "translation review".
---

# AFRIK Translator

Translation of the corpus is not word by word: the corpus is 1.9M words whose
subject is partly language itself. A translation command (REQ-146) applies
rules; it cannot decide whether a colonial term carries the same charge in the
target language, whether a gloss was relayed through the wrong language, or
whether a passage about anglophone usage still makes sense once its reader is
anglophone. This skill is where that judgement lives, so the next translator —
human or not — makes the same calls.

It reads a record in one locale and emits a **sidecar proposal** for the
other. It never writes to Supabase and never publishes; the command of
REQ-146 is what runs it at scale, and the parity gate (REQ-145) is what admits
the result.

## When to use

- **Translate** a record into the other locale (fr → en is the common case)
- **Review** a machine sidecar before it may publish at `machine_reviewed`
- **Audit** a pair of records for parity — a leaf translated that should have
  been carried, a gloss relayed through the wrong language
- **Rule** on a term, a register question, or an English rendering

Editorial work on the French record is `/afrik-curator`; the curator writes
the fiche, the translator its sidecar. The look of a page is
`/afrik-art-director`.

## Read first, every time

| What                       | Where                                                                       | Why                                                                                    |
| -------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| The class declaration      | `src/lib/i18n/translationClasses.ts` — read as `reference/field-classes.md` | The one source for which leaf is invariant, translatable, review-required or generated |
| The glossary               | `src/lib/glossaire/terms.ts` — see `reference/glossary.md`                  | The one bilingual vocabulary; the gate compares the sidecar against it                 |
| The Voice                  | `docs/design/brand-charter.md` §3 — see `reference/register.md`             | Both registers in one section, so the English fiche sounds like the French one         |
| The reader-facing register | `docs/editorial/reader-facing-register.md`                                  | Three fields publish verbatim; the English banned list is in `reference/register.md`   |
| The class-3 review rules   | `reference/review-rules.md`                                                 | The judgement calls, with the corpus's own worked examples                             |

## Hard rules

These are failure conditions, not preferences. Each names the failure it
prevents.

1. **Classify before translating.** Every leaf of the record is resolved
   through `classOf(model, path)` and the classification table is printed
   before any translation. A leaf with no declared class is not translated —
   it is reported. A record with no strict model (`ONS_*`) is refused whole.
   _Otherwise a model that gained a field ships it in one locale unclassed._
2. **An autonym is never translated.** `selfAppellation`, `mainName`, the
   `nameMain` of a people or a name are carried over verbatim, diacritics and
   click letters intact, and keep their `lang` attribute
   (`src/components/country/AutonymExonymHeading.tsx`,
   `src/components/ui/AutonymExonymHeading.tsx`; `afh/no-bare-people-name`).
   _Translating it repeats the act of renaming the fiche exists to document —
   the first habit of brand charter §3._
3. **Exonyms, spelling aliases, source titles, authors, URLs, identifiers,
   ISO codes, numbers and enum values are carried over**, and the output says
   so under `## Carried over deliberately`. _A translated title is a citation
   nobody can find; a translated exonym is a name nobody used._
4. **The name-and-gloss split.** In a leaf listed in `GLOSSED_INVARIANT_PATHS`
   the name outside the parentheses is invariant and the parenthetical gloss
   is prose — class 2 if it describes, class 3 if it judges the word
   (`reference/review-rules.md`, R6). _776 of 3 201 people exonym entries
   carry a gloss; a verbatim carry-over publishes French on the English
   fiche, a full translation renames the people._
5. **`review_required` never publishes at machine provenance.** Every class-3
   leaf the sidecar carries is listed under `## Needs human review` with the
   rule that fired and the specific risk; the record stays `kind: "machine"`
   until a named human has read each one, then `machine_reviewed`. An
   agent-drafted record is never `human`. _DEC-048 lets machine provenance
   publish when labelled; a class-3 field mislabelled is the one label the
   reader cannot detect._
6. **Gloss from the source language the record names** —
   `names[].languageOfOrigin`, the language the prose cites — never from the
   other locale's gloss. _A gloss of a gloss is a translation of a translation._
7. **Never contradict the glossary.** _peuple_ is _people_, never _tribe_,
   never _ethnic group_. When the glossary and your instinct disagree, the
   glossary wins and you open a ticket.
8. **The English register is brand charter §3**: British spelling, present
   tense, declarative, no contractions in editorial prose, second person only
   where the French uses it. _A contraction reads as marketing copy on a page
   that must read as a record._
9. **The reader-facing register applies in English.** `gaps[].reason`,
   `sources[].title` and `sources[].notes` carry no path, no identifier and
   none of the pipeline's vocabulary — _sidecar_, _class 3_, _research pass_,
   _coverage plan_ included. The French gate does not read English yet; you
   are the guard.
10. **Bilingual pairs are reused, never re-translated.** `nameEn` on families
    and languages, `Admin0Country.name` for countries.
11. **No markdown in prose**, in either language.
12. **Machine provenance says so.** A sidecar this skill drafts declares
    `kind: "machine"` in its `_translation` block. _DEC-048._

When the input conflicts with a rule, say so. Do not quietly accommodate.

## The sidecar

A translated record lives beside the corpus, never inside it:

```
dataset/translations/<lang>/<same relative path as the source>/<ID>.json
dataset/translations/en/peuples/FLG_NIGERCONGO/PPL_ASANTE.json
```

It is a **partial overlay**: it carries the leaves it translates and nothing
else — an invariant it repeats must be byte-identical, an invariant it omits
is read from the source. It ends with a `_translation` block:

| Field            | Value                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`           | `machine` for anything this skill drafts; `machine_reviewed` after a named human read every class-3 leaf; `human` only for a record a person wrote |
| `translatedAt`   | ISO-8601 date of the draft                                                                                                                         |
| `model`          | The engine that produced the draft (the strict model is implied by the path)                                                                       |
| `sourceHash`     | Hash of the source record at translation time — the parity gate uses it to detect a source that moved                                              |
| `fieldHashes`    | Per-leaf hashes of the source leaves translated, so a single edited chapter re-opens only that chapter                                             |
| `reviewRequired` | The concrete paths still awaiting a human: every class-3 leaf, every judged gloss (rule 4)                                                         |

`sidecarViolations` in `src/lib/i18n/translationSidecarRules.ts` is what the
gate runs over the pair; run it yourself before emitting.

## Workflow

### Phase 1 — Resolve the target

From an ID, go on. From a human name, `npx tsx scripts/resolveAfrikFiche.ts
"Zoulou"` — it reads the corpus in git and never guesses by similarity.
Confirm the ID; if several match, list them and ask.

### Phase 2 — Load

The source record on disk; its strict model from `public/`; the declaration;
the glossary; the existing sidecar, if any, and its `_translation` block.

### Phase 3 — Classify, and print the table

Every leaf of the record: `path | class | action`. Actions are _carry_,
_translate_, _translate + review_, _split_ (rule 4), _report_ (no class).
Nothing is translated before this table exists.

### Phase 4 — Translate

Class 1 carried; class 2 translated in the register; class 3 drafted and
listed for review with the rule from `reference/review-rules.md` that
applies; glossed invariants split. A gloss is rendered from the language the
record names. Every glossary term used is noted as it is used.

### Phase 5 — Verify, then emit

```bash
npx vitest run src/lib/i18n                     # the declaration and the sidecar rules
npx tsx scripts/ci/checkEditorialRules.ts       # the French gate still holds on the source
npm run check:glossary                          # the sidecars under dataset/translations/en/ against GLOSSARY_TERMS
```

Run `sidecarViolations` over the pair and confirm by hand: no invariant
changed; every class-3 leaf is in `reviewRequired`; no English workshop
vocabulary in the three verbatim fields; no markdown.

Emit in this order:

- `## Target` — `<ID> — <name>`, the model, the direction (fr → en)
- `## Classification` — the Phase 3 table
- `## Carried over deliberately` — each invariant, and the rule it falls under
- `## Needs human review` — path, rule (R1–R6), the specific risk
- `## Proposed sidecar` — a fenced `json` block, the full overlay with its
  `_translation` block, `kind: "machine"`
- `## Glossary terms used` — keys, one per line
- `## Still open` — a term the glossary lacks, a gloss with the French as its
  only witness, anything refused

## Definition of done

The run is complete when every leaf has a class, every invariant is stated as
carried, every class-3 leaf is listed for review, the sidecar passes
`sidecarViolations` at its declared `kind`, and what is still open is stated
rather than hidden. If any of those cannot be satisfied, say so and stop. A
fluent sidecar that renamed a people is the one failure this corpus cannot
absorb.

## Reference

- `reference/field-classes.md` — the four classes with every leaf of the
  sixteen models, equal to the declaration by test
- `reference/review-rules.md` — R1–R6 and the worked examples: PPL_ASANTE,
  PPL_KHOE_MACRO, PPL_TWA, and PPL_ITESO as the counter-example
- `reference/register.md` — the English register, the invariants as a
  refusal, the gloss rules, the reader-facing register in English
- `reference/glossary.md` — the one glossary path and how the skill uses it
