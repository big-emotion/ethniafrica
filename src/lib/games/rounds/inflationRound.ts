import type { BinaryRound } from "@/lib/games/gameKinds";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { inflationFr, latitudeFr } from "@/lib/games/format";
import { MERCATOR_PROVENANCE_PATH } from "@/lib/games/rounds/mercatorRound";
import {
  documentedHalf,
  territoryFootprint,
  type ComparedTerritory,
  type TerritoryFootprint,
} from "@/lib/games/territory";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { getCountryRoute } from "@/lib/routing";
import {
  INFLATION_ROUND_EN,
  inflationRevealEn,
} from "@/lib/games/rounds/inflationRound.en";

/**
 * « Lequel des deux Mercator agrandit-il le plus ? » — the mechanism, asked
 * rather than only stated (REQ-120, games charter §13).
 *
 * The page spent its first year asserting in every reveal that the projection
 * inflates with distance from the equator, and never once asking it. That cost
 * more than a missed lesson. `mercatorMisleads` only accepts a pair whose drawn
 * ranking is *inverted*, which needs two territories of near-identical true
 * area, and `MINIMUM_AREA_RATIO` then throws out the near-identical: sixteen
 * intra-African pairs survive both filters, twelve are reachable, and a session
 * asks for eight. The bank was a quarter of a session away from repeating
 * itself, and no amount of curation could grow it — the filter, not the corpus,
 * was the ceiling.
 *
 * Asking about the factor instead of about the ground lifts that ceiling
 * outright: any two territories at different latitudes make a round, which is
 * 297 pairs across the fifty-eight African outlines at the threshold below.
 * Nothing new is loaded to get them.
 *
 * **African outlines only, on purpose.** Greenland against Kenya is 14,3
 * against 1,0 — a question whose answer is visible from the shape of the
 * options, which is the eyesight the kill test refuses. The comparison round
 * is where a silhouette from outside the continent earns its place; this one
 * is about reading a map, and inside Africa the reader has to actually know
 * where the two countries sit.
 */

const GAME = getGameBySlug("mercator");

/**
 * How far apart two factors must be before the round is worth asking.
 *
 * At 1,2 the pair is Morocco against Kenya — 1,33 against 1,00 — and a reader
 * who knows roughly where both sit can reason it out. Below that the answer
 * turns on a few degrees of latitude nobody carries in their head, which is
 * the coin toss FR65/FR66 refuse: 602 African pairs clear 1,1, and 297 clear
 * this. The scarce resource here is not pairs, so the threshold is set where
 * the question stays answerable rather than where the bank stays large.
 */
// @req REQ-120
export const MINIMUM_INFLATION_RATIO = 1.2;

/**
 * The stem. Declared here rather than on the registry, which carries the one
 * standing prompt shown above every round: this game now asks three different
 * questions, and only a round knows which of them it is.
 */
// @req REQ-120
export const INFLATION_PROMPT_FR =
  "Sur une carte de Mercator, lequel de ces deux pays est le plus agrandi ?";

/**
 * How many times its true area the flat map draws this territory at, or 1 for
 * one the outlines cannot draw — which pairs with nothing, since a ratio of 1
 * never clears the threshold.
 */
// @req REQ-120
export function mercatorInflationOf(territory: ComparedTerritory): number {
  return territoryFootprint(territory)?.inflation ?? 1;
}

/**
 * Noun-first — « un agrandissement de 1,5 fois » — because the adjective form
 * would have to agree with the country's gender, and « le Kenya agrandi » next
 * to « la Tunisie agrandie » is one bug in every other round.
 */
function factorSentence(
  territory: ComparedTerritory,
  footprint: TerritoryFootprint
): string {
  return `${territory.nameFr}, autour de ${latitudeFr(footprint.latitude)} : un agrandissement de ${inflationFr(footprint.inflation)} fois.`;
}

// @req REQ-120
export function buildInflationRound(
  a: ComparedTerritory,
  b: ComparedTerritory
): BinaryRound | null {
  const footprintA = territoryFootprint(a);
  const footprintB = territoryFootprint(b);
  if (!footprintA || !footprintB) return null;

  const larger = Math.max(footprintA.inflation, footprintB.inflation);
  const smaller = Math.min(footprintA.inflation, footprintB.inflation);
  if (larger / smaller < MINIMUM_INFLATION_RATIO) return null;

  const correctIndex: 0 | 1 =
    footprintA.inflation > footprintB.inflation ? 0 : 1;
  const leadsTo = documentedHalf(a, b);

  return {
    kind: "binary",
    template: "greater-inflation",
    gameId: GAME.id,
    subjectId: a.id,
    comparedIds: [a.id, b.id],
    promptFr: INFLATION_PROMPT_FR,
    promptEn: INFLATION_ROUND_EN.prompt,
    options: [
      { labelFr: a.nameFr, labelEn: a.nameEn ?? a.nameFr },
      { labelFr: b.nameFr, labelEn: b.nameEn ?? b.nameFr },
    ],
    correctIndex,
    reveal: {
      // The rule closes every reveal of this round, and is meant to: a reader
      // who answered wrong has to leave with the mechanism, not with two
      // numbers and the impression that the map is arbitrary.
      textFr: `${factorSentence(a, footprintA)} ${factorSentence(b, footprintB)} Ce n'est pas une question de taille mais de latitude : sur une carte de Mercator, plus un pays est loin de l'équateur, plus il est gonflé.`,
      textEn: inflationRevealEn(
        {
          nameEn: a.nameEn ?? a.nameFr,
          inflation: footprintA.inflation,
          latitude: footprintA.latitude,
        },
        {
          nameEn: b.nameEn ?? b.nameFr,
          inflation: footprintB.inflation,
          latitude: footprintB.latitude,
        }
      ),
      // Measured off the committed outlines, like every round on this page.
      // No fiche is credited because none was read.
      fieldPath: MERCATOR_PROVENANCE_PATH,
      sources: [],
      confidence: null,
      // The African half rather than the answer's fiche. It used to be the
      // answer, on the argument that this round has a subject — the country
      // the projection distorts most — and that it is the one the reader was
      // just surprised by. That held while both options were African. Now
      // that every pair crosses the continent's edge, the answer is the
      // borrowed territory in all but ten of the pairs, and its fiche does not
      // exist: the link was resolving to `/pays/NOR`.
      ficheHref: leadsTo
        ? getCountryRoute("fr", leadsTo.id)
        : getAxisHubRoute("fr", "atlas"),
      ficheHrefEn: leadsTo
        ? getCountryRoute("en", leadsTo.id)
        : getAxisHubRoute("en", "atlas"),
    },
  };
}
