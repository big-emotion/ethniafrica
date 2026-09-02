# Anthroponym coverage plan

Getting the name dimension from 30 fiches on 21 countries to full coverage of
the 54, breadth first and depth in waves.

This file is written to be **pasted from**. Each wave carries a self-contained
prompt: open a fresh session, paste the prompt, and it has everything it needs.

## The target

Every country represented, with more names where more people live. A flat ten
would give Nigeria and the Seychelles the same representation, which is not a
fair proportion in any reading.

| Band         | Countries                                                                      | Names |
| ------------ | ------------------------------------------------------------------------------ | ----: |
| ≥ 100M       | NGA, COD, ETH, EGY                                                             |    30 |
| ≥ 25M        | TZA, ZAF, KEN, UGA, SDN, DZA, MAR, AGO, GHA, MOZ, CIV, MDG, CMR, NER, MLI, BFA |    20 |
| the other 34 | —                                                                              |    10 |

**Total quota: 780.** The bands are population, declared in
`scripts/afrik/buildAnthroponymCandidates.mjs` and owed a check against the UN
WPP 2025 table the corpus already uses as its demographic reference year. They
are deliberately _not_ derived from the corpus's own `distributionByCountry`
sums: those double-count, because a macro-people and its sub-peoples are both
attested in the same country, which puts Burundi ahead of Algeria.

## Where things stand

|                                   |                                    |
| --------------------------------- | ---------------------------------: |
| `PAT_*` fiches                    | 777 — 30 researched, 747 generated |
| Countries with ≥ 1 fiche          |                            54 / 54 |
| Countries with zero               |                                  0 |
| **Countries meeting their quota** |                        **54 / 54** |
| Candidates queued                 |                                848 |
| Queue deficit against quota       |               0 — wave 0 is closed |

The coverage target is met. What it means is narrow, and worth stating plainly:
747 of those fiches assert a name, its countries and its peoples, and nothing
else. They cite one source — the queue — at `unverified` × `ai_generated`, which
is 0.2, and carry a gap on every field research has not filled. Coverage is not
knowledge, and waves 2+ are where that changes.

The generator prints the deficit per country on every run — it is the progress
meter for wave 0, not an error:

```bash
node scripts/afrik/buildAnthroponymCandidates.mjs
```

## The waves

| Wave    | What it does                         | Output                               | Shape of the work                |
| ------- | ------------------------------------ | ------------------------------------ | -------------------------------- |
| **0**   | Close the queue deficit              | 848 candidates, quota 780 met        | Authoring, one country at a time |
| **1**   | Candidates → fiches, minimal depth   | 777 fiches, 54/54 countries at quota | **A script, not an agent**       |
| **2…N** | Research depth, by linguistic family | Confidence rises per family          | The per-fiche protocol           |

Wave 1 is where the coverage target is actually met. Waves 2+ never change
coverage — they change how much each fiche says.

### Depth wave order

Two different orderings, because two different numbers matter at two different
times — and confusing them is easy. **Fiches per family** decides what can be
deepened today; **peoples per family** decides what is worth deepening once
wave 1 has created fiches across all 24.

#### Done — the 30 existing fiches, by fiches per family

**Closed by #774**, and across all six families at once rather than the single
family this section proposed. It also repaired the defect the protocol warns
about: every Mande fiche had carried the same Jansen sentence as its only
reconstruction, and every Nguni fiche the same isibongo passage — a shared source
that had merely moved up a level. Each name now has an origin of its own, and
Roscoe's clan list is verified page by page (Ngonge/genet no 4, Fumbe/frog no 6,
Lugave/mushroom no 11, Njaza/antelope no 25, pp. 138-139).

The table below is kept as the record of what that pass covered.

| Family          | Fiches | What it holds                                                  |
| --------------- | -----: | -------------------------------------------------------------- |
| FLG_NIGERCONGO  |     12 | The Nguni block (isibongo, izithakazelo) and the Baganda ebika |
| FLG_MANDE       |     10 | Jamu and sanankuya; the best-documented of the six             |
| FLG_SEMITIQUE   |      4 | The Habesha non-hereditary patronymics                         |
| FLG_BERBERE     |      2 | Zenata nisba; Ibn Khaldūn already cited                        |
| FLG_ATLANTIQUE  |      1 | `PAT_SOW`                                                      |
| FLG_BENOUECONGO |      1 | `PAT_ABIKAN_PRAISE`, the Yoruba oríkì                          |

