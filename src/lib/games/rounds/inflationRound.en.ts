import { inflationEn, latitudeEn } from "@/lib/games/format.en";
import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

/**
 * The English wording of « lequel des deux Mercator agrandit-il le plus ? » —
 * the sidecar of `inflationRound.ts` (REQ-145).
 *
 * Words only, as `mercatorRound.en` does: the factors and latitudes are the
 * ones the French builder measured off the committed outlines and handed over,
 * so the English reveal can never state a figure the French one did not.
 *
 * Agent-authored under DEC-048, hence `machine`.
 */
export interface TerritoryFactorEn {
  /** The territory's English name — a corpus field, not something this module words. */
  nameEn: string;
  /** Mercator's factor over the true area, as `mercatorInflation` measures it. */
  inflation: number;
  /** Centroid latitude in degrees, positive north. */
  latitude: number;
}

// @req REQ-145
export const INFLATION_ROUND_EN = {
  prompt: "On a Mercator map, which of these two countries is enlarged more?",
  provenance: "machine" as Extract<TranslationKind, "machine">,
};

/** Noun-first, mirroring the French, so no sentence has to agree with a gender. */
function factorSentence(territory: TerritoryFactorEn): string {
  return `${territory.nameEn}, at about ${latitudeEn(territory.latitude)}: an enlargement of ${inflationEn(territory.inflation)} times.`;
}

// @req REQ-145
export function inflationRevealEn(
  a: TerritoryFactorEn,
  b: TerritoryFactorEn
): string {
  return `${factorSentence(a)} ${factorSentence(b)} This is not a matter of size but of latitude: on a Mercator map, the further a country lies from the equator, the more it is inflated.`;
}
