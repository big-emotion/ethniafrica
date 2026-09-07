import { englishNumber, inflationEn } from "@/lib/games/format.en";
import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

/**
 * The English wording of « La taille qu'on vous a cachée » — the sidecar of
 * `mercatorRound.ts` (REQ-145).
 *
 * The French builder measures and words in one pass. This module words only:
 * the areas and inflations are the ones `buildMercatorRound` measured off the
 * committed outlines, handed over as a footprint, so the English reveal can
 * never state a figure the French one did not. The wiring PR is where the
 * builder learns to pick a locale; until then this is prose with a typed
 * hole for the measurement.
 *
 * Agent-authored under DEC-048, hence `machine`.
 */
export interface CountryFootprintEn {
  /**
   * Not a `CountryId`: a comparison may now hold a `worldCompare` silhouette,
   * whose keys are the asset's own — `EUW` is a dissolved Western Europe with
   * no country code.
   */
  id: string;
  /** The territory's English name — a corpus field, not something this module words. */
  nameEn: string;
  trueAreaKm2: number;
  /** Mercator's factor over the true area, as `mercatorInflation` measures it. */
  inflation: number;
}

/**
 * The stem, no longer the registry's `promptEn`: that field became the game's
 * standing thesis when a second question shipped, and a round has to word the
 * question it actually asks.
 */
// @req REQ-145
export const MERCATOR_ROUND_EN = {
  prompt: "Which of these two countries covers the larger area?",
  provenance: "machine" as Extract<TranslationKind, "machine">,
};

/** One sentence per country, verb-first as in French so no agreement is needed. */
function areaSentence(country: CountryFootprintEn): string {
  return `${country.nameEn}: ${englishNumber.format(Math.round(country.trueAreaKm2))} km², which the Mercator projection enlarges ${inflationEn(country.inflation)} times.`;
}

// @req REQ-145
export function mercatorRevealEn(
  a: CountryFootprintEn,
  b: CountryFootprintEn
): string {
  return `${areaSentence(a)} ${areaSentence(b)}`;
}
