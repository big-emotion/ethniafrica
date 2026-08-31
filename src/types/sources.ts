/**
 * The source vocabulary, declared once.
 *
 * Two orthogonal axes, never collapsed:
 *   - `SourceTier`          — how much authority a citation carries.
 *   - `StructuredSourceKind` — what kind of thing the citation is (provenance).
 *
 * AI-generated text is the worked example: it is not a level of authority but
 * unverified content whose origin matters, so it is
 * `tier: "unverified"` + `sourceKind: "ai_generated"`, and confidence
 * multiplies the two rather than branching on a fused value.
 */

/**
 * Mirrors the `sources_source_kind_check` constraint (migration 031). The
 * vocabulary contract test parses the CHECK and compares it to this list, so
 * the two cannot drift apart again.
 */
// @req REQ-092
export const SOURCE_KINDS = [
  "intergovernmental",
  "government",
  "official_statistics",
  "linguistic_reference",
  "academic",
  "community",
  "repository",
  "archive",
  "discovery",
  "ai_generated",
  "unknown",
] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

/**
 * Kinds that describe a citable work. `discovery` (a lookup surface),
 * `ai_generated` (machine-written text) and `unknown` are provenance markers,
 * not works, so they are excluded from the structured reference model.
 */
export type StructuredSourceKind = Exclude<
  SourceKind,
  "discovery" | "ai_generated" | "unknown"
>;

// @req REQ-092
export const SOURCE_TIERS = ["official", "referenced", "unverified"] as const;

export type SourceTier = (typeof SOURCE_TIERS)[number];

// @req REQ-092
export const SOURCE_TIER_LABELS_FR: Record<SourceTier, string> = {
  official: "Officielle",
  referenced: "Référencée",
  unverified: "Non vérifiée",
};

/**
 * `needs_review` is not a tier and must not be shown as one. Folding it
 * onto "Non vérifiée" — which is what an unlabelled fallback does — states
 * a judgement nobody has made: the doctrine is that every source carries a
 * label, not that every source has been ruled on. It gets its own wording
 * for that reason, and the UI keeps it visually distinct from the three.
 */
// @req REQ-092
export const SOURCE_PENDING_REVIEW_LABEL_FR = "En attente d'examen";

/** The label for anything a fiche's `sources[]` can carry, tier or not. */
// @req REQ-092
export function sourceStandingLabelFr(
  standing: SourceTier | "needs_review"
): string {
  // Anything the vocabulary does not recognise reads as awaiting review, not
  // as blank. strictNullChecks is off in this repo, so an uncovered value
  // resolves to `undefined` and renders as literally nothing — a source with
  // no visible provenance at all, the one outcome the tier policy forbids.
  // Falling back here claims the least rather than the most.
  return SOURCE_TIER_LABELS_FR[standing] ?? SOURCE_PENDING_REVIEW_LABEL_FR;
}

/**
 * Confidence weight per tier, mirrored by `recompute_confidence()` in
 * migration 041. Kept in sync by the source-tier vocabulary contract test.
 */
// @req REQ-092
export const SOURCE_TIER_WEIGHTS: Record<SourceTier, number> = {
  official: 1.0,
  referenced: 0.7,
  unverified: 0.4,
};

/**
 * Applied on top of the tier weight when `sourceKind` is `ai_generated`.
 * 0.4 × 0.5 = 0.2 reproduces the weight the retired fused AI tier carried.
 */
// @req REQ-092
export const AI_PROVENANCE_WEIGHT = 0.5;

// @req REQ-092
export function isSourceTier(value: unknown): value is SourceTier {
  return (
    typeof value === "string" && SOURCE_TIERS.includes(value as SourceTier)
  );
}

/**
 * Coerces an untrusted tier (a DB column, an API payload, a fiche field) to a
 * tier. Anything the vocabulary does not recognise is `unverified`: an
 * unlabelled citation is not authoritative, and nothing is dropped for it.
 */
// @req REQ-092
export function toSourceTier(value: unknown): SourceTier {
  return isSourceTier(value) ? value : "unverified";
}

/**
 * Bridge for the retired numeric axis: fiche `tier: 1 | 2`, and the numeric
 * column migration 041 drops. Kept while the AFRIK corpus still carries
 * numeric tiers; delete it once every fiche has been reclassified.
 */
// @req REQ-092
export function sourceTierFromLegacyNumber(value: unknown): SourceTier {
  if (value === 1 || value === "1") return "official";
  if (value === 2 || value === "2") return "referenced";
  return "unverified";
}

export type AssertionLocatorType = "page" | "folio" | "section" | "timestamp";

export interface StructuredSourceRecord {
  sourceKey: string;
  title: string;
  authors: string[];
  publicationYear: number;
  sourceKind: StructuredSourceKind;
  tier: SourceTier;
  identifiers: Record<string, string>;
  publisher: string | null;
  url: string | null;
}

export interface AssertionSourceReference {
  sourceKey: string;
  locatorType: AssertionLocatorType;
  locatorValue: string;
}

export interface LegacySourceCandidate {
  legacyRawCitation: string;
  reviewStatus: "review_required";
}
