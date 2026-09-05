/**
 * What a translated record may and may not do to its source (REQ-143 AC1,
 * AC2), as pure rules over two parsed objects.
 *
 * A sidecar is a partial overlay: it carries the leaves it translates and
 * nothing else, so a leaf absent from it is never a finding. A leaf present
 * is judged by its class — an invariant must match the source, a
 * review-required leaf must not reach the reader on machine provenance, a
 * generated string must not be stored at all, and a leaf the model does not
 * declare cannot be classed and is refused. The file layout and the loader
 * wiring belong to the sidecar tickets; this takes objects so it depends on
 * neither.
 */

import { formatSegments, recordLeaves, valueAt } from "./modelLeafPaths";
import {
  classOf,
  glossedInvariantName,
  isGlossedInvariant,
  type StrictModelFile,
} from "./translationClasses";

/** The provenance set the translation record constrains (REQ-142). */
export type TranslationKind = "human" | "machine_reviewed" | "machine";

export type SidecarRule =
  | "invariant-changed"
  | "review-required-at-machine"
  | "generated-stored"
  | "undeclared-path";

export interface SidecarViolation {
  rule: SidecarRule;
  /** Concrete location in the sidecar: `content.appellations.exonyms[0]`. */
  path: string;
  message: string;
}

export interface SidecarCheck {
  model: StrictModelFile;
  source: unknown;
  sidecar: unknown;
  translationKind: TranslationKind;
}

function sameInvariant(
  model: StrictModelFile,
  modelPath: string,
  sourceValue: unknown,
  sidecarValue: unknown
): boolean {
  if (
    isGlossedInvariant(model, modelPath) &&
    typeof sourceValue === "string" &&
    typeof sidecarValue === "string"
  ) {
    return (
      glossedInvariantName(sourceValue) === glossedInvariantName(sidecarValue)
    );
  }
  return JSON.stringify(sourceValue) === JSON.stringify(sidecarValue);
}

/** Every rule the sidecar breaks; an empty list is what lets it publish. */
// @req REQ-143
export function sidecarViolations({
  model,
  source,
  sidecar,
  translationKind,
}: SidecarCheck): SidecarViolation[] {
  const violations: SidecarViolation[] = [];

  for (const leaf of recordLeaves(sidecar)) {
    const path = formatSegments(leaf.segments);
    const cls = classOf(model, leaf.modelPath);

    switch (cls) {
      case undefined:
        violations.push({
          rule: "undeclared-path",
          path,
          message: `${model} declares no class for ${leaf.modelPath}`,
        });
        break;
      case "invariant": {
        const sourceValue = valueAt(source, leaf.segments);
        if (!sameInvariant(model, leaf.modelPath, sourceValue, leaf.value)) {
          violations.push({
            rule: "invariant-changed",
            path,
            message: `${leaf.modelPath} is carried over verbatim; the translation changed it`,
          });
        }
        break;
      }
      case "review_required":
        if (translationKind === "machine") {
          violations.push({
            rule: "review-required-at-machine",
            path,
            message: `${leaf.modelPath} is about the meaning of a word and is not published until a human has reviewed it`,
          });
        }
        break;
      case "generated":
        violations.push({
          rule: "generated-stored",
          path,
          message: `${leaf.modelPath} is authored in code per locale, never stored as translated data`,
        });
        break;
      case "translatable":
        break;
    }
  }

  return violations;
}
