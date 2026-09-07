import { CLASSIFICATION_LABELS } from "@/lib/glossaire/vocabularies";
import type { Language } from "@/types/shared";

/**
 * The `classification_status` labels are glossary vocabulary, not surface
 * copy: the bilingual glossary owns them so the three labels the atlas
 * publishes cannot fork per surface. This module only lends them the shape
 * every other dictionary has, so the parity suite walks them too.
 */
const en = CLASSIFICATION_LABELS.en;

type ClassificationCopy = typeof en;

const fr: ClassificationCopy = CLASSIFICATION_LABELS.fr;

// @req REQ-145
export const classificationCopy: Record<Language, ClassificationCopy> = {
  en,
  fr,
};
