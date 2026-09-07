import { englishNumber, inflationEn } from "@/lib/games/format.en";
import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

/**
 * The English wording of the four-way comparison — the sidecar of
 * `largestOfListRound.ts` (REQ-145).
 *
 * Words only, never measures: every figure below is one the French builder
 * already read off the committed outlines and handed over, so the two locales
 * cannot state different areas for the same country.
 *
 * Agent-authored under DEC-048, hence `machine`.
 */
export interface ListedFootprintEn {
  /** The territory's English name — a corpus field, not something this module words. */
  nameEn: string;
  trueAreaKm2: number;
  /** Mercator's factor over the true area, as `mercatorInflation` measures it. */
  inflation: number;
}

// @req REQ-145
export const LARGEST_OF_LIST_ROUND_EN = {
  prompt: "Which of these countries covers the largest area?",
  provenance: "machine" as Extract<TranslationKind, "machine">,
};

/** Verb-first, as in French, so no sentence needs agreement with a country. */
function areaSentence(territory: ListedFootprintEn): string {
  return `${territory.nameEn}: ${englishNumber.format(Math.round(territory.trueAreaKm2))} km², which the Mercator projection enlarges ${inflationEn(territory.inflation)} times.`;
}

// @req REQ-145
export function largestOfListRevealEn(
  territories: ListedFootprintEn[]
): string {
  return territories.map(areaSentence).join(" ");
}
