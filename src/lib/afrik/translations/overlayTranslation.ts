/**
 * The additive read path (REQ-142 AC5, REQ-143 AC2).
 *
 * A translation never replaces a record; it is laid over it leaf by leaf,
 * and only over the leaves whose class allows it. Three refusals live here
 * rather than in the loader, because the loader stores what the translator
 * produced and the reader is what the class doctrine protects:
 *
 *   - an invariant keeps the authored value whatever the record says;
 *   - a review-required leaf keeps the French while the record is `machine`
 *     — a claim about a word is never published on machine provenance;
 *   - a glossed invariant takes the translated gloss only if the name before
 *     the parenthesis survived verbatim.
 *
 * The authored object is never mutated: the five services hand their entity
 * to other callers in the same request.
 */

import { logger } from "@/lib/api/logger";
import { glossedInvariantName } from "@/lib/i18n/translationClasses";
import {
  formatSegments,
  recordLeaves,
  valueAt,
} from "@/lib/i18n/modelLeafPaths";
import type { LeafClassifier } from "./leafClassifier";
import type { TranslationRecord } from "./types";

type Segment = string | number;

function assign(target: unknown, segments: readonly Segment[], value: unknown) {
  const parent = valueAt(target, segments.slice(0, -1));
  if (parent === null || typeof parent !== "object") return;
  (parent as Record<string, unknown>)[segments[segments.length - 1] as string] =
    value;
}

// @req REQ-142
// @req REQ-143
export function overlayTranslation<T extends object>(
  authored: T,
  record: TranslationRecord | null,
  classify: LeafClassifier
): T {
  if (!record) return authored;

  const overlaid = structuredClone(authored);
  const undeclared: string[] = [];
  const nameAltered: string[] = [];

  for (const leaf of recordLeaves(record.content)) {
    if (typeof leaf.value !== "string") continue;
    const treatment = classify(leaf.modelPath);
    if (treatment === undefined) {
      undeclared.push(formatSegments(leaf.segments));
      continue;
    }
    // An aggregate may not carry every leaf of the fiche (LanguageDetail
    // flattens its content); a leaf the reader is not shown has nothing to
    // overlay.
    const current = valueAt(overlaid, leaf.segments);
    if (typeof current !== "string") continue;

    switch (treatment) {
      case "translatable":
        assign(overlaid, leaf.segments, leaf.value);
        break;
      case "review_required":
        if (record.translationKind !== "machine") {
          assign(overlaid, leaf.segments, leaf.value);
        }
        break;
      case "glossed_invariant":
        if (
          glossedInvariantName(current) === glossedInvariantName(leaf.value)
        ) {
          assign(overlaid, leaf.segments, leaf.value);
        } else {
          nameAltered.push(formatSegments(leaf.segments));
        }
        break;
      case "invariant":
      case "generated":
        break;
    }
  }

  if (undeclared.length > 0 || nameAltered.length > 0) {
    logger.warn("Translation record carries leaves the overlay refused", {
      entityType: record.entityType,
      entityId: record.entityId,
      lang: record.lang,
      undeclared,
      nameAltered,
    });
  }

  return overlaid;
}
