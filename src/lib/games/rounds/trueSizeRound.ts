import type { GameCountryFixture } from "@/lib/games/corpus";
import type {
  AreaCompareRound,
  GameAreaShape,
  Ring,
} from "@/lib/games/gameKinds";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { getAdmin0Rings } from "@/lib/atlas/overlays";
import { ringArea } from "@/lib/games/sphericalArea";

/**
 * « Vraie taille » — an African outline laid against a non-African one, both
 * measured on the sphere (REQ-120).
 *
 * The comparison outline is a parameter rather than a lookup so this module
 * depends on no asset but the admin-0 one: the service layer resolves a key
 * against `lib/atlas/assets/worldCompare` and hands the shape in.
 */

const GAME = getGameBySlug("vraie-taille");

/** Same threshold as the Mercator game: below it the question is a coin toss. */
const MINIMUM_AREA_RATIO = 1.02;

const frenchNumber = new Intl.NumberFormat("fr-FR");
const frenchFactor = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** A non-African outline to compare against, already in lon/lat ring form. */
export interface WorldCompareEntry {
  id: string;
  nameFr: string;
  rings: Ring[];
}

const totalArea = (rings: Ring[]): number =>
  rings.reduce((total, ring) => total + ringArea(ring), 0);

// @req REQ-120
export function buildTrueSizeRound(
  country: GameCountryFixture,
  comparison: WorldCompareEntry
): AreaCompareRound | null {
  const countryRings = getAdmin0Rings(country.id);
  if (!countryRings || countryRings.length === 0) return null;
  if (!comparison.rings || comparison.rings.length === 0) return null;

  const countryAreaKm2 = totalArea(countryRings);
  const comparisonAreaKm2 = totalArea(comparison.rings);
  if (countryAreaKm2 === 0 || comparisonAreaKm2 === 0) return null;

  const larger = Math.max(countryAreaKm2, comparisonAreaKm2);
  const smaller = Math.min(countryAreaKm2, comparisonAreaKm2);
  if (larger / smaller < MINIMUM_AREA_RATIO) return null;

  const shapes: [GameAreaShape, GameAreaShape] = [
    {
      labelFr: country.nameFr,
      rings: countryRings,
      areaKm2: countryAreaKm2,
    },
    {
      labelFr: comparison.nameFr,
      rings: comparison.rings,
      areaKm2: comparisonAreaKm2,
    },
  ];

  return {
    kind: "areaCompare",
    gameId: GAME.id,
    subjectId: country.id,
    promptFr: GAME.promptFr,
    questionFr: "Laquelle est la plus grande ?",
    shapes,
    correctIndex: countryAreaKm2 > comparisonAreaKm2 ? 0 : 1,
    // Composed, like the magnitude reveal: it reports two measured areas, and
    // the ratio is the whole lesson, so it is stated rather than left to be
    // eyeballed on a projection that is exactly what misled the reader.
    reveal: {
      textFr: `${country.nameFr} : ${frenchNumber.format(Math.round(countryAreaKm2))} km². ${comparison.nameFr} : ${frenchNumber.format(Math.round(comparisonAreaKm2))} km². La plus grande couvre ${frenchFactor.format(larger / smaller)} fois la plus petite.`,
      fieldPath:
        "lib/atlas/assets/africaAdmin0 + lib/atlas/assets/worldCompare",
    },
  };
}
