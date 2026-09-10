# Demographic cleanup — arbitration note

Measured 10 September 2026 against the corpus in `dataset/source/afrik`, on an
instruction and a population measurement that live in the private production
workspace, outside this repository.

**Nothing has been modified.** Every decision below is editorial and belongs to
the operator. This note exists so the ruling can be made on measurements rather
than on impressions, and so the session that applies it has an unambiguous
instruction. The annex files next to this one carry the full lists; the note
carries only what a decision needs.

## Method, so the numbers can be disputed

`scripts/afrik/auditDemography.ts` re-derives every figure here from the fiches
in one pass, over the pure `scripts/lib/demographyAudit.ts`. It is read-only.
Three of its rules are heuristics and are labelled as such wherever their output
is quoted:

- a **macro-group** is detected from the id suffix `_MACRO`, a name beginning
  "Peuples ", a name carrying "(macro-groupe)" or "(locuteurs)", plus `PPL_BANTU`
  whose id stem is a linguistic family;
- a **duplicate cluster** groups fiches whose name reduces to the same stem once
  the parenthetical scope, the country qualifier and the Bantu noun-class prefix
  are stripped. Two synonym pairs no stem rule can bridge, Fula/Fulbe and
  Kongo/Kikongo, were merged by hand after reading both fiches;
- a **container fiche** is one whose own `ethnicities` list names at least two
  other fiches of the corpus. This one is not a heuristic about wording — it is
  the corpus declaring its own nesting, in a field it already fills.

## The corpus as measured

|                                               | count |
| --------------------------------------------- | ----: |
| people fiches                                 |   776 |
| carrying a `totalPopulation`                  |   774 |
| macro-groups                                  |    21 |
| fiches declaring they contain ≥2 other fiches |    58 |
| fiches inside a duplicate cluster             |    95 |
| duplicate clusters                            |    32 |

`PPL_MINYANKA` and `PPL_COPTES` are the two fiches with no figure. The Copts are
not a small omission: Egypt's own fiche puts them at 10% of the country, which is
about 11.8 million people the peoples corpus does not count at all.

## Defect 1 — macro-groups, and the 45 the brief did not anticipate

The twenty-one are in `macro-groups.json`, led by "Peuples Bénoué-Congo" at 500
million and "Bantou" at 420 million. A ranking of the most numerous peoples puts
a language family first, in a project whose published video is called _Bantou
n'est pas un nom_. That much was already known.

What the measurement adds is that **the boundary is not where the brief drew it.**
Fifty-eight fiches declare, in their own `ethnicities` field, that they contain at
least two other fiches of the corpus. Thirteen of them are among the twenty-one
macro-groups. The remaining forty-five are ordinary-looking people fiches that
behave exactly like macro-groups in a ranking:

| fiche         | figure | contains, by its own declaration                        |
| ------------- | -----: | ------------------------------------------------------- |
| `PPL_AKAN`    |   25 M | Asante, Ashanti, Fante, Baoulé, Agni, Anyi, Bono, Brong |
| `PPL_NGUNI`   | 28.8 M | Zulu, Xhosa, Swazi, Ndebele                             |
| `PPL_BETI`    |    8 M | Ewondo, Fang, and its two country variants              |
| `PPL_RUNDI`   |   15 M | the Hutu and Tutsi fiches                               |
| `PPL_KONGO`   |   11 M | Solongo, Vili, Yombe                                    |
| `PPL_SONGHAI` |  8.4 M | Dendi, Kurtey, Wogo, Zarma                              |

So a single yes/no field does not describe the corpus. There are three levels in
it, not two: the **family**, the **cluster of peoples** (Akan, Nguni,
Sotho-Tswana, Béti), and the **people**. A ranking must exclude the first two and
keep the third, and the difference between the second and the third is a real
editorial judgement, not a naming convention.

One caveat on the forty-five: the relation is read from `ethnicities` without a
direction. `PPL_FANTE` appears in the list because its own `ethnicities` field
names Akan, which is its parent, not its child. The list is a candidate set to
be ruled on, not a verdict.

**What is needed from you.** Whether the new field carries two values or three.
Two is simpler and mislabels Akan; three is faithful and means ruling on
forty-five fiches one by one.

## Defect 2 — duplicates, and why the obvious rule is the wrong one

