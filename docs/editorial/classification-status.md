# Editorial classification status

`classificationStatus` is the machine-readable half of the project's decolonial
claim. The fiches have always argued, in prose, that a great many African
ethnonyms and family names were imposed rather than chosen. Until 2026-08-30
none of them could state that as data: the column existed, the badge existed,
and the corpus declared the field on zero fiches out of 812.

This document records the doctrine that filled it, so that the next curator can
tell a considered decision from a guess.

## Why a written doctrine at all

492 fiches acquired a classification in a single pass. An enum applied at that
scale without a stated rule is unfalsifiable a month later: nobody can say
whether `contested` on a given fiche was reasoned or reflexive. The Source Tier
policy is written down in `CLAUDE.md` for the same reason, and this is the same
kind of judgement — one that has to survive the person who made it.

## The rule the pass followed

**A fiche's classification is read out of that fiche's own already-sourced
prose. It is never imported from outside knowledge.**

This is the constraint that makes the pass legitimate rather than a mass
assertion. Every fiche in the candidate set already carried a `whyProblematic`
paragraph — an argument, with sources attached, about why its name is a
problem. Encoding that argument as an enum adds no claim the fiche was not
already making in French. Going and _deciding_ whether a people's name is
colonial, from general knowledge, would have been 492 new unsourced claims.

Concretely, each decision was taken from these fields and no others:

- people fiches — `content.appellations.whyProblematic`, `.originOfExonyms`,
  `.exonyms`, `.contemporaryUsage`
- family fiches — `content.decolonialHeader.whyProblematic`,
  `.originOfHistoricalTerm`, `.historicalAppellations`, `.contemporaryUsage`

Where a fiche's prose was too thin to support any reading, the decision says so
in its rationale rather than dressing up a guess.

## What selects each value

`whyProblematic` is a _candidate signal, not an answer_. It says a name is
contested; it does not say in which of three ways. The distinction is:

**`colonial-legacy`** — the prose attributes the problematic name to a colonial
actor: a European administrator, coloniser, missionary, explorer, navigator,
colonial-era scholar, or a colonial administration's own classification.

> FLG_BANTU is the reference case. Coined by Bleek in 1862, popularised by
> Meinhof and by the colonial administrator Johnston "dans un contexte de
> classification raciale", then made a legal race category by apartheid's Bantu
> Education Act of 1953.

**`contested`** — the name is disputed, reductive, pejorative or refused by the
communities concerned, or debated among scholars, _without_ a colonial coinage
being the stated reason.

> The most common case is an exonym given by a neighbouring African people.
> PPL_KALANGA carries a confusion with the Shona Karanga and an absorption by
> Ndebele, Shona and Tswana neighbours; no colonial author appears in its prose,
> so no colonial claim is made on its behalf.

**`reconstructive`** — the current name is a modern scholarly reconstruction or
analytic label that _replaced_ an older problematic term, with no
self-designating community behind it.

> FLG*TUU and FLG_KXA. Both were carved out of Greenberg's "Khoisan" by
> Güldemann and by Honken and Heine; both take their name from a reconstructed
> word in the languages themselves — \_tuu* "person", _kxʼà_ "earth".

**`consensual`** — no problem stated. See the next section: in this pass, this
value is never written.

### When a fiche argues two of them

The more specific claim wins, and the rationale says why. A named colonial
coinage outranks a general complaint about a name being reductive, because it
identifies who did it. FLG*KHOISAN argues both that Schultze forged the term in
1928 on biometric and racial criteria \_and* that the grouping has no genetic
basis; it is filed `colonial-legacy` because the first charge is the one the
fiche presses hardest.

## Absent is not `consensual`

`ClassificationBadge` renders nothing for a missing value and nothing for
`consensual`. On screen they are the same. In meaning they are not:

- **absent** — nobody has reviewed this fiche's name.
- **`consensual`** — someone reviewed it and found the name uncontested.

Writing `consensual` onto the 316 people fiches and 5 family fiches that argue
nothing would have asserted a review that never happened, and it would have been
invisible, because the two states look identical. So this pass writes the field
**only** where a fiche argues its name is a problem, and a corpus contract test
enforces both halves of that: every fiche with a `whyProblematic` declares a
status, and no fiche without one does.

The distinction the project would like to make — "reviewed and consensual"
versus "never reviewed" — is real and worth surfacing. It needs its own
review-provenance signal, a date or a curator, not an overloaded enum. That is a
separate decision and deliberately not taken here.

