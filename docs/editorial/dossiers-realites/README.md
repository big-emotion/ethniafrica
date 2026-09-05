# Réalités — research record

Working material behind the three published dossiers of the Réalités vertical.
The collection is deliberately broader than the published fiches: every
collected chapter carries an `uncorroborated` list, and those lists are long —
nine to sixteen entries each. Claims that could not be supported at publication
time were dropped or turned into explicit reader-facing limits; they were not
silently promoted from research notes into the corpus.

## What this file holds

`research-collected-2026-09-06.json` — eleven chapters, each with:

| key               | what it is                                                       |
| ----------------- | ---------------------------------------------------------------- |
| `body`            | the chapter's prose, 2–4 paragraphs                              |
| `officialReading` | what the authoritative source states, restituted without irony   |
| `counterReading`  | what that framing leaves out — sourced, never "it's complicated" |
| `keyFigures`      | figures with their reference year and a source key               |
| `sources`         | tiered, with `sourceKind` and publication year                   |
| `uncorroborated`  | **read this first** — every claim resting on a single source     |
| `imageCandidates` | Wikimedia Commons files with author, licence and licence address |

## The three dossiers

| slug          | title                       | chapters published                                                                        |
| ------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `proportions` | Les vraies proportions      | `corriger-la-carte`, `mercator`, `surface`, `distances`                                   |
| `populations` | Les populations             | `poids-demographique`, `jeunesse`, `concentrations`, `ce-que-le-compte-laisse-hors-champ` |
| `ressources`  | Les ressources et la valeur | `noms-de-marchandise`, `scandale-geologique`, `parts-mondiales`, `ou-va-la-valeur`        |

## Two editorial findings worth keeping

**The Paris–Moscou equivalence that circulates is false.** Kinshasa–Goma is
1 572 km as the crow flies and Paris–Moscou is 2 486 km, measured rather than
repeated. What is true, and more interesting, is that no usable road links them:
the capital is not reachable by road from Goma, Lubumbashi, Kisangani,
Mbuji-Mayi or Kananga. The chapter is built on the second fact, not the first.

**"A third of the world's population is of African descent" is not what the
data says.** Africa was 18.8 % of world population in 2025; the projection
reaching roughly 38 % is for 2100. The `le-poids` chapter treats the confusion
head-on rather than repeating it, and says where it probably comes from.

## Publication record

- The three strict fiches live in `dataset/source/afrik/dossiers/` and contain
  twelve chapters in total. Every chapter carries both readings and resolvable
  source references.
- Three Wikimedia Commons images live in `public/images/dossiers/`. Their
  licences were checked against the Commons API and are recorded in
  `CREDITS.md` as well as in the visible captions.
- The missing `ou-va-la-valeur` chapter was written from International Energy
  Agency and UN Trade and Development sources. It distinguishes extraction,
  refining, component manufacture, and value capture.
- The corpus model check and editorial-rule gate pass. The reader-facing
  fields contain no repository paths, raw identifiers, or workshop language.
- The dossier charter runs in the ordinary test suite rather than the
  `known-failing` quarantine.
