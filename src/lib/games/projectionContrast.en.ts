import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

/**
 * English legend labels for the two shapes the Jouer hub argues with — the
 * sidecar of `MERCATOR_CONTRAST_PAIR` in `projectionContrast.ts`, keyed by
 * the shape ids the pair names (REQ-145).
 *
 * The articled form is stored, not derived, for the reason the French one
 * is: "Greenland" takes no article and "the DR Congo" does, and no rule
 * recovers which from the asset's name. Lowercase where an article leads,
 * because the scene raises the first letter at a sentence start.
 *
 * Agent-authored under DEC-048, hence `machine`.
 */
export interface ContrastShapeLabelEn {
  labelEn: string;
  articledEn: string;
  provenance: Extract<TranslationKind, "machine">;
}

// @req REQ-145
export const CONTRAST_SHAPE_LABELS_EN: Record<string, ContrastShapeLabelEn> = {
  GRL: { labelEn: "Greenland", articledEn: "Greenland", provenance: "machine" },
  COD: {
    labelEn: "DR Congo",
    articledEn: "the DR Congo",
    provenance: "machine",
  },
};
