import type { BinaryRound } from "@/lib/games/gameKinds";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import {
  isAfricanTerritory,
  territoryFootprint,
  type ComparedTerritory,
  type TerritoryFootprint,
} from "@/lib/games/territory";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { getCountryRoute } from "@/lib/routing";
import {
  MERCATOR_ROUND_EN,
  mercatorRevealEn,
} from "@/lib/games/rounds/mercatorRound.en";

/**
 * « Lequel couvre la plus grande surface ? » — which of two territories truly
 * covers more ground, and how differently Mercator draws them (REQ-120).
 *
 * The corpus holds no area column, so both figures come from the committed
 * outlines. That is the source recorded in the reveal, and it is why the
 * outlines' simplification is a property of the game rather than a bug: the
 * round compares magnitudes, it does not survey.
 *
 * A territory is not necessarily an African country. Restricting the pair to
 * the corpus kept the one comparison this page exists to make — Greenland
 * against the Congo — out of the game that argues it, because Greenland is in
 * a different committed asset. `lib/games/territory` is the seam that closed
 * that gap; see it for why the game began that way.
 */

const GAME = getGameBySlug("mercator");

/**
 * The provenance this game records. Not a fiche field: both areas are measured
 * off the committed admin-0 outlines, so the asset itself is what the claim
 * rests on. Exported so `revealProvenance` and its test key off one string
 * rather than two copies that can drift.
 */
// @req REQ-120
export const MERCATOR_PROVENANCE_PATH = "lib/atlas/assets/africaAdmin0";

/**
 * How far apart the two true areas must be before the outlines can be trusted
 * to rank them.
 *
 * **Raised from 1,02, which the assets never supported.** Both are simplified:
 * the African outlines measure the continent about 1 % under its published
 * area, and each country of the world asset lands within 4 % of its own. A
 * round asked about a 2 % gap was therefore asked about a difference the
 * simplification could have invented — the answer key itself could be wrong,
 * which is worse than a hard question.
 *
 * This threshold is about *measurement*, and it is the only thing it is about.
 * Whether a round is worth asking is a separate question, answered by
 * MINIMUM_DRAWN_INVERSION below. Conflating the two is what made 1,02 look
 * defensible: it was doing the second job badly instead of the first job at
 * all.
 *
 * Exported because the Jouer hub's scene advertises this game and must not
 * assert a gap the game itself would refuse to ask about. One threshold, so
 * the shop window and the shop cannot disagree.
 */
// @req REQ-120
export const MINIMUM_AREA_RATIO = 1.05;

/**
 * How much the flat map has to get the ranking wrong before the round has a
 * lesson in it.
 *
 * A bare inversion is not enough. « Tchad ou Afrique du Sud ? » inverts by a
 * fiftieth: the reader sees two shapes drawn all but identically, has nothing
 * to reason from, and guesses — the games charter's kill test, failed. At a
 * quarter over, the exaggeration is visible on the map the reader arrived
 * holding, and the rule that resolves it — the projection swells the north, so
 * the northern one is smaller than it looks — is the thing this page teaches.
 *
 * It is deliberately *not* folded into MINIMUM_AREA_RATIO. « Groenland ou
 * RDC ? » is the comparison the page was built to make and its true gap is
 * only 9 %, while the flat map draws Greenland thirteen times the larger. One
 * threshold could not keep that round and drop the coin flips; two can, because
 * they are measuring different things.
 */
// @req REQ-120
export const MINIMUM_DRAWN_INVERSION = 1.25;

/**
 * The stem of this question.
 *
 * It used to be `GameDefinition.promptFr`, back when the game had one question
 * and the registry could hold it. That field is the standing line printed above
 * every round — the page's own subtitle — and once a second question shipped it
 * was announcing one of the three as though it were all of them. It now carries
 * the thesis, and each round carries its own stem.
 */
// @req REQ-120
export const COMPARISON_PROMPT_FR =
  "Lequel de ces deux pays couvre la plus grande surface ?";

import { frenchNumber } from "@/lib/games/format";
const frenchFactor = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Ground a territory really covers, islands included, read off the committed
 * outlines — the corpus holds no area column. Exported because the session's
 * difficulty band ranks territories by magnitude and this module is where area
 * is defined; 0 for one the assets cannot draw, which sorts it last.
 */
// @req REQ-120
export function trueAreaKm2(territory: ComparedTerritory): number {
  return territoryFootprint(territory)?.trueAreaKm2 ?? 0;
}

