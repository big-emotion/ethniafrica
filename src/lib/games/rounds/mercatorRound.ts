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
 * Below this the two countries are indistinguishable at the corpus's own
 * precision, and asking would be a coin toss dressed as a question.
 *
 * Exported because the Jouer hub's scene advertises this game and must not
 * assert a gap the game itself would refuse to ask about. One threshold, so
 * the shop window and the shop cannot disagree.
 */
// @req REQ-120
export const MINIMUM_AREA_RATIO = 1.02;

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
 * Whether the projection actively misranks this pair: the territory that truly
 * covers more ground is the one drawn smaller. These are the pairs the game
 * wants, so a caller can rank candidate pairs before building a round.
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

  return larger.drawnAreaKm2 < smaller.drawnAreaKm2;
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