The advice that stood here — run the three large families in parallel, start
with NIGERCONGO because its first pass was thinnest — is what #774 did, in one
pass over all six. It transfers to the 747 generated fiches, which are now the
whole of the remaining depth work.

#### After wave 1 — all 24 families, by peoples per family

| Family                    | Peoples | Fiches today | What it opens                           |
| ------------------------- | ------: | -----------: | --------------------------------------- |
| FLG_NIGERCONGO            |     180 |           12 | Broadest, most heterogeneous            |
| FLG_BANTU                 |     174 |        **0** | Largest block, entirely uncovered today |
| FLG_BENOUECONGO           |      60 |            1 | Yoruba oríkì and Igbo naming            |
| FLG_COUCHITIQUE           |      58 |        **0** | Somali `qabiil` and the Oromo systems   |
| FLG_MANDE                 |      32 |           10 | Already the deepest                     |
| FLG_ATLANTIQUE            |      28 |            1 | Fulɓe and Wolof clans                   |
| FLG_BERBERE               |      14 |            2 | Nisba                                   |
| the remaining 17 families |       — |            0 | By size                                 |

Note FLG_BANTU: 174 peoples and **not one fiche**. It is the single largest gap
in the name dimension, and no amount of depth work reaches it before wave 1.

---

## Wave 0 — close the queue deficit

**Closed.** The 200 missing candidates were authored across the 20 deficit
countries, and the generator reports a deficit of 0 against the 780 quota.

The prompt below stays here because the quota is a floor, not a ceiling: raising
a band, adding a country, or replacing a thin entry after research reopens a
deficit, and this is how it gets closed. Run one country per invocation, or a
band at a time.

```text
You are an Africanist anthroponymist working on the EthniAfrica corpus.

Extend the anthroponym candidate queue for <COUNTRY_ISO3> up to its quota.

Read first:
  - scripts/afrik/anthroponymCandidates.data.mjs — the authored table; find the
    <COUNTRY_ISO3> block and read its `onomasticNote` and `verificationLead`
  - scripts/afrik/buildAnthroponymCandidates.mjs — the quota bands and the
    validation the table must pass
  - docs/runbooks/anthroponym-coverage-plan.md — this plan

Add entries to the <COUNTRY_ISO3> `names` array until it reaches the quota the
generator reports. Entry shape: [name, nameSystem, peopleIds, variants, note?]

Rules:
  - `nameSystem` is one of clan_name, non_hereditary_patronymic, nisba,
    praise_name, totemic_clan. Where the local tradition does not map onto one
    of the five, pick the closest and extend the country's `onomasticNote` to
    record the mismatch — do not silently misfile it.
  - `peopleIds` must be real `PPL_*` ids present in the corpus. The generator
    fails on an unknown id and warns when a people is not attested in the
    country claimed; leave the array empty rather than guess. Treat this as part
    of the deliverable rather than an optional field: a candidate that reaches
    wave 1 with an empty array becomes a fiche no people page will ever list,
    and the people route is how a reader is expected to find names. Leave it
    empty only where the name genuinely designates no group — a non-hereditary
    patronymic names one person's father, not a lineage.
  - No duplicate name within a country. Across countries is fine and expected:
    a name attested in five countries is one fiche with five attestations.
  - Prefer names that are frequent *and* onomastically informative. Ten
    spellings of the same Arabic given name teach the reader nothing; a nisba,
    a clan name and a patronymic chain element teach three different things.

Then run `node scripts/afrik/buildAnthroponymCandidates.mjs` and confirm the
country's deficit is 0 and no error is printed. Run `npx prettier --check` on
the two script files.

Do not create fiches. This wave only fills the queue.
```

---

## Wave 1 — breadth: candidates into fiches

**Closed.** `scripts/afrik/generatePatronymeFichesFromCandidates.mjs` writes 747
fiches from the 767 distinct queued names and defers the other 20 to the
researched fiches that already hold them. Re-running is idempotent: a fiche
citing nothing but the queue is regenerated rather than mistaken for research,
so a corrected candidate propagates.

Three things the prompt below did not anticipate, all resolved in the script and
worth reading before changing it:

- **Deferring a candidate was discarding its countries.** Nine researched fiches
  are queued for countries they do not list — the Nguni batch was researched
  from a Zimbabwe source, so Ndlovu, Mthethwa and Nxumalo attested only ZWE and
  reached no South African page. The script now merges those twelve country
  claims in, additively and citing the queue, which is what takes ZAF from 18 to
  its quota of 20.
