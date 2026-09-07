/**
 * What a *stored* sidecar may not do to its source — the rules TR-1 in
 * validateAfrikData and the translation command's verification share, so a
 * record the command writes is a record the gate accepts.
 *
 * Two of `sidecarViolations`' findings are not findings here. A
 * review-required leaf translated at machine provenance is stored on
 * purpose: the overlay withholds it from the reader until a human reviews
 * it, and refusing to store it would leave nothing to review. And a leaf the
 * model does not declare is only a finding when the sidecar changed it — the
 * leaf walker reports `vitalityStatus: null` at a path the model knows only
 * as a subtree, and a null carried verbatim is nothing to class.
 */

import {
  sidecarViolations,
  type SidecarViolation,
} from "@/lib/i18n/translationSidecarRules";
import {
  formatSegments,
  recordLeaves,
  valueAt,
} from "@/lib/i18n/modelLeafPaths";
import type { StrictModelFile } from "@/lib/i18n/translationClasses";

// @req REQ-143
// @req REQ-146
export function translationViolations(input: {
  model: StrictModelFile;
  source: unknown;
  sidecar: unknown;
}): SidecarViolation[] {
  const unchanged = new Set(
    recordLeaves(input.sidecar)
      .filter(
        (leaf) =>
          JSON.stringify(leaf.value) ===
          JSON.stringify(valueAt(input.source, leaf.segments))
      )
      .map((leaf) => formatSegments(leaf.segments))
  );

  return sidecarViolations({
    model: input.model,
    source: input.source,
    sidecar: input.sidecar,
    translationKind: "machine",
  }).filter(
    (violation) =>
      violation.rule !== "review-required-at-machine" &&
      !(violation.rule === "undeclared-path" && unchanged.has(violation.path))
  );
}