Thirty-two clusters, ninety-five fiches, sixty-three to attach as sub-groups.
The full list with every member's figure, country list, source count and autonym
is in `duplicate-clusters.json`. The largest are Ndebele at eight fiches,
Swahili at seven, Fula and Kongo at six each, Tonga at four.

The Sotho-Tswana family is the shape this stem rule cannot see: Tswana, Setswana
(National), Sotho, Sesotho (National), Sotho (Nord), Sotho (Sud), Pedi and
Sotho-Tswana are eight fiches for what a ranking would have to treat as two or
three peoples, and only three of them share a stem. That is why Botswana and
Lesotho survive the simulated curation still over-counting, below.

**The arbitration cannot follow the population, and it cannot follow the text
either.** In twenty-one of the thirty-two clusters the fiche with the widest
country coverage is not the fiche with the richest text. Luba is the clean
example:

| fiche              | figure | countries |                    sources |     text |
| ------------------ | -----: | --------: | -------------------------: | -------: |
| `PPL_LUBA`         |   13 M |         1 | Joshua Project, Britannica | 11 116 c |
| `PPL_LUBA_KATANGA` |    5 M |         1 |  SIL Ethnologue (official) | 13 204 c |
| `PPL_LUBA_KASAI`   |  7.5 M |         1 |  SIL Ethnologue (official) | 11 804 c |

The fiche carrying the big pan-ethnic number rests on an `unverified` aggregator;
the two country-scoped ones rest on an `official` source and carry more prose.
Keeping the biggest number would demote the better-sourced material.

There is a pattern behind this, and it is worth knowing before ruling. Fifty-eight
of the ninety-five clustered fiches sit under `FLG_NIGERCONGO`, a parent family
rather than a leaf, and fifty-three of the seventy-eight fiches whose name ends in
a parenthetical qualifier sit there too. **The duplicates are not scattered
mistakes, they are one import batch** laid over an earlier one, and the later
batch is generally the better-sourced. Whatever is decided, it should be decided
once for that batch rather than thirty-two times.

The annex proposes a principal per cluster on the "widest country coverage" rule
and flags the twenty-one where that choice loses the richest text. That flag is
the reason this note stops here.

**What is needed from you.** The rule itself: widest scope, best source tier, or
case by case. And confirmation that attaching means keeping every member's prose,
which is what "un doublon se rattache, il ne s'efface pas" implies but which the
data model does not currently have a place for.

## Defect 3 — the status of the figure is mostly not derivable

The brief says to derive the status from the existing `source` field and never to
guess. Applied honestly, that instruction does not reach most of the corpus.

| what the source prose supports      | fiches |
| ----------------------------------- | -----: |
| exactly one status, derivable       |    292 |
| several statuses at once, ambiguous |    177 |
| no status signal at all             |    307 |

So **292 of 776 fiches can be labelled without guessing**, and 484 cannot. The
ambiguous ones are typically a census figure carried forward by a projection,
which is genuinely two things and arguably needs two fields rather than one.

The measurement also turned up a status the brief did not anticipate, and it
matters more than the three that were planned. **In 154 fiches the figure is not
a headcount at all — it is a count of speakers**, taken from Ethnologue or
Glottolog, with no population vocabulary anywhere in the source. Their figures
sum to 1.28 billion, and the largest of them are precisely the macro-groups:
Bénoué-Congo, Bantou, Mandé, Lingala. A people and the speakers of its language
are not the same set, and on this atlas that distinction is not a technicality,
it is the subject.

Two further facts about provenance, both already reportable under the project's
own Source Tier policy: **361 fiches cite Joshua Project** in their demographic
source, which the policy tiers `unverified`, and **297 cite Wikipedia**, which
the policy says is not a source at all.

**What is needed from you.** Whether the field is one value or two (nature of the
count, and freshness), and what the 484 underivable fiches carry in the meantime.
An explicit `unknown` is honest and visible; leaving the field absent is quieter
and reads as an oversight later.

## Defect 4 — outliers, and an oracle the corpus already has

The known case is real: **Hausa in Cameroon at 8 million is 26.8% of the
country.** It is not corrected here.

