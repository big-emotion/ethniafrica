/**
 * How one concrete leaf of a record is treated by the overlay and the hashes.
 *
 * The class table answers "what class is this model path"; the overlay also
 * needs "is this an invariant whose parenthetical gloss translates". Folding
 * the two questions into one function keeps every caller — hashing, overlay,
 * the command, the validator — reading the same answer, and lets a test
 * inject a hand-written classifier instead of the sixteen real tables.
 */

import {
  classOf,
  isGlossedInvariant,
  type StrictModelFile,
  type TranslationClass,
} from "@/lib/i18n/translationClasses";

export type LeafTreatment = TranslationClass | "glossed_invariant";

export type LeafClassifier = (modelPath: string) => LeafTreatment | undefined;

// @req REQ-143
export function classifierFor(model: StrictModelFile): LeafClassifier {
  return (modelPath) =>
    isGlossedInvariant(model, modelPath)
      ? "glossed_invariant"
      : classOf(model, modelPath);
}
