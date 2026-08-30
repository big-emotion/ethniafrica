/**
 * Field-provenance model (REQ-119).
 *
 * A fiche field the corpus does not fill must render as explicitly missing,
 * not be hidden behind an omitted section — but only when the field is one
 * the entity's strict model actually expects. A field absent from the model
 * does not exist, so it is never "missing"; that distinction is what
 * `isStructurallyExpectedField` answers, kept separate from
 * `classifyFieldProvenance` so a caller cannot accidentally flag a spurious
 * gap by skipping the model check.
 */

import modeleLinguistique from "../../public/modele-linguistique.json";
import modelePeuple from "../../public/modele-peuple.json";
import modelePays from "../../public/modele-pays.json";

export type ProvenanceState = "declared" | "derived" | "missing";

/**
 * True when a value — or any leaf nested inside it — carries actual content.
 *
 * An empty string, an empty array, an object whose every leaf is empty: all
 * absent. It lived in the panel composer, which gated a chapter on it; the
 * composer is retired and provenance is the only caller left, which is where
 * it always belonged — "is this field filled" is the provenance question.
 */
// @req REQ-119
export function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some(isPresent);
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(isPresent);
  }
  return true;
}

export interface FieldProvenance {
  state: ProvenanceState;
  /** Names what the value was computed from. Set only when state is "derived". */
  origin?: string;
}

export interface DerivedFieldInput {
  value: unknown;
  origin: string;
}

/**
 * Classifies one field's value: `declared` when the fiche's own source fills
 * it, `derived` when it falls back to a value computed from other records
 * (never overriding a declared value), `missing` when neither carries
 * content.
 */
// @req REQ-119
export function classifyFieldProvenance(
  declaredValue: unknown,
  derived?: DerivedFieldInput
): FieldProvenance {
  if (isPresent(declaredValue)) {
    return { state: "declared" };
  }
  if (derived && isPresent(derived.value)) {
    return { state: "derived", origin: derived.origin };
  }
  return { state: "missing" };
}

export type AfrikEntityKind = "language-family" | "people" | "country";

const MODEL_CONTENT_BY_ENTITY: Record<AfrikEntityKind, unknown> = {
  "language-family": (modeleLinguistique as { content?: unknown }).content,
  people: (modelePeuple as { content?: unknown }).content,
  country: (modelePays as { content?: unknown }).content,
};

function getAtPath(source: unknown, segments: string[]): unknown {
  return segments.reduce<unknown>((cursor, key) => {
    if (
      cursor !== null &&
      typeof cursor === "object" &&
      key in (cursor as Record<string, unknown>)
    ) {
      return (cursor as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

/**
 * True when `fieldPath` (dot-separated, relative to the entity's `content`
 * block — e.g. "generalInfo.branches") names a field declared in
 * `public/modele-*.json` for that entity kind.
 */
// @req REQ-119
export function isStructurallyExpectedField(
  entityKind: AfrikEntityKind,
  fieldPath: string
): boolean {
  const content = MODEL_CONTENT_BY_ENTITY[entityKind];
  const segments = fieldPath.split(".").filter(Boolean);
  return getAtPath(content, segments) !== undefined;
}
