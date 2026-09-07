import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

/**
 * English names for the fixed points the scale facts measure between — the
 * sidecar of `landmarks.ts`, keyed by the same ids (REQ-145).
 *
 * Coordinates stay in the French table: they are measured, not worded, and a
 * second copy would be a second thing to keep in step. Only the name
 * travels, in the form an English reader already owns — Cairo, not Le Caire.
 *
 * Agent-authored under DEC-048, hence `machine` on every entry.
 */
export interface LandmarkNameEn {
  nameEn: string;
  provenance: Extract<TranslationKind, "machine">;
}

const machine = (nameEn: string): LandmarkNameEn => ({
  nameEn,
  provenance: "machine",
});

// @req REQ-145
export const LANDMARK_NAMES_EN: Record<string, LandmarkNameEn> = {
  ALMADIES: machine("the Pointe des Almadies (Senegal)"),
  RAS_HAFUN: machine("Cape Hafun (Somalia)"),
  BLANC: machine("Cape Blanc (Tunisia)"),
  AGULHAS: machine("Cape Agulhas (South Africa)"),

  KINSHASA: machine("Kinshasa"),
  GOMA: machine("Goma"),
  LE_CAIRE: machine("Cairo"),
  LE_CAP: machine("Cape Town"),

  PARIS: machine("Paris"),
  VARSOVIE: machine("Warsaw"),
  PEKIN: machine("Beijing"),
  NEW_YORK: machine("New York"),
};
