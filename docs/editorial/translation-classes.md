# Translation classes

The corpus is 1.9M words whose subject is partly language itself. Translating
it uniformly would reproduce, in the second locale, the very act the atlas
exists to document: an autonym rendered into English is a people renamed once
more; a source title rendered into English is a citation nobody can find; a
sentence _about_ a word, machine-translated, silently becomes a false
sentence. So a field is not translated according to its type but according to
its **class**, declared leaf by leaf in `src/lib/i18n/translationClasses.ts`
for the sixteen strict models in `public/modele-*.json` (REQ-143, DEC-047).

## The four classes

| Class             | Treatment                                                    | What it holds                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invariant`       | Carried over verbatim; a changed value is refused            | Identifiers, `nameMain`, autonyms, `exonyms[]`, `spellingAliases[]`, `sources[].title`/`author`/`url`, ISO codes, numbers, dates, enum values, image paths, credits                    |
| `translatable`    | Translated, by machine or by hand                            | Narrative prose: origins, organisation, culture, historical role, summaries, per-country notes, `sources[].notes`, `gaps[].reason`                                                     |
| `review_required` | Translated, but never published at machine provenance        | Anything about the meaning of a word: `whyProblematic`, `originOfExonyms`, `contemporaryUsage`, `names[].meaning`, `pays.etymology`, `formerNames[]`, linguistic reconstruction claims |
| `generated`       | Authored in code per locale; never stored as translated data | Quiz stems, the locative preposition, the admin-0 country name, UI labels — no model leaf carries this class                                                                           |

The declaration is configuration, not convention: the translation command
(REQ-146) reads it to decide what to send for translation, the sidecar rules
(`translationSidecarRules.ts`) read it to refuse a record that breaks its
class, and the coverage gate (`checkTranslationClassCoverage` in
`scripts/validateAfrikData.ts`, run by the data-integrity workflow on every
PR) fails when a model gains a leaf the declaration does not know, or keeps a
declaration for a leaf the model no longer has. A new model field cannot ship
unclassed.

## Why review, not re-authoring, for class 3

The first draft of REQ-143 required class-3 fields to be re-authored per
locale — an English `whyProblematic` written from scratch, glossed from the
source language the record names, never from the French. Testing that rule
against the live corpus showed it disproportionate: most values are factual
and translate cleanly. `PPL_ITESO`'s "Bakedi signifie peuple nu" is true in
any language.

What the corpus does hold is a minority of sentences whose truth depends on
the locale of the reader. `PPL_ASANTE` records that "les chercheurs anglophones
utilisent les deux formes de façon interchangeable" — which addresses the
English reader as a third party once translated. `PPL_KHOE_MACRO` glosses the
exonym "Hottentots" as "péjoratif, colonial", which materially understates
what the word carries in English. A human reviewer catches both; a rule that
forbids the translation altogether would have blocked hundreds of correct
sentences to catch them.

So the rule is **mandatory human review**: a class-3 leaf may be machine
translated, and `sidecarViolations` refuses to publish it while the record's
`translation_kind` is `machine`. It publishes at `machine_reviewed` or
`human`. Do not tighten this back to re-authoring without re-testing against
the corpus. The third acceptance criterion — a gloss authored in a second
locale is glossed from the source language, not from the other locale's gloss
— is what the reviewer is asked to check; it is procedural, and the
translation command's review prompt owns it, not a rule over two JSON objects.

## The glossed-invariant rule

Several class-1 leaves carry a French gloss inside the value: `exonyms[]` like
"Hottentots (péjoratif, colonial)" or "Turkana (terme européen)",
`selfAppellation` like "Jieng (pluriel) / Muonyjang (singulier)",
`ethnicities[]` like "Clan Oyoko (clan royal fondateur)". The name is the
invariant; the parenthetical is prose and translates.

`GLOSSED_INVARIANT_PATHS` is the one list of leaves the rule applies to, so
the translation command and the curator skill cannot disagree about it.
`glossedInvariantName` strips every parenthetical, and the sidecar rule
compares source and translation on what remains: "Ashanti (English spelling
variant)" against "Ashanti (variante orthographique anglaise)" passes,
"Ashantee (…)" is refused.

Two leaves that look glossed are deliberately absent from the list:
`content.languages.mainLanguage` ("Twi (twi)") and
`majorPeoples[].languages[]` ("Langue (iso)") hold an ISO code in the
parenthesis, which is invariant, not a gloss.

## `PARSER_ONLY_LEAVES` — why the model alone is not the contract

`public/modele-nom-patronyme.json` writes `casteOrSocialFunction: null` and
`origin.writtenChronicles` / `origin.linguisticReconstructions` as `[]`. The
parser, `src/lib/afrik/parsers/patronymeParser.ts`, defines their shape —
`{ value, sourceRefs }` and `{ claim, claimStatus, sourceRefs }` — and
`checkPatronymeFicheModel` validates fiches against the parser, not the
model. `PAT_DIABY` carries nine hundred characters of prose in
`casteOrSocialFunction.value`.

A declaration that walked only the model would have let that prose through
unclassed, so the patronyme model carries an explicit `PARSER_ONLY_LEAVES`
list: every leaf the parser accepts that the model does not show, each with
its class and the parser file that defines it. The gate treats a null or
empty-array model leaf as covered by the parser-only leaves beneath it, and
the declaration test round-trips fixtures through `parsePatronymeFile` to
prove both directions — every parser-accepted leaf has a class, every listed
leaf is one the parser accepts. A parser change that adds a prose leaf shows
up as an undeclared leaf in that test.

The other fifteen models are what their JSON says they are.

## The PAT origin-claim decision

A patronyme fiche has three origin arrays. Declaring all three
`review_required` would have put 793 fiches × up to three arrays behind a
human review, which contradicts DEC-047's premise that class 3 is a small
share of volume — and would have blocked the patronyme wave at machine
provenance for no gain on two of them.

- `origin.oralTraditions[].claim` and `origin.writtenChronicles[].claim`
  narrate: who came from where, which griot says so, which chronicle records
  it. Prose about people and places — `translatable`.
- `origin.linguisticReconstructions[].claim` is a claim about the word itself:
  what it derives from, what it meant. That is class 3 by definition —
  `review_required`.
- `origin.oralTraditions[].transcription` is the account in its own language
  with a locator, the same object as a récit-oral transcript —
  `review_required`.

`claim` is therefore one of the six leaf names allowed to carry different
classes in different places, recorded with its reason in `CLASS_EXCEPTIONS`
(with `nameMain`, `value`, `label`, `vehicularRole` and `name`). The
consistency test refuses any other divergence, so a new one has to be argued
there rather than slipped into a table.

## The country's English name is corpus data, not a lookup

`modele-pays.json` carries `nameEn` beside `nameFr`, both class 1. The first
draft of this document made the English country name class 4, read at display
time from `Admin0Country.name` in `src/lib/atlas/assets/africaAdmin0.ts`. Two
things ruled that out (ETNI-1857):

- **Search runs in SQL.** `afrik_search_countries` ranks on columns of
  `afrik_countries`; a name that lives only in a TypeScript asset cannot enter
  the exact-match tier or the prefix ladder, so an English reader typing "Chad"
  reached nothing while "Tchad" was an exact hit. Migration `082` gives the
  name a column (`afrik_countries.name_en`) and, under `?lang=en`, runs the
  families' accent-folded ladder over it — exact, prefix, substring — rather
  than a second tsvector: the name is a proper noun that must not go through
  the French stemmer, and fifty-four rows need no index. The sync script
  loads it from the fiche like every other identity field.
- **The cartographic asset uses the cartographer's wording, not the state's.**
  Natural Earth says "Ivory Coast", "Cape Verde", "eSwatini", "Gambia". The
  state itself says otherwise in English, and the atlas — which exists to let
  a people and a country be named as they name themselves — takes the state's
  form.

**The convention:** `nameEn` is the English name of ordinary use, in the form
the state itself employs in English — the ISO 3166-1 / UN short name, with the
state's preferred spelling where the two lists differ. Concretely: Chad,
Morocco, Sudan, South Sudan, Eritrea, Uganda, South Africa; Cabo Verde, Côte
d'Ivoire, Eswatini, The Gambia; Democratic Republic of the Congo and Republic
of the Congo (the two stay distinguishable without display logic, as `nameFr`
already requires); São Tomé and Príncipe and Côte d'Ivoire keep the diacritics
the state keeps — search folds accents, so nothing is lost for a reader who
types "Sao Tome". Like `nameFr` (ADR-0008) it is the name of ordinary use, never
the protocol name: Tanzania, not United Republic of Tanzania. Each fiche's
sources keep their tier; the name adds no claim that needs one.

`Admin0Country.name` stays what it is — the label the globe engine draws — and
is not a source for `nameEn`.

## Class-4 inventory

Strings authored per locale in code, and where each lives:

| String                      | Where                                                                             | State                                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Admin-0 country name        | `getAdmin0Name(countryId, locale)` in `src/lib/atlas/overlays.ts`                 | Both locales, from the Natural Earth asset — the globe's label only; the corpus name is `pays.nameEn` (class 1)     |
| Locative preposition        | `inCountry(countryId, name, locale)` in `src/lib/atlas/countryPreposition.ts`     | Both locales; English is "in", or "in the" for the Gambia, the Comoros, the Seychelles and the four named republics |
| Quiz stems and explanations | The 17 builders in `src/lib/quiz/questionTemplates.ts`                            | French only; English builders, `*_en` columns and bank regeneration wait on the translated corpus (content story)   |
| Game strings                | `src/lib/games/rounds/*.ts`, `landmarks.ts`, `gameRegistry.ts`                    | French only                                                                                                         |
| Country transformer labels  | `src/lib/countryDataTransformer.ts` (era labels, kingdom kinds, culture headings) | French only                                                                                                         |
| UI copy                     | `src/lib/translations.ts`, `TRAIL_PAGE_LABELS`                                    | French only; the foundation PR owns the shape                                                                       |

The consumers of `getAdmin0Name` and `inCountry` still pass `"fr"` until the
locale plumbing lands; the resolvers are ready, the wiring is not this
ticket's.

### Heuristics that still assume French input

`countryDataTransformer.ts` used to extract `{word, lang, definition}` triples
out of `pays.etymology` with regexes over French syntax ("vient du … et
signifie …"). Nothing rendered the result — `CountryParchment` prints the
etymology prose verbatim — so the extractor was deleted rather than
duplicated per locale; the prose is class 3 and reaches the English reader
through review.

Other heuristics in the same file still read French: `/colonie/` when typing
a timeline item, `royaume|sultanat|chefferie` when kinding a kingdom,
`/officiel/` when ranking a language, and the keyword extraction in
`transformCulture`. They keep working only while they run over the French
source record. Fixing them is a separate change, to be made when a surface
renders a translated country record through this transformer.
