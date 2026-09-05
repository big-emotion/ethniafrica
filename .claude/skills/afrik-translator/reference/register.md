# Register — how the English fiche speaks

The ruling is in `docs/design/brand-charter.md` §3 Voice, one section for both
languages so the two cannot drift. This page carries the operational rules the
charter should not.

## The English register

- **British spelling** — _colonised_, _organisation_, _centre_, _programme_.
  It matches every English string the repository already holds
  (_Indigenisation_ in `src/lib/glossaire/entries.ts`) and it is the variety
  of the African Commission, IWGIA and most of the anglophone African press
  the fiches cite.
- **Present tense**, as in French: the atlas states what the corpus holds.
- **Declarative and specific.** No hedging adverbs added in translation; no
  claim strengthened either. _Il semble que_ is _it appears that_, not
  _scholars agree that_.
- **No contractions in editorial prose** — _does not_, never _doesn't_. A
  contraction reads as marketing copy on a page that must read as a record.
- **Second person only where the French uses it.** The French addresses the
  reader in error states, consent and the report dialogs, and nowhere in a
  fiche; the English fiche never says _you_ either.
- **`people` is singular-as-collective with plural agreement** — "the Asante
  people are", "the peoples of the Great Lakes". Never _tribe_, never _ethnic
  group_ (`reference/glossary.md`).
- **No gendered generic.** _Elders_, _speakers_, _the community_; never _men_
  for _people_.
- **Numbers and dates as the French fiche gives them**: 2025 reference year,
  the same figures. Thin-space grouping becomes comma grouping (12 500 000 →
  12,500,000); centuries are spelled out (_the seventeenth century_).
- **Autonyms keep their diacritics and click letters** — ǂNukhoen, Haiǁom,
  Gǀwi — and their `lang` attribute: `src/components/country/AutonymExonymHeading.tsx`
  (`lang={endonymLang}`) and `src/components/ui/AutonymExonymHeading.tsx`
  (`lang={autonymLang}`) render them, and `afh/no-bare-people-name` refuses a
  bare name in `components/people/**` and `components/country/**`.
- **No markdown in prose**, as in French — no `**`, `*`, backticks, `>`, `<`,
  `~`, `±`.

## The invariants, stated as a refusal

The skill refuses to translate these, and states each carry-over in its
output. The reason is not style: each one, translated, breaks the thing the
fiche exists to record.

| Never translated                                                           | Because                                                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| An autonym — `selfAppellation`, `mainName`, `nameMain` of a people or name | Rendering it into English is the act of renaming the fiche documents. The autonym leads in both locales.     |
| An exonym or spelling alias — the name, not its gloss                      | The exonym _is_ the evidence: which name, imposed by whom. A translated exonym is a fourth name nobody used. |
| `sources[].title`, `author`, `url`, `sourceKey`, `reference`               | A translated title is a citation nobody can find. The seven titles that carry "Hottentot" stay as cited.     |
| Identifiers, ISO codes, glottocodes, Wikidata IDs, `_meta.*`               | Keys, not words.                                                                                             |
| Numbers, years, percentages, enum values, tiers, statuses                  | Data; the label that renders an enum is class 4 and comes from the glossary's vocabularies.                  |
| `nameFr` on countries, `nameFr` / `nameEn` on families and languages       | Already a bilingual pair, or a class-4 name held in `Admin0Country.name`. Reuse; never re-translate.         |
| Image paths, licence URIs, geometry, media locators                        | Files.                                                                                                       |

### The glossed-invariant sub-rule

Where a class-1 string carries a parenthetical French gloss —
"Hottentots (pejoratif, colonial)", "Jieng (pluriel) / Muonyjang (singulier)",
"Clan Oyoko (clan royal fondateur)" — the name outside the parentheses is the
invariant and the gloss is prose. `GLOSSED_INVARIANT_PATHS` in
`src/lib/i18n/translationClasses.ts` is the one list of leaves this applies
to; `glossedInvariantName` is what the gate compares. The gloss is class 2
when it is a plain descriptor and class 3 when it judges the word
(`reference/review-rules.md`, R6). An ISO code in a parenthesis is not a gloss.

### The gloss rule

A meaning is glossed **from the source language the record names** —
`names[].languageOfOrigin`, the language the prose cites (_en langue
khoekhoe_, _du grec_, _prefixe bantu_) — never from the other locale's gloss.
Where the French gloss is the only witness, keep it, mark the leaf
reviewed-with-reservation, and leave the claim as the fiche's. A gloss relayed
through a gloss is a translation of a translation.

## The reader-facing register, in English

Three fields of a fiche are published to the reader verbatim, with no
sanitising layer: `gaps[].reason`, `sources[].title`, `sources[].notes`
(nested under `names[].sources[]` on name fiches). The doctrine is
`docs/editorial/reader-facing-register.md`; the French gate is
`INTERNAL_REGISTER_PATTERNS` in `scripts/ci/checkEditorialRules.ts`. That
gate reads only the French source today, not `dataset/translations/`. Its
path, filename, field-path and identifier patterns are language-neutral and
will fire on an English sidecar the day it reads one; its curation vocabulary
is French and will not. So **the skill is the only guard on an English
sidecar's register until the gate learns it** (the natural owner is the parity
gate, REQ-145). The governing sentence holds in both languages: the reader is
owed the silence itself, never the reason the workshop has not filled it yet.

| Class of the gate     | Never in an English published field                                                                                                                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| repository path       | `dataset/source/afrik/…`, `dataset/translations/…`, `docs/…`, `scripts/…`, `src/…`, `public/…`                                                                                                                                                                                |
| file name             | any `*.json`                                                                                                                                                                                                                                                                  |
| JSON field path       | `content.appellations.whyProblematic`, `fieldPath`, `sourceRefs`, `sourceKey`, `verificationLead`, `targetPatronymeId`, `classificationStatus`                                                                                                                                |
| raw corpus identifier | `PPL_ASANTE`, `FLG_KHOE`, `PAT_KEITA`, `PAT_*` — name the people, the country, the name                                                                                                                                                                                       |
| curation vocabulary   | _queue_, _candidate queue_, _research pass_, _this pass_, _research protocol_, _claim-level review_, _inherited tier_, _outside the corpus_ / _out of corpus_, _coverage plan_, _wave N_, _sweep_, _Lead:_, _Research:_, _sidecar_, _translation class_, _machine provenance_ |
| internal corpus label | _AFRIK corpus —_ as a source title                                                                                                                                                                                                                                            |

The last row of the vocabulary is new to English: the translation pipeline's
own words — _sidecar_, _class 3_, _machine_ — are as much workshop vocabulary
as _la passe_, and a note that says "machine-translated, awaiting review"
belongs in the `_translation` block, which the reader sees as a provenance
marker, never in `sources[].notes`.

### How to say it instead

| Workshop register                                                                                             | Reader register                                                                                   |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Generated from the candidate queue; the field awaits the per-fiche research protocol.                         | The atlas does not yet document this point for this name: no dedicated source has been consulted. |
| Source passage: PPL_DIOULA, clan organisation chapter. Inherited tier unresolved; claim-level review pending. | Taken from the "Clan organisation" chapter of the Dioula people's fiche.                          |
| AFRIK corpus — PPL_DIOULA, clan organisation                                                                  | EthniAfrica — fiche of the Dioula people, clan organisation                                       |
| No deceased bearer was attached to the jamu by the sources of this pass.                                      | No bearer has been attached to the jamu by the sources consulted.                                 |
| Machine translation of the French note; class 3, not yet reviewed.                                            | (nothing — the provenance marker says it)                                                         |
