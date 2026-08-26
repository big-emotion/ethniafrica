import type { GameCountryFixture } from "@/lib/games/corpus";
import type { BinaryRound, Ring } from "@/lib/games/gameKinds";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { getAdmin0Rings } from "@/lib/atlas/overlays";
import { mercatorInflation, ringArea } from "@/lib/games/sphericalArea";

/**
 * « La taille qu'on vous a cachée » — which of two countries truly covers
 * more ground, and how differently Mercator draws them (REQ-120).
 *
 * The corpus holds no area column, so both figures come from the committed
 * admin-0 outlines. That is the source recorded in the reveal, and it is why
 * the outlines' simplification is a property of the game rather than a bug:
 * the round compares magnitudes, it does not survey.
 */

const GAME = getGameBySlug("mercator");

/**
 * Below this the two countries are indistinguishable at the corpus's own
 * precision, and asking would be a coin toss dressed as a question.
 */
const MINIMUM_AREA_RATIO = 1.02;

const frenchNumber = new Intl.NumberFormat("fr-FR");
const frenchFactor = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

interface CountryFootprint {
  trueAreaKm2: number;
  /** Area as Mercator draws it — the reader's mistaken impression, measured. */
  drawnAreaKm2: number;
  inflation: number;
}

/** The mainland: the ring carrying the most points, islands set aside. */
function largestRing(rings: Ring[]): Ring {
  return rings.reduce((largest, ring) =>
    ring.length > largest.length ? ring : largest
  );
}

function footprintOf(country: GameCountryFixture): CountryFootprint | null {
  const rings = getAdmin0Rings(country.id);
  if (!rings || rings.length === 0) return null;

  const trueAreaKm2 = rings.reduce((total, ring) => total + ringArea(ring), 0);
  // Inflation is read on the mainland alone: a distant island would move the
  // centroid to a latitude the country is not mostly at.
  const inflation = mercatorInflation(largestRing(rings));

  return { trueAreaKm2, inflation, drawnAreaKm2: trueAreaKm2 * inflation };
}

/**
 * Whether the projection actively misranks this pair: the country that truly
 * covers more ground is the one drawn smaller. These are the pairs the game
 * wants, so a caller can rank candidate pairs before building a round.
 */
// @req REQ-120
export function mercatorMisleads(
  a: GameCountryFixture,
  b: GameCountryFixture
): boolean {
  const footprintA = footprintOf(a);
  const footprintB = footprintOf(b);
  if (!footprintA || !footprintB) return false;

  const [larger, smaller] =
    footprintA.trueAreaKm2 > footprintB.trueAreaKm2
      ? [footprintA, footprintB]
      : [footprintB, footprintA];

  return larger.drawnAreaKm2 < smaller.drawnAreaKm2;
}

/** Verb-first so the sentence needs no gender agreement with the country. */
function areaSentence(
  country: GameCountryFixture,
  footprint: CountryFootprint
): string {
  return `${country.nameFr} : ${frenchNumber.format(Math.round(footprint.trueAreaKm2))} km², que la projection de Mercator agrandit ${frenchFactor.format(footprint.inflation)} fois.`;
}

// @req REQ-120
export function buildMercatorRound(
  a: GameCountryFixture,
  b: GameCountryFixture
): BinaryRound | null {
  const footprintA = footprintOf(a);
  const footprintB = footprintOf(b);
  if (!footprintA || !footprintB) return null;

  const larger = Math.max(footprintA.trueAreaKm2, footprintB.trueAreaKm2);
  const smaller = Math.min(footprintA.trueAreaKm2, footprintB.trueAreaKm2);
  if (larger / smaller < MINIMUM_AREA_RATIO) return null;

  const correctIndex: 0 | 1 =
    footprintA.trueAreaKm2 > footprintB.trueAreaKm2 ? 0 : 1;

  return {
    kind: "binary",
    gameId: GAME.id,
    subjectId: a.id,
    promptFr: GAME.promptFr,
    options: [{ labelFr: a.nameFr }, { labelFr: b.nameFr }],
    correctIndex,
    reveal: {
      textFr: `${areaSentence(a, footprintA)} ${areaSentence(b, footprintB)}`,
      fieldPath: "lib/atlas/assets/africaAdmin0",
    },
  };
}
