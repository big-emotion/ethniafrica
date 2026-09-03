import { classificationLabels } from "@/lib/translations";

/**
 * The field path `enforce_assertion_required` matches on.
 *
 * The trigger (AR3, ETNI-23) refuses any UPDATE that changes
 * `afrik_peoples.classification_status` or the same column on
 * `afrik_language_families` unless a row in `assertions` already covers this
 * exact path for that entity. A typo here would leave the assertion unread,
 * the write still refused, and nothing in the error to say why.
 */
export const CLASSIFICATION_FIELD_PATH = "classification_status";

type ClassificationStatus = keyof typeof classificationLabels;

function isKnownStatus(status: unknown): status is ClassificationStatus {
  return (
    typeof status === "string" &&
    Object.hasOwn(classificationLabels, status as string)
  );
}

/**
 * What the assertion behind a classification says, in the reader's words.
 *
 * `assertions.statement` is published verbatim — `SourceChainSheet` prints it
 * between guillemets — so this is the sentence the badge's tooltip already
 * uses, taken from `translations.ts` rather than written again here. Two
 * reasons, and neither is brevity: a second wording would drift from the one
 * the reader sees on the badge, and anything phrased around the column name
 * would put a JSON field path in front of the public, which the reader-facing
 * register forbids outright.
 *
 * An unknown status returns null rather than a placeholder: minting an
 * assertion whose statement nobody wrote would fabricate provenance, and a
 * fabricated citation is worse than an empty column.
 */
export function classificationStatement(status: unknown): string | null {
  if (!isKnownStatus(status)) {
    return null;
  }
  return classificationLabels[status].tooltip;
}