## Where the field lives, and the gate that reads it

`classificationStatus` is **top-level and camelCase** on the fiche, beside `id`
and before `content`:

```json
{
  "id": "PPL_YORUBA",
  "nameMain": "Yoruba",
  "languageFamilyId": "FLG_BENOUECONGO",
  "currentCountries": ["NGA", "BEN", "TGO", "GHA", "SLE"],
  "classificationStatus": "colonial-legacy",
  "content": {}
}
```

That position is not cosmetic: it is what `scripts/migrateAfrikToDatabase.ts`
loads into the `classification_status` column (`:204` for families, `:244` for
peoples). A value nested under `content` would load as NULL and the badge would
never render.

Both strict models — `public/modele-peuple.json` and
`public/modele-linguistique.json` — declare the field, because the curator
workflow rejects fields a model does not carry.

**A gate was checking nothing.** `scripts/ci/checkEditorialRules.ts` enforces
that a fiche classified `contested` or `colonial-legacy` carries at least two
sources. It read `fiche.classification_status`, snake_case, which no PPL or FLG
fiche has ever used. Had the corpus been filled without noticing, the rule would
have matched zero fiches and reported green — a fiche could have been published
as `colonial-legacy` on a single source with CI's approval. The extractor now
reads both spellings; the snake_case form stays because migration fiches use it.

## The 2026-08-30 pass

The candidate set was every fiche declaring a non-null `whyProblematic`:
**19 of 24 family fiches** and **473 of 789 people fiches**. All 492 already
carried two or more sources, so the editorial gate blocked none of them and no
fiche had to be left unclassified for want of sourcing.

The decisions are in
[`classification-status-ledger.json`](./classification-status-ledger.json) — one
entry per fiche, with the sentence of its own prose that justified the call.
`scripts/__tests__/classificationStatusCorpus.test.ts` holds the ledger and the
corpus equal, so the record cannot quietly drift away from what the fiches say.

|           | `colonial-legacy` | `contested` | `reconstructive` |   total |
| --------- | ----------------: | ----------: | ---------------: | ------: |
| families  |                15 |           2 |                2 |      19 |
| peoples   |               191 |         264 |               18 |     473 |
| **total** |           **206** |     **266** |           **20** | **492** |

That `colonial-legacy` accounts for 15 of the 19 families and only 191 of the
473 peoples is not an artefact of the method — it follows from who did the
naming. The family names are almost all nineteenth- and twentieth-century
European constructions, coined by Bleek, Müller, Meinhof, Westermann, Schultze
or Greenberg, several of them explicitly racial. Peoples were more often named
by their neighbours: the recurring case is a pejorative exonym from an adjacent
African population — Peul _Habe_ for the Dogon, Hausa _Mbororo_ for nomadic
Fula, Bassa "esclave" for the Dan — which a colonial administration then
adopted but did not invent. Where the fiche says the coloniser only relayed a
name, the fiche is filed `contested`, because saying otherwise would credit
Europe with an act it did not commit.

The 20 `reconstructive` fiches are almost all macro-categories that nobody
claims as an identity — `PPL_AUSTRO_MACRO` ("aucun de ces groupes ne se nomme
lui-même austronésien"), `PPL_SOTHO_TSWANA` ("un artefact académique
linguistique"), and the two Khoisan successor families.

### Known corpus defects surfaced by the pass

Reading 492 `whyProblematic` fields end to end exposed a few that are not
editorial arguments at all. They were classified on what prose they have, and
are recorded here rather than repaired, because repairing them is fiche
authorship and belongs to a curator:

- `FLG_BENOUECONGO` — `whyProblematic` is a bare heading, "PREUVES - Auteurs
  coloniaux problématiques :", with no body.
- `PPL_WOLOF_BANTU` — `whyProblematic` was a maintenance note ("ERREUR DE
  CLASSIFICATION": the fiche sat under `FLG_BANTU` and belonged under
  `FLG_ATLANTIQUE`), not a claim about the name, which the same fiche called
  universally accepted. Retired on 2026-09-05 and merged into `PPL_WOLOF`; the
  decision is recorded in `dataset/source/afrik/_retired-identifiers.json`.

## Not covered

- **Country fiches.** `afrik_countries` has no `classification_status` column,
  and a country is not named the way a people is. Adding it would be a schema
  change and a separate editorial question.
- **`migration_events`**, which carries its own classification, validated by
  `scripts/validateAfrikData.ts` and already surfaced in the migration
  components.
