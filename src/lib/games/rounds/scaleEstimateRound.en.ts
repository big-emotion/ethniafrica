import { inflationEn, millionsKm2En, ratioEn } from "@/lib/games/format.en";
import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

/**
 * The English wording of « De combien vous êtes-vous trompé ? » — the sidecar
 * of `scaleEstimateRound.ts`, keyed by the same `worldCompare` shape ids
 * (REQ-145).
 *
 * The French subjects carry a verb agreement (« tient-il », « tiennent-ils »)
 * because French will not assemble a stem from a bare name. English needs no
 * such thing — "does the contiguous United States fit" is one construction
 * for all six — so the subject is all a shape stores here.
 *
 * As in `mercatorRound.en.ts`, the figures are handed in rather than
 * measured: the French builder measures, this module words.
 *
 * Agent-authored under DEC-048, hence `machine`.
 */
export interface EstimateSubjectEn {
  /** Lowercase where an article leads; the reveal raises it at a sentence start. */
  subjectEn: string;
  provenance: Extract<TranslationKind, "machine">;
}

const machine = (subjectEn: string): EstimateSubjectEn => ({
  subjectEn,
  provenance: "machine",
});

// @req REQ-145
export const ESTIMATE_SUBJECT_EN: Record<string, EstimateSubjectEn> = {
  BRA: machine("Brazil"),
  CHN: machine("China"),
  EUW: machine("Western Europe"),
  GRL: machine("Greenland"),
  IND: machine("India"),
  USA: machine("the contiguous United States"),
};

// @req REQ-145
export const SCALE_ESTIMATE_ROUND_EN = {
  unitEn: "times",
  provenance: "machine" as Extract<TranslationKind, "machine">,
};

// @req REQ-145
export function scaleEstimatePromptEn(shapeId: string): string | null {
  const subject = ESTIMATE_SUBJECT_EN[shapeId];
  if (!subject) return null;
  return `How many times does ${subject.subjectEn} fit inside Africa?`;
}

/** What the French builder measured for one round, before it worded it. */
export interface ScaleEstimateMeasurement {
  shapeId: string;
  ratio: number;
  shapeAreaKm2: number;
  africaAreaKm2: number;
  inflation: number;
}

function capitalised(sentenceStart: string): string {
  return sentenceStart.charAt(0).toUpperCase() + sentenceStart.slice(1);
}

// @req REQ-145
export function scaleEstimateRevealEn({
  shapeId,
  ratio,
  shapeAreaKm2,
  africaAreaKm2,
  inflation,
}: ScaleEstimateMeasurement): string | null {
  const subject = ESTIMATE_SUBJECT_EN[shapeId];
  if (!subject) return null;
  return `${ratioEn(ratio)} times. ${capitalised(subject.subjectEn)} covers ${millionsKm2En(shapeAreaKm2)}, Africa ${millionsKm2En(africaAreaKm2)}. On a flat map the projection enlarges it ${inflationEn(inflation)} times — that is where the gap with your estimate comes from.`;
}