The wider picture is worse than one value. Summing every people's country line
against the country's own declared population, **forty-eight of the fifty-four
African countries over-count.** The median country sums to 1.89× its own
population; Lesotho reaches 4.70×, Burundi 4.43×, Botswana 3.94×. Only Tunisia,
Djibouti, Mauritania, Egypt, Togo and Benin stay within their own population.
For four of the six that is thinness rather than accuracy — Tunisia and Djibouti
carry three peoples each, Egypt eight, Mauritania nine, against a median of
twenty-four. Togo and Benin, at twenty-four and twenty-one, are the only two
countries the corpus both covers properly and counts correctly.

The two curations above fix most but not all of it. Simulating them — removing
the twenty-one macro-groups and keeping one fiche per cluster — moves the median
from 1.89× to 1.08×, and **thirty-one of fifty-four countries fall within 15% of
their own population.** Twenty-three do not: Botswana still sums to 2.93× and
Lesotho to 2.86×, because Tswana, Setswana (National) and Sotho-Tswana are three
fiches for one people that no stem rule bridges. Full table in
`country-overcount.json`.

That number is the one the publishing plan needs. **The per-country carousel
series can start on about thirty countries after this curation, not on all
fifty-four**, and the remaining twenty-three need a second pass.

Four entries are arithmetically impossible rather than merely doubtful, and they
need no judgement at all:

| fiche              | says                    | but                         |
| ------------------ | ----------------------- | --------------------------- |
| `PPL_CREOLE_MACRO` | 570 000 in Cape Verde   | the country holds 500 000   |
| `PPL_NDAU_ZIM`     | 1 600 000 in Mozambique | its own total is 800 000    |
| `PPL_LUNDA_NDEMBU` | 60 000 in Zambia        | its own total is 21 000     |
| `PPL_HUTU_BURUNDI` | 12 200 000 in Burundi   | its own total is 10 500 000 |

Finally, the outlier hunt does not need an external reference, because **the
corpus already states every one of these figures twice and nobody checks that the
two agree.** Country fiches carry `content.demographics.peoples[].percentageInCountry`;
people fiches carry an absolute figure for the same pair. Of 216 comparable pairs,
**84 disagree by more than half** — Toubou in Libya by a factor of 14, Beja in
Egypt by 6, Ijaw in Nigeria by 3.5, Copts in Egypt by everything. A further 49
country entries carry a percentage with no `peopleId`, so they cannot be checked
at all, and 9 name a people whose fiche does not list that country. Full list in
`cross-check-divergences.json`.

**What is needed from you.** Nothing, for the values themselves — they stay as
they are and are only flagged, per the brief. The decision is narrower: whether
the control script added after approval should fail the build on those 84
divergences, or report them. Failing today would make the build red on a corpus
nobody has had the chance to curate yet.

## What happens after your ruling

One branch, one commit, no deployment, no fiche deleted. In order:

1. the scope field on the 776 fiches, in whichever shape you rule, with the
   strict model in `public/modele-peuple.json` extended to declare it, the loader
   and the migration that carry it to the database;
2. the thirty-two clusters arbitrated, sub-groups attached rather than erased,
   every member's prose preserved;
3. the figure status on `content.demography`, derived where the source prose
   supports it and explicitly unknown where it does not;
4. a control script that fails when a macro-group or a container fiche appears in
   a ranking of peoples, which is the gate the brief asks for, plus the
   cross-check between the two demographic declarations at whichever severity you
   choose.

Steps 1 and 3 change the strict model, so they also change `validateAfrikData.ts`
and need a migration. That is the reason this is a two-session job and not one.

## Annexes

| file                           | what it holds                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `macro-groups.json`            | the 21, with figure, family and country count                                   |
| `container-fiches.json`        | the 58 self-declared containers and what each names                             |
| `duplicate-clusters.json`      | the 32 clusters, every member scored, principal proposed, text conflict flagged |
| `country-overcount.json`       | the 54 countries, ratio before and after the simulated curation                 |
| `cross-check-divergences.json` | the two declarations compared, 216 pairs                                        |
| `figure-status.json`           | per fiche: derivable status, speaker-count flag, source provenance              |
| `impossible-entries.json`      | the 4 entries arithmetic already rejects                                        |

Regenerate them all with:

```bash
npx tsx scripts/afrik/auditDemography.ts            # summary only
npx tsx scripts/afrik/auditDemography.ts --write    # rewrite the annexes
```

The figures in this note are the corpus of 10 September 2026 and are projections
for 2025, not censuses. That is defect 3, and it applies to this note as much as
to the fiches.
