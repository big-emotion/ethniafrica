import { englishNumber, inflationEn } from "@/lib/games/format.en";
import { GAME_DEFINITIONS_EN } from "@/lib/games/gameRegistry.en";
import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";
import type { CountryId } from "@/types/afrik";

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
  id: CountryId;
  /** The country's English name — a corpus field, not something this module words. */
  nameEn: string;
  trueAreaKm2: number;
  /** Mercator's factor over the true area, as `mercatorInflation` measures it. */
  inflation: number;
}

// @req REQ-145
export const MERCATOR_ROUND_EN = {
  prompt: GAME_DEFINITIONS_EN.mercator.promptEn,
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
