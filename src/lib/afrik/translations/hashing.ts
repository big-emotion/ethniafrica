/**
 * What a translation is a translation *of*, as hashes (REQ-146).
 *
 * A record's `sourceHash` covers only the leaves a translator touches — the
 * translatable and review-required prose, and the gloss of a glossed
 * invariant. A curator correcting an ISO code or a source URL changes
 * nothing the English reader was shown, so it must not mark the translation
 * stale; a curator rewriting one paragraph must, and `fieldHashes` is what
 * names that paragraph rather than the whole fiche (AC2: drift is named, not
 * overwritten).
 */

import { createHash } from "node:crypto";

import { glossedInvariantName } from "@/lib/i18n/translationClasses";
import { formatSegments, recordLeaves } from "@/lib/i18n/modelLeafPaths";
import type { LeafClassifier, LeafTreatment } from "./leafClassifier";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Sorted keys at every depth, so key order never changes a hash. */
// @req REQ-146
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;

  const canonical: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    canonical[key] = canonicalize(value[key]);
  }
  return canonical;
}

// @req REQ-146
export function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export interface TranslatableLeaf {
  /** Concrete location: `content.appellations.exonyms[0]`. */
  path: string;
  /** The model path the class table knows: `content.appellations.exonyms[]`. */
  modelPath: string;
  class: Extract<
    LeafTreatment,
    "translatable" | "review_required" | "glossed_invariant"
  >;
  text: string;
}

/** The parentheticals of a glossed value — the only part of it that translates. */
function glossOf(value: string): string {
  return value.replace(glossedInvariantName(value), "").trim();
}

/**
 * Every string leaf a translator is handed, in document order. A null or
 * empty leaf is carried verbatim by the sidecar and never listed here.
 */
// @req REQ-146
export function translatableLeaves(
  record: unknown,
  classify: LeafClassifier
): TranslatableLeaf[] {
  const leaves: TranslatableLeaf[] = [];
  for (const leaf of recordLeaves(record)) {
    if (typeof leaf.value !== "string" || leaf.value.trim() === "") continue;
    const treatment = classify(leaf.modelPath);
    if (treatment === "translatable" || treatment === "review_required") {
      leaves.push({
        path: formatSegments(leaf.segments),
        modelPath: leaf.modelPath,
        class: treatment,
        text: leaf.value,
      });
    } else if (treatment === "glossed_invariant" && glossOf(leaf.value)) {
      leaves.push({
        path: formatSegments(leaf.segments),
        modelPath: leaf.modelPath,
        class: treatment,
        text: leaf.value,
      });
    }
  }
  return leaves;
}

/**
 * Sixteen hex characters per leaf: a change detector keyed by path, not an
 * identity, so the prefix is enough and keeps an 800-leaf sidecar readable.
 */
// @req REQ-146
export function fieldHashes(
  record: unknown,
  classify: LeafClassifier
): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const leaf of translatableLeaves(record, classify)) {
    const hashed =
      leaf.class === "glossed_invariant" ? glossOf(leaf.text) : leaf.text;
    hashes[leaf.path] = sha256(hashed).slice(0, 16);
  }
  return hashes;
}

/** One digest over the field hashes, so a record can say "unchanged" in one comparison. */
// @req REQ-146
export function sourceHash(record: unknown, classify: LeafClassifier): string {
  return sha256(canonicalize(fieldHashes(record, classify)));
}

/**
 * The concrete paths whose source text changed since `previous` was taken,
 * judged only on the leaves `record` carries: a leaf the served shape drops
 * (the language aggregate flattens its content) is not evidence either way.
 * Drift is named field by field so a translation is repaired, not redone
 * (REQ-146 AC2).
 */
// @req REQ-146
export function driftedPaths(
  record: unknown,
  previous: Record<string, string>,
  classify: LeafClassifier
): string[] {
  const current = fieldHashes(record, classify);
  return Object.keys(current)
    .filter((path) => path in previous && previous[path] !== current[path])
    .sort();
}