/**
 * Whether the projection misranks this pair by enough to be worth asking
 * about: the territory that truly covers more ground is the one drawn smaller,
 * and drawn smaller by at least MINIMUM_DRAWN_INVERSION.
 *
 * The size condition is not decoration. A pair inverted by a fiftieth is drawn
 * as two all-but-identical shapes, and a reader looking at them has nothing to
 * reason from; a pair inverted by a quarter or more shows the exaggeration
 * plainly, which is what makes the rule behind it learnable.
 */
// @req REQ-120
export function mercatorMisleads(
  a: ComparedTerritory,
  b: ComparedTerritory
): boolean {
  const footprintA = territoryFootprint(a);
  const footprintB = territoryFootprint(b);
  if (!footprintA || !footprintB) return false;

  const [larger, smaller] =
    footprintA.trueAreaKm2 > footprintB.trueAreaKm2
      ? [footprintA, footprintB]
      : [footprintB, footprintA];

  return smaller.drawnAreaKm2 / larger.drawnAreaKm2 >= MINIMUM_DRAWN_INVERSION;
}

/** Verb-first so the sentence needs no gender agreement with the territory. */
function areaSentence(
  territory: ComparedTerritory,
  footprint: TerritoryFootprint
): string {
  return `${territory.nameFr} : ${frenchNumber.format(Math.round(footprint.trueAreaKm2))} km², que la projection de Mercator agrandit ${frenchFactor.format(footprint.inflation)} fois.`;
}

/**
 * Where the reveal leads. The atlas has a fiche for an African country and
 * none for a silhouette borrowed from outside the continent, so a pair that
 * mixes the two leads to whichever half the atlas documents — and a pair with
 * no African half at all leads to the atlas itself rather than nowhere.
 */
function destination(
  a: ComparedTerritory,
  b: ComparedTerritory
): ComparedTerritory | null {
  if (isAfricanTerritory(a)) return a;
  if (isAfricanTerritory(b)) return b;
  return null;
}

// @req REQ-120
export function buildMercatorRound(
  a: ComparedTerritory,
  b: ComparedTerritory
): BinaryRound | null {
  const footprintA = territoryFootprint(a);
  const footprintB = territoryFootprint(b);
  if (!footprintA || !footprintB) return null;

  const larger = Math.max(footprintA.trueAreaKm2, footprintB.trueAreaKm2);
  const smaller = Math.min(footprintA.trueAreaKm2, footprintB.trueAreaKm2);
  if (larger / smaller < MINIMUM_AREA_RATIO) return null;

  const correctIndex: 0 | 1 =
    footprintA.trueAreaKm2 > footprintB.trueAreaKm2 ? 0 : 1;

  const leadsTo = destination(a, b);

  return {
    kind: "binary",
    template: "larger-area",
    gameId: GAME.id,
    subjectId: a.id,
    comparedIds: [a.id, b.id],
    promptFr: COMPARISON_PROMPT_FR,
    promptEn: MERCATOR_ROUND_EN.prompt,
    options: [
      { labelFr: a.nameFr, labelEn: a.nameEn ?? a.nameFr },
      { labelFr: b.nameFr, labelEn: b.nameEn ?? b.nameFr },
    ],
    correctIndex,
    reveal: {
      textFr: `${areaSentence(a, footprintA)} ${areaSentence(b, footprintB)}`,
      textEn: mercatorRevealEn(
        {
          id: a.id,
          nameEn: a.nameEn ?? a.nameFr,
          trueAreaKm2: footprintA.trueAreaKm2,
          inflation: footprintA.inflation,
        },
        {
          id: b.id,
          nameEn: b.nameEn ?? b.nameFr,
          trueAreaKm2: footprintB.trueAreaKm2,
          inflation: footprintB.inflation,
        }
      ),
      fieldPath: MERCATOR_PROVENANCE_PATH,
      // Both figures are measured off the committed outlines, not read from a
      // fiche. Listing the countries' own sources would credit this claim to
      // documents that never made it, and the fiche's confidence score says
      // nothing about an area this round computed itself.
      //
      // A pair that reaches outside the continent takes its second figure from
      // the sibling `worldCompare` asset. The path stays the African one: it
      // names where the round is anchored, and `revealProvenance` words both
      // assets identically because to a reader they are one thing — the
      // border outlines the atlas publishes.
      sources: [],
      confidence: null,
      ficheHref: leadsTo
        ? getCountryRoute("fr", leadsTo.id)
        : getAxisHubRoute("fr", "atlas"),
      ficheHrefEn: leadsTo
        ? getCountryRoute("en", leadsTo.id)
        : getAxisHubRoute("en", "atlas"),
    },
  };
}
