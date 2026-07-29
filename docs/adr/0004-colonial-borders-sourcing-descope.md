# ADR-0004: Colonial partition boundaries — no compatible Tier 1/2 dataset found (descope)

- **Status**: Accepted
- **Date**: 2026-07-29
- **Issue**: ETNI-527 (`[13.3] Colonial partition boundaries — data acquisition (source or drop)`)

## Context

Story 13.3 required at least one Tier 1/2-sourced colonial partition boundary
layer, licensed for redistribution under CC-BY-SA-4.0, committed under
`dataset/source/afrik/geo/colonial_borders/` and simplified to
`public/geo/colonial-borders/{layer}.geojson`. The strict model
(`public/modele-frontiere-coloniale.json`) and the CR1/CR2 validator rules
(`scripts/validateAfrikData.ts`) were already built in the prerequisite story
13.2, so this story was acquisition-only.

The story is explicitly designed as a "source or drop" gate: if no dataset
clears the Source Tier Policy **and** the license bar, the epic proceeds
without a hand-drawn or invented boundary, and Story 13.8 (colonial-border map
overlay, `ETNI-532`) is descoped to ship only `BorderCrossingTable`, fed from
`afrik_people_countries` derivation (per
`_bmad-output/planning-artifacts/module-specs/epic-13-colonization-resistances.md`,
line 500).

## Research conducted

Candidates researched (academic historical-GIS publications and their hosting
repositories; Wikipedia was not used as anything but a discovery aid and no
Wikipedia article was cited):

1. **CShapes 2.0** (Schvitz, Girardin, Rüegger, Weidmann, Cederman, Gleditsch
   — _Mapping the International System, 1886–2019_, ETH Zürich ICR,
   <https://icr.ethz.ch/data/cshapes/>). Covers colonial-era African
   state/dependency boundaries from 1886 (post-Berlin Conference) onward —
   the closest fit to the story's requirement.
   **Disqualified on license**: published under
   **CC-BY-NC-SA-4.0**. The NonCommercial clause is strictly more
   restrictive than CC-BY-SA-4.0 and cannot be relicensed away, so it fails
   the "license compatibility with CC-BY-SA-4.0 redistribution" criterion.

2. **Paine, Qiu & Ricart-Huguet — "Endogenous Colonial Borders: Precolonial
   States and Geography in the Partition of Africa"** (_American Political
   Science Review_, 2024), Harvard Dataverse, DOI
   [10.7910/DVN/9QJVJ1](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/9QJVJ1).
   Contains genuine digitized colonial partition line/polygon shapefiles
   (`Africa_1887_lines.shp`, `Africa_1895_lines.shp`, etc.) for exactly this
   kind of layer.
   **Disqualified on redistribution terms**: the dataset's `termsOfUse`
   (confirmed via the Dataverse API) states verbatim: _"This dataset not to
   be distributed/posted outside of the Harvard Dataverse. All downloads
   should take place directly on Harvard Dataverse to ensure data
   integrity."_ This forbids exactly the redistribution the story requires.

3. Other Dataverse replication packages in the same research area — BJPS
   _"Colonial Mapmaking, Ethnic Identity, and Traditional Authority in
   Africa"_ (DVN/S0J76S), _"The Territorial Expansion of the Colonial State:
   German East Africa"_ (DVN/YRGXYU), JWSR _"Measuring the Impacts of
   Colonialism"_ (DVN/UQZFYA), _"The Origins of Colonial Investments in
   Former British and French Africa"_ (DVN/WZI2BZ) — are confirmed **CC0
   1.0** (compatible), but contain only tabular/survey/grid data, no border
   geometry. Not usable as a boundary layer.

4. **Michalopoulos & Papaioannou — "The Long-Run Effects of the Scramble for
   Africa"** (_American Economic Review_, 2016), replication data on
   openICPSR (DOI 10.3886/E112954V1). Contains partitioned-ethnicity GIS
   data of real interest, but the project page is client-rendered and
   blocked automated access (HTTP 403) during this sourcing pass, so its
   license could not be confirmed. Flagged below as a follow-up for a human
   with direct openICPSR access — not resolved in this story.

5. **Alesina, Easterly & Matuszeski — "Artificial States"** (_JEEA_, 2011).
   No publicly accessible shapefile/GIS replication package could be
   located.

No candidate combined confirmed real digitized colonial-partition geometry
with a confirmed CC-BY-SA-4.0-compatible redistribution license within this
sourcing pass.

## Decision

Per AC3 of ETNI-527:

- **No boundary layer is committed.** `dataset/source/afrik/geo/colonial_borders/`
  and `public/geo/colonial-borders/` remain absent from the repository. The
  only colonial-border fixtures in the repo are the pre-existing
  `scripts/__tests__/__fixtures__/colonial-borders/FRONTIERE_ILLUSTRATIVE.*`
  files, explicitly marked `"(illustrative, not data)"` and used solely to
  unit-test the CR1/CR2 validator rules — these are not, and must never be
  read as, published data.
- A regression test
  (`scripts/__tests__/validateAfrikData.colonialBorders.test.ts`, describe
  block "real dataset state matches the ETNI-527 descope decision") asserts
  that the real dataset root has no `geo/colonial_borders/` directory and
  that CR1/CR2 pass trivially (0 layers). This guards against a future,
  unreviewed addition of a boundary layer that bypasses this sourcing
  process.
- **Story 13.8** (`ETNI-532`, colonial-border map overlay) is descoped per
  its own technical notes: _"If 13.3 descopes (no sourced layer), only
  `BorderCrossingTable` ships, fed by 13.5 border pairs."_ Border-crossing
  information ships from `afrik_people_countries` derivation alone,
  `colonialOrigin` enrichment (Story 13.5) stays inactive.
- This descope is **not permanent**. Candidate 4 (Michalopoulos &
  Papaioannou, openICPSR) remains open for a human with authenticated
  openICPSR access to confirm the license and, if compatible, re-open
  acquisition in a follow-up story.

## Consequences

**Positive**

- No fabricated, hand-drawn, or under-licensed boundary data enters the
  AFRIK corpus — the Source Tier Policy and the "never invent data" rule
  hold without exception.
- The regression test makes the "empty by design" state explicit and
  reviewable, rather than an accidental absence.

**Negative**

- Story 13.8 ships in a reduced form (table only, no map overlay) until a
  compatible dataset is found.

**Out of scope**

- Resolving the openICPSR license for candidate 4 (requires authenticated,
  human access to the project page).
- Re-running this sourcing pass once a new Tier 1/2, CC-BY-SA-4.0-compatible
  dataset becomes available.
