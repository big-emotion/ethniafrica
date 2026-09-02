# Anthroponym fiche research protocol

The per-fiche research pass that ETNI-1461 never ran.

## Why this document exists

ETNI-1461 shipped 30 `PAT_*` fiches and closed. What it actually delivered was a
**selection**: each fiche is a short dossier derived from a single passage of
prose already present in a peoples fiche, under the directive _"ne pas étendre
les affirmations sans source dédiée"_. The selection manifest still says so —
all 30 entries sit at `selected_pending_fiche_research`.

Measured across the 30 fiches:

| Field                                                                       | Filled                            |
| --------------------------------------------------------------------------- | --------------------------------- |
| `origin.oralTraditions` / `writtenChronicles` / `linguisticReconstructions` | 0 / 0 / 0                         |
| `alliances`                                                                 | 0                                 |
| `bearers`                                                                   | 0                                 |
| `homonyms`                                                                  | 0                                 |
| `casteOrSocialFunction`                                                     | 0                                 |
| `spellings`                                                                 | 31 across 30 fiches — no variants |
| declared `gaps`                                                             | 149                               |

26 of the 30 have an empty `externalSelectionSources`: no source outside the
corpus was consulted. The Jira ticket is closed; the corpus says the work is
pending. This protocol closes that gap.

## What a researcher is asked to produce

One strict-model JSON proposal per fiche, conforming to `public/modele-nom.json`,
in which **every claim carries its own source entry** — not a source inherited
from the peoples fiche the name was extracted from. A field that research cannot
establish stays a declared `gap` with a reason. An invented etymology is worse
than an empty chapter.

Fiche prose is written in French; this document and any commit message are in
English, per the repository convention.

## The prompt

Paste this per fiche, substituting the fiche id.

```text
You are an Africanist anthroponymist. Research the AFRIK name fiche <PAT_ID> and
return one strict-model JSON proposal conforming to public/modele-nom.json.

Read first, before searching anything:
  - dataset/source/afrik/patronymes/<PAT_ID>.json — the current skeletal fiche
  - the entry for <PAT_ID> in dataset/source/afrik/patronymes/_manifest.json —
    the corpus passage it was selected from, and its unresolved tier
  - every peoples fiche listed in the fiche's `peoples[]`

Then establish, chapter by chapter, only what a dedicated source supports:

1. origin.oralTraditions — the emic account: founding ancestor, migration
   narrative, the griot or lineage tradition that carries it. Name the tradition
   and who transmits it; do not paraphrase a generic "the ancestors came from".
2. origin.writtenChronicles — chronicles, colonial administrative records,
   Arabic-language sources, dated where possible.
3. origin.linguisticReconstructions — the etymon and the comparative work that
   establishes it. Distinguish this from folk etymology, which belongs in
   oralTraditions with that status made explicit.
4. transmissionMode — patrilineal, matrilineal, non-hereditary, other. The
   corpus default "other" is an unexamined placeholder, not a finding.
5. designatedSocialUnit — clan, lineage, caste, chiefdom, territorial group.
6. casteOrSocialFunction — hereditary occupational status where one is attested
   (griot/jeli, smith/numu, leatherworker), with the source that attests it.
   Silence here is a finding worth recording as a gap, not an omission.
7. alliances — joking kinship (sanankuya, kal, utani, dandiraaɓe) and formal
   pacts between named patronyms. This is the single most under-documented field
   in the batch: zero entries across 30 fiches.
8. spellings — every attested orthography with the country each is attested in.
   Preserve the corpus spelling exactly as it stands; add variants alongside it,
   never silently accent or de-accent it (REQ-135).
9. bearers — historically documented, deceased bearers only. No living people.
10. homonyms — identical spellings with distinct origins, each with its own
    origin trail. Do not merge them into one fiche.

Source rules, non-negotiable:
  - Every claim points at a `sources[]` entry with an explicit `tier`
    (official | referenced | unverified) and a `source_kind`. An untiered source
    is a blocking validation error.
  - Wikipedia is not a source. A primary source found through Wikipedia is cited
    at its own tier, by its own URL, and `notes` records which language versions
    were crossed so the chain stays auditable.
  - Aggregators (Joshua Project, 101lasttribes, peoplegroups) are cited at
    `unverified`, not excluded.
  - Do not upgrade the tier of the inherited corpus passage. It is currently
    unresolved; either resolve it against the underlying source or leave it.
  - Text you generated yourself is `tier: "unverified"` +
    `source_kind: "ai_generated"`, which scores 0.2. Label it; do not launder it.

Output:
  - the strict-model JSON proposal
  - a `gaps[]` entry for every field research could not establish, each with a
    reason naming what was searched and did not turn up
  - a short note listing which sources you consulted and rejected, and why

Do not write to dataset/ directly. Return the proposal for review.
```

## Batch variant

For a run across several fiches, prepend:

```text
Process these fiches one at a time, in order: <PAT_ID>, <PAT_ID>, …
Emit one proposal per fiche. Do not carry a source from one fiche to the next:
a name attested for one people is not thereby attested for another.
```

That last line matters. Traoré, Keïta and Coulibaly appear in the same corpus
sentence; treating that sentence as a source for all three is how the current
batch ended up with one shared passage standing in for thirty etymologies.

## Where the candidates for new fiches come from

`dataset/source/afrik/patronymes/_candidates-by-country.json` holds 648
candidates (579 distinct names) across the 54 countries, at least ten per
country, generated by `scripts/afrik/buildAnthroponymCandidates.mjs`. Every
entry there is `unverified` × `ai_generated` and stays a candidate until this
protocol has been run on it. It is a research queue, not a corpus.
