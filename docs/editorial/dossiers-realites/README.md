# Réalités — research in progress

Working material for three dossiers of the Réalités vertical. **Not publishable
as it stands**, and the reason is in the data: every collected chapter carries
an `uncorroborated` list, and those lists are long — nine to sixteen entries
each. That is the collection working as intended, not failing. A claim the
collector could not corroborate from a second independent source is declared
rather than quietly published, which is the same discipline the fiches obey.

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

| slug          | title                  | chapters collected                                                                                                     |
| ------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `proportions` | Les vraies proportions | `la-resolution`, `mercator`, `la-vraie-taille`, `les-distances`                                                        |
| `populations` | Le poids réel          | `le-poids`, `la-jeunesse`, `les-concentrations`, `ce-quon-ne-compte-pas`                                               |
| `ressources`  | Un scandale géologique | `les-noms-de-marchandise`, `scandale-geologique`, `les-parts-mondiales`, and `ou-va-la-valeur` — **not yet collected** |

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

## What has to happen before any of this is published

1. Work through each chapter's `uncorroborated` list. A claim that survives
   gets a second source; a claim that does not is either dropped or published
   at `unverified` with the standing visible.
2. Fetch the chosen Commons images into `public/images/dossiers/`, with a
   `CREDITS.md` in the format `public/images/home/CREDITS.md` uses, and check
   each licence against the Commons API rather than against the collector's
   report.
3. Write the three fiches into `dataset/source/afrik/dossiers/DOS_*.json`
   against `public/modele-dossier.json`. The parser refuses a chapter with one
   reading, a reading citing nothing, and an attributed licence with no author
   or no address, so a fiche that loads is a fiche that met the doctrine.
4. Run `npx tsx scripts/validateAfrikData.ts` and
   `npx tsx scripts/ci/checkEditorialRules.ts`. The second one matters here:
   `sources[].title`, `sources[].notes` and `gaps[].reason` reach the reader
   verbatim, so no workshop vocabulary may survive in them.
