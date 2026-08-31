# Design references — V2 atlas

The reviewed rendering the implementation answers to. When code and mockup
disagree, the mockup is the reference and the code is the bug — except where
`atlas-charter.md` states a rule the mockup itself got wrong, which is recorded
there.

|                         |                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Above the surfaces**  | [`brand-charter.md`](brand-charter.md) — the name, the promise, one token spine, colour, rhythm, composition, imagery     |
| **The rules**           | [`atlas-charter.md`](atlas-charter.md) — cartographic grammar, accent scope, the three entry points, empty-state doctrine |
| **The type**            | [`typography-charter.md`](typography-charter.md) — nine roles, the fluid scale, the card's three levels                   |
| **The clicks**          | [`actions-charter.md`](actions-charter.md) — four shapes, and what a radius means                                         |
| **The games**           | [`games-charter.md`](games-charter.md) — the item doctrine and what the Jouer hub owes                                    |
| **The engine decision** | [`../adr/0007-atlas-globe-engine.md`](../adr/0007-atlas-globe-engine.md) — three.js r169, one component for every surface |
| **The rendering**       | `mockups/` — four runnable pages, below                                                                                   |

Each of the four surface charters governs one surface. `brand-charter.md` sits
above them and answers the question none of them does — what this is and who is
speaking. Where it and a surface charter disagree, the surface charter is more
specific and wins, and the disagreement is a bug in one of them.

Every question about the brand, the look of a page or the coherence of an
assembly goes through the `/afrik-art-director` skill, which loads these in the
right order and knows how to render the surface to judge it.

## The four mockups

Published as private artifacts on claude.ai; the sources here rebuild them
byte-for-byte.

| Page                 | What it settles                                                                                                | Artifact                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `pages/ds.html`      | Tokens, primitives and their state matrix, the playable three-axis menu, the cartographic grammar side by side | [Système Atlas](https://claude.ai/code/artifact/64ae133e-6eb4-4ecd-ba4a-9ae07771e0b7)          |
| `pages/pays.html`    | Fly-to, admin-0 outline drawing itself, information panel                                                      | [Fiche Pays au globe](https://claude.ai/code/artifact/268e5091-253c-44f5-ada1-bb640f94a776)    |
| `pages/peuple.html`  | Borderless presence field, endonym against exonyms                                                             | [Fiche Peuple au globe](https://claude.ai/code/artifact/3451bec8-9ad7-48df-9bf3-5f8b96d2acd3)  |
| `pages/famille.html` | Derived footprint, and a fiche that shows its own missing fields                                               | [Fiche Famille au globe](https://claude.ai/code/artifact/8e7ff804-95e2-4bb1-a793-fe26612f5ff8) |

Every mockup runs on **real corpus data** — Nigeria, the Yoruba, Benue-Congo,
plus two aggregates computed over the 789 people fiches. Nothing is lorem, and
nothing is invented; that is what let the mockups surface the corpus gaps below.

## Rebuilding

The three.js bundle is not versioned here — it is r169, unmodified, and it is
recoverable from any published artifact.

```sh
cd docs/design/mockups
# 1. Recover the engine: in a published dist page, everything between
#    `<script type="module">` and the "LES TROIS POINTS D'ENTRÉE" banner.
#    Save it as parts/three.inline.js
# 2. Assemble
node build.js        # → dist/{ds,pays,peuple,famille}.html
# 3. Serve over HTTP — file:// is blocked for module scripts
python3 -m http.server 8080 --directory dist
```

`build.js` substitutes seven markers per page: `/*@THREE@*/`, `/*@GEO@*/`,
`/*@CORPUS@*/`, `/*@AFRICA_PATH@*/`, and for the fiches `/*@SHELLCSS@*/`,
`/*@NAVCORE@*/`, `/*@GLOBECORE@*/`. The shared parts live in `parts/` so a
change to the shell or the globe lands on the three fiches at once.

## Where the data comes from

- `parts/africa-admin0.json` — Natural Earth admin-0 110 m, filtered to
  `CONTINENT == "Africa"`, coordinates rounded to 0.01°, enriched with `a2`
  (ISO 3166-1 alpha-2) and `fr`. 51 countries, 33 KB.
- `parts/corpus.json` — real extracts from `dataset/source/afrik/`: `NGA.json`,
  `FLG_BENOUECONGO/PPL_YORUBA.json`, `FLG_BENOUECONGO.json`, plus two
  aggregates computed over all 789 people fiches (peoples per country; derived
  footprint per family).
- `parts/africa-path.txt` — continent silhouette, 800×758 frame mapped to
  lon −25→52 / lat 38→−35 — the same frame as `AFRICA_GEO_BOUNDS` and
  `BASEMAP_VIEWBOX` in `src/lib/atlas/projection.ts`.

## What building these surfaced

Three corpus gaps, each with an open correction ticket:

1. **All 24 family fiches declare no branches and no distribution.**
   `generalInfo.branches = []` and `distribution.distributionByCountry = {}`
   across every `FLG_*.json`. A family's geography is nowhere declared — only
   derivable from its member peoples.
2. **A country fiche's `nameFr` holds the official name, not the common one.**
   `NGA.nameFr` == `NGA.nameOfficial` == "République fédérale du Nigeria (…)".
   There is no common-name field in the country model, so a fiche title has
   nowhere to get "Nigeria" from.
3. **The home's _Comprendre_ card claims "3 000 ans".** `accessModeHubs.ts`
   retitled that module to "Premiers repères de migrations" (ETNI-1198) precisely
   because it rests on 6 sourced events. The figure outlived the retitling.
