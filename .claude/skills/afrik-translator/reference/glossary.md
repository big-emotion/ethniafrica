# Glossary — one file, and the instruction never to contradict it

REQ-144 asks for **exactly one** bilingual glossary. This page does not restate
it — a second list here would be the competing glossary the requirement
forbids. It says where the one file is and how the skill uses it.

## The one path

`src/lib/glossaire/terms.ts` exports `GLOSSARY_TERMS`, the glossary assembled
from the records that already label a closed set somewhere else, so nothing is
retyped and the two cannot disagree:

- the reader-facing entries of `src/lib/glossaire/entries.ts`
  (`GLOSSARY_ENTRIES`, `fr` / `en` / definition, rendered at `/glossaire`);
- the controlled vocabularies of `src/lib/glossaire/vocabularies.ts` — source
  tiers, classification statuses, relation and name types, the patronyme
  sub-vocabularies, colonial event types, access modes — labelled once per
  locale;
- the handful of domain terms no vocabulary carries (_peuple_, _famille
  linguistique_, _appellation_, _récit oral_), each with the reason for its
  ruling and, where it matters, a `forbiddenEn` list.

`npm run check:glossary` (`scripts/ci/checkGlossary.ts`) walks every string
leaf under `dataset/translations/en/` and the English side of the UI
dictionaries against it. It reports a `forbiddenEn` word standing for a term,
or a French term left standing in English; a quoted mention and the three
discussion fields (`whyProblematic`, `originOfExonyms`, `contemporaryUsage`)
are exempt, because a fiche has to be able to name the word it retires.

## How the skill uses it

1. **Load before translating.** Read `GLOSSARY_TERMS` and keep the `fr → en`
   pairs in view for the whole run.
2. **The glossary wins.** When the glossary and your instinct disagree, the
   glossary wins and you open a ticket. Never a silent synonym, never a
   "better" rendering in one sidecar.
3. **List what you used.** The output ends with `## Glossary terms used` —
   the keys, one per line (`domain.peuple`, `source-tier.unverified`,
   `entry.exonyme`) — so a reviewer can see the vocabulary the sidecar rests
   on and the gate has something to compare.
4. **A missing term is a finding**, not a licence. A domain word the glossary
   does not carry is reported under `## Still open` with the rendering you
   chose and why, and proposed as an entry to `terms.ts`. It is not added
   here.

## The rulings a translator meets first

Quoted from `GLOSSARY_TERMS` so the reasons travel with the skill; the charter
contract test re-reads every row against the file, so a row that drifts from
it fails the build rather than misleading a translator. The file is
authoritative on the wording.

| French               | English          | Why                                                                                                                                                                                       |
| -------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| peuple               | people           | Never _tribe_ or _tribes_, never _ethnic group_ or _ethnic groups_ (`forbiddenEn`): one hierarchises, the other essentialises. Tested at `src/lib/glossaire/__tests__/glossaire.test.ts`. |
| famille linguistique | language family  | The established term in English-language linguistics; _linguistic family_ is a calque and is forbidden.                                                                                   |
| appellation          | name             | In English the plain word does the work; _appellation_ reads as a wine label. The module label itself is class 4 (the English slugs of DEC-049), not a fiche's word.                      |
| récit oral           | oral narrative   | A source in its own right, cited with its teller. _Oral tradition_ names the practice, not the record.                                                                                    |
| Autonyme             | Autonym          | Defined for the reader at `/glossaire`; the term the atlas leads with.                                                                                                                    |
| Exonyme              | Exonym           | Defined for the reader at `/glossaire`; the name given from outside, kept and explained.                                                                                                  |
| Ethnonyme            | Name of a people | The reader-facing rendering; _ethnonym_ is not the English the glossary chose.                                                                                                            |
| Tribu                | Tribe            | An entry so the reader can learn what the word is and why the atlas does not use it. It defines the word; it never renders _peuple_.                                                      |
| Palier de source     | Source tier      | The three-value scale the fiche's confidence rests on.                                                                                                                                    |
| Officielle           | Official         | `SOURCE_TIER_LABELS`; the label a tier renders under, in both locales.                                                                                                                    |
| Référencée           | Referenced       | `SOURCE_TIER_LABELS`.                                                                                                                                                                     |
| Non vérifiée         | Unverified       | `SOURCE_TIER_LABELS`; a published fiche resting only on this tier is the intended outcome, not a defect.                                                                                  |
| En attente d'examen  | Awaiting review  | `SOURCE_PENDING_REVIEW_LABEL`; not a tier — a source nobody has ruled on is not a source ruled weak.                                                                                      |
| Héritage colonial    | Colonial legacy  | `CLASSIFICATION_LABELS`; the status of a fiche whose category was inherited from the colonial period and is kept, explained.                                                              |
| patronyme            | family name      | `NAME_TYPE_LABELS`; a surname in the English sense. The axis itself is _Nom_ (DEC-038), never _patronym_.                                                                                 |

Nothing above is a second glossary: each row is the file's own pair, with the
key or vocabulary that owns it. When a row and the file disagree, the file is
right, this row is stale, and the test says so.
