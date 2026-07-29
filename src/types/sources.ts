export type StructuredSourceKind =
  | "intergovernmental"
  | "government"
  | "official_statistics"
  | "linguistic_reference"
  | "academic"
  | "community"
  | "repository"
  | "archive";

export type EvidenceTier = 1 | 2 | null;

export type AssertionLocatorType = "page" | "folio" | "section" | "timestamp";

export interface StructuredSourceRecord {
  sourceKey: string;
  title: string;
  authors: string[];
  publicationYear: number;
  sourceKind: StructuredSourceKind;
  evidenceTier: EvidenceTier;
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