- **An id collision is not the only kind.** `PAT_BAMBA` does not collide with the
  researched `PAT_BAMBA_CLAN`, but both carry nameMain "Bamba"; generating it
  would leave two fiches for one name, the second empty. Five names defer on
  nameMain rather than id.
- **A name can be queued under two systems.** Adam, Gatluak and Molefe are, and
  `nameSystem` is a dossier's discriminant — one fiche cannot hold both. The most
  frequent value wins and the disagreement is written down as a gap, because the
  arbitration (which may be that they are homographs) is editorial.

**Write a generator, do not have an agent author 780 files.** The candidates
already carry everything a minimal fiche needs; turning them into fiches is a
deterministic transformation, and a script makes it re-runnable when the queue
grows.

```text
You are working on the EthniAfrica AFRIK corpus.

Write scripts/afrik/generatePatronymeFichesFromCandidates.mjs, which turns every
entry of dataset/source/afrik/patronymes/_candidates-by-country.json into a
minimal `PAT_*` fiche, and run it.

Read first:
  - src/lib/afrik/parsers/patronymeTypes.ts — `PatronymeDossier`, the strict
    shape. This, not public/modele-nom.json, which is the appellation model.
  - src/types/sources.ts — `SOURCE_KINDS` is a closed vocabulary. There is no
    `book`, `blog` or `website`.
  - scripts/afrik/enrichPatronymeFiches.mjs — the merge and gap-rewriting
    conventions to follow, including the two source invariants.
  - dataset/source/afrik/patronymes/PAT_BAMBA_CLAN.json — a real fiche.

One fiche per distinct name, not per candidate row: a name queued for five
countries becomes one fiche with five country attestations and five spellings
entries. Derive the id as PAT_<NAME UPPERCASED, non-alphanumerics to _>; when
that collides with one of the 30 existing fiches, skip the candidate and report
it rather than overwrite — those 30 are already researched.

Each generated fiche carries:
  - nameMain, nameSystem, spellings (canonical + queued variants, each attested
    to its countries), peoples, countries
  - transmissionMode and designatedSocialUnit only where the candidate's
    nameSystem determines them unambiguously; otherwise "other" and a gap
  - empty origin, alliances, bearers, homonyms, and casteOrSocialFunction null
  - exactly one source: tier "unverified", source_kind "ai_generated", whose
    notes name the candidate queue as the origin and state that no dedicated
    source has been consulted yet
  - a `gaps` entry for every empty field, whose reason says the fiche was
    generated from the candidate queue and awaits the research protocol

Do not invent an etymology, a bearer, an alliance or a caste. This wave creates
coverage, not knowledge, and the confidence score must say so: unverified ×
ai_generated is 0.2, which is the correct and intended reading of these fiches.

Verify, and do not stop until all pass:
  - every fiche parses under parsePatronymeFile
  - loadAllPatronymeDossiers() returns 0 errors
  - npx tsx scripts/validateAfrikData.ts — 0 errors
  - npx tsx scripts/ci/checkEditorialRules.ts — 0 errors
  - make check
  - every country reaches its quota, counted over fiches rather than candidates

Then report the per-country coverage table.
```

**Expect existing tests to fail, and read them before changing them.**
`scripts/__tests__/patronymeClanFiches.test.ts` and `patronymeRareFiches.test.ts`
assert properties of the batch of 30. A test that breaks because the corpus grew
is updated; a test that breaks because a fiche is malformed is a real failure.
`patronymeRareFiches` requires an `https://` URL on every source and forbids
`wikipedia.org` — a generated fiche has no URL to give, so that assertion needs
scoping to the researched batch rather than loosening.

Three did break, and all three were scoped rather than relaxed:

- `patronymeRareFiches` — the https/non-Wikipedia rule now runs over the sources
  that claim to be works. The queue is a provenance marker with no URL by
  design, and requiring one of it would force a fabricated link.
- `patronymeClanFiches` — the fiche's countries no longer have to equal the
  people fiche's outright; the countries sourced to the corpus passage do. The
  queue's additions are a separate, weaker claim.
- `nommerFigures` — the one that mattered. It compares the published figure
  "fiches de nom" against the directory, and the chapter around that figure
  reads « L'atlas documente trente systèmes de nomination ». Bumping it to 777
  would have made a reader-facing sentence false, because a stub documents
  nothing. The figure and its `method` now count researched fiches — those
  carrying a source other than the queue — so the number stays 30 and the claim
  stays true. **If a later wave researches a generated fiche, this count rises
  on its own, which is the intended behaviour.**

