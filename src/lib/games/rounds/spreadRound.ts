import type { GameCountryShare, GamePeopleFixture } from "@/lib/games/corpus";
import type {
  AreaCompareRound,
  CountryId,
  GameAreaShape,
} from "@/lib/games/gameKinds";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { getAdmin0Rings } from "@/lib/atlas/overlays";
import { correctOptionIndex } from "@/lib/games/options";
import { ringArea } from "@/lib/games/sphericalArea";

/**
 * « Où vivent-ils ? » — in which of two countries a people is the more
 * numerous (REQ-120).
 *
 * Ranking is on `population`, never on `percentage`: the corpus sets a
 * percentage in 32 of its 1611 distribution entries, so a percentage-ranked
 * round would silently be a round about the 32.
 */

const GAME = getGameBySlug("repartition");

const frenchNumber = new Intl.NumberFormat("fr-FR");

interface CountryShareShape {
  countryId: CountryId;
  population: number;
  shape: GameAreaShape;
}

/**
 * A zero share is as unanswerable as a missing one, so both drop out — the
 * corpus records "not counted here", not "nobody lives here".
 */
const isCountedShare = (share: GameCountryShare): boolean =>
  typeof share.population === "number" && share.population > 0;

function toShape(
  share: GameCountryShare,
  countryNames?: Record<CountryId, string>
): CountryShareShape | null {
  const rings = getAdmin0Rings(share.country);
  if (!rings || rings.length === 0) return null;

  return {
    countryId: share.country,
    population: share.population,
    shape: {
      labelFr: countryNames?.[share.country] ?? share.country,
      rings,
      areaKm2: rings.reduce((total, ring) => total + ringArea(ring), 0),
      captionFr: `${frenchNumber.format(share.population)} personnes`,
    },
  };
}

// @req REQ-120
export function buildSpreadRound(
  people: GamePeopleFixture,
  countryNames?: Record<CountryId, string>
): AreaCompareRound | null {
  const counted = people.distributionByCountry
    .filter(isCountedShare)
    .sort((left, right) => right.population - left.population);

  if (counted.length < 2) return null;
  if (counted[0].population === counted[1].population) return null;

  const mostPopulous = toShape(counted[0], countryNames);
  const runnerUp = toShape(counted[1], countryNames);
  if (!mostPopulous || !runnerUp) return null;

  // Ranking put the answer first; without a slot it would always be first.
  const correctIndex = (correctOptionIndex(people.id, GAME.id) % 2) as 0 | 1;
  const shapes: [GameAreaShape, GameAreaShape] =
    correctIndex === 0
      ? [mostPopulous.shape, runnerUp.shape]
      : [runnerUp.shape, mostPopulous.shape];

  return {
    kind: "areaCompare",
    gameId: GAME.id,
    subjectId: people.id,
    promptFr: GAME.promptFr,
    questionFr: "Dans lequel ce peuple est-il le plus nombreux ?",
    shapes,
    correctIndex,
    reveal: {
      textFr: `${mostPopulous.shape.labelFr} : ${frenchNumber.format(mostPopulous.population)} personnes. ${runnerUp.shape.labelFr} : ${frenchNumber.format(runnerUp.population)} personnes.`,
      fieldPath: "content.demography.distributionByCountry",
    },
  };
}
