# The bilingual glossary

Terminology in this domain is not neutral. `peuple` renders as **people** —
never _tribe_, never _ethnic group_; both alternatives carry exactly the
colonial framing the project exists to refuse. With 1 700 fiches translated one
by one, the same group would be a people on one page and a tribe on the next,
and nobody would notice until a reader did. REQ-144 therefore asks for exactly
one bilingual glossary, and for translated content to use it.

## Where it lives

One declared file: `src/lib/glossaire/terms.ts`, exporting `GLOSSARY_TERMS`.

It is TypeScript rather than JSON on purpose. Most of its terms are not written
there — they are read from the records that already label a closed set
somewhere else, so the glossary and the surface that renders the value cannot
disagree:

| Family              | Read from                                           |
| ------------------- | --------------------------------------------------- |
| `domain.*`          | written in `terms.ts` itself                        |
| `entry.*`           | `src/lib/glossaire/entries.ts` (the reader page)    |
| `source-tier.*`     | `SOURCE_TIER_LABELS`, `SOURCE_PENDING_REVIEW_LABEL` |
| `classification.*`  | `CLASSIFICATION_LABELS`                             |
| `relation-type.*`   | `RELATION_TYPE_LABELS`                              |
| `name-type.*`       | `NAME_TYPE_LABELS`                                  |
| `patronyme.<map>.*` | `PATRONYME_VOCABULARY`                              |
| `access-mode.*`     | `ACCESS_MODE_LABELS_BY_LOCALE`                      |
| `colonial-event.*`  | `COLONIAL_EVENT_TYPE_LABELS`                        |

Every record in the right-hand column lives in
`src/lib/glossaire/vocabularies.ts`, keyed by locale (`fr` / `en`). That file
is the one owner of the controlled vocabularies; `src/lib/translations.ts`
points at it rather than restating the labels, and the badge components read
from it rather than carrying their own copy. A vocabulary labelled anywhere
else is a competing list, and `src/lib/glossaire/__tests__/terms.test.ts` fails
until it joins.

A term carries `key`, `fr`, `en`, optionally `forbiddenEn` (English words that
must never stand for it) and `note` (why the ruling is what it is). The only
term allowed to render as "Tribe" is `entry.tribu`, which exists to retire the
word.

The locale key is `GlossaryLocale`, declared in `vocabularies.ts`, because
`Language` in `src/types/shared.ts` still says `"fr"` on the branch this
shipped from. When the bilingual foundation widens `Language`, that one line
becomes an alias and nothing else moves.

## How the gate reads it

`npm run check:glossary` runs `scripts/ci/checkGlossary.ts`, wired into
`ci.yml` beside the other `check:*` steps. It walks two surfaces:

1. every string leaf of every record under `dataset/translations/en/`, named by
   record id and JSON path;
2. the `en` side of each UI dictionary listed in `UI_DICTIONARIES`, named by
   dotted key — skipped with a notice while `translations.en` does not exist.

Two rules, and only two. The glossary is a gate on _terms_, not a spell-checker
on prose; a gate that fires on every sentence gets switched off.

- **`glossary-forbidden-rendering`** — a `forbiddenEn` word stands in the
  English: "the Yoruba are a tribe".
- **`glossary-untranslated-term`** — the French form of a term survives in the
  English: "the Bantu famille linguistique". Terms whose two forms are the same
  word (Nisba, Caste, Transculturation) never fire.

What the gate leaves alone, and why:

- a quoted mention — `« tribe »`, `“tribe”`, `"tribe"`, `'tribe'` — because the
  fiche must be able to name the word it retires;
- the three fields where a retired word is legitimately discussed:
  `whyProblematic`, `originOfExonyms`, `contemporaryUsage`;
- what no reader sees: `_meta`, identifiers (`id`, `*Id`, `sourceKey`,
  `sourceRefs`, `fieldPath`) and URLs;
- a shorter term inside a longer match (`linguistique` inside
  `famille linguistique`), which is the longer term's business.

A paraphrase that is neither rule — "oral account" for _récit oral_ — is
invisible to the gate by design. Seed `forbiddenEn` with a near-synonym when a
real translation shows the drift is worth catching; do not widen the rules.

The gate passes on an empty set and says how many records it scanned, so a
green run before any translation exists is a measured zero, not a vacuous one.

## Adding a term or a vocabulary

- A domain word with no controlled set behind it goes in `DOMAIN_TERMS` in
  `terms.ts`, with a `note` saying why the English is what it is.
- A new controlled vocabulary goes in `vocabularies.ts` as a locale-keyed
  record, then one spread in `terms.ts`, then one line in the expected-key list
  of `terms.test.ts`. The terms test refuses a vocabulary that is present in
  one locale and not the other.
- English register: British spelling, present tense, declarative, no
  contractions.