---

## Waves 2…N — depth, by linguistic family

The per-fiche protocol is `docs/runbooks/anthroponym-fiche-research.md`; its
prompt is the one to paste. Add this framing at the top of a wave:

```text
Run the anthroponym fiche research protocol
(docs/runbooks/anthroponym-fiche-research.md) over every PAT_* fiche whose
`peoples` belong to <FLG_FAMILY>.

Process one fiche at a time and do not carry a source from one to the next: a
name attested for one people is not thereby attested for another. Traoré, Keïta
and Coulibaly appear in the same corpus sentence, and treating that sentence as
a source for all three is how the first batch ended up with one shared passage
standing in for thirty etymologies.

Share sources through a table keyed by sourceKey, the way
scripts/afrik/patronymeResearch.data.mjs does — patronymeJsonLoader keys sources
by title and rejects the batch when the same title appears twice with a
conflicting tier, URL or provenance.

A wave is done when, for every fiche it covers: transmissionMode is no longer
"other", origin carries at least one sourced claim, and every remaining gap
states what was searched and did not turn up rather than that the corpus passage
did not mention it.
```

## The parallel track: making the coverage visible

Coverage exists in the data long before a reader sees it. Today a name is
reachable at `/fr/atlas/noms/[slug]` and through `/api/v2/patronymes`, but no
people page and no country page lists its names — so "every country represented
by names" can be true in the corpus and false on screen.

This track **does not depend on any wave** and can start immediately: both join
tables exist and are populated, so it is an API and UI change with no migration.
It gets better as the waves land, and it is what makes them worth landing.

`docs/design/name-to-country-linking.md` is the model. Its one load-bearing
finding, measured rather than assumed: the direct country link and the
people→country route return **different sets** — 21 countries against 25, with
two reachable only directly and six only via peoples. They are different claims,
attestation against reach, and merging them into one list would publish an
inference as a sourced fact.

```text
You are working on the EthniAfrica front end and API.

Surface the name dimension on the people and country fiches, following
docs/design/name-to-country-linking.md. Read it first — it carries the one
constraint that makes this non-trivial.

Add:
  - `/api/v2/peoples/{id}` — the names borne by this people, from
    afrik_patronyme_peoples. Route, handler and service, per the three-layer
    rule in CLAUDE.md, plus the OpenAPI spec in src/lib/api/openapiV2.ts.
  - `/api/v2/countries/{id}` — the names attested in this country, from
    afrik_patronyme_countries.
  - a "Noms portés" section on the people fiche and a "Noms attestés" section on
    the country fiche, each linking through to /fr/atlas/noms/[slug].

The constraint: the direct country link and the people→country route return
different sets and mean different things — where the name is attested, against
where the people who bear it live. Keep them as separate, separately headed
lists, worded so the second reads as reach and not as attestation. Do not sum
them into one country list.

Handle the empty case as a declared gap, not a blank: a people with no names yet
is the normal state today (13 peoples out of ~800 carry one), and the section
should say so rather than disappear.

Mobile first — 430px, then 720, then 800. Invoke /afrik-art-director before
deciding anything about how the section looks.
```

## Running these in parallel

| Track                             | Depends on                      | State                             |
| --------------------------------- | ------------------------------- | --------------------------------- |
| Link surface                      | nothing                         | done — #776                       |
| Wave 0, per country               | nothing                         | done — 848 queued, deficit 0      |
| Depth on the six covered families | the 30 fiches                   | done — #774, all six in one pass  |
| Wave 1                            | better after wave 0             | done — 747 fiches, 54/54 at quota |
| Depth on the 747 generated fiches | wave 1, for the fiches to exist | the remaining work, by family     |

Everything up to and including wave 1 is closed. What is left is depth on the
747, which is the long haul: one fiche at a time, a dedicated source per name,
and **no source carried from one fiche to the next** — the failure #774 had to go
back and repair.

One operational lesson from getting here: waves 0 and 1 were authored in a
session that could not see #774 and #776 landing on `recette` in parallel, and
the two collided on seven files. Depth over 747 fiches is far more divisible than
that — split it by linguistic family, one branch per family, and the collisions
stay inside a family instead of across the corpus.

Wave 1 is a generator, so re-running it after wave 0 grows the queue costs
nothing — the sequencing above is about not reviewing the same 780 fiches twice,
not about a technical dependency.
