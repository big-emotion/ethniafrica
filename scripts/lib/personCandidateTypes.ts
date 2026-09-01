import type { SourceTier } from "../../src/types/sources";

export interface FicheSource {
  title: string;
  url?: string | null;
  tier?: string | null;
  notes?: string | null;
  source_kind?: string | null;
}

export interface LoadedPeopleFiche {
  id: string;
  languageFamilyId: string;
  content: Record<string, unknown>;
}

export interface PersonCandidate {
  candidateId: string;
  name: string;
  normalizedName: string;
  roleCue: string;
  sourceFicheId: string;
  linguisticFamilyId: string;
  sourcePath: string;
  verbatimPassage: string;
  sourceCandidates: FicheSource[];
  inheritedTier: SourceTier | null;
  sourceKind: string | null;
  tierResolution: "single_source" | "uniform_bound_sources" | "review_required";
  reviewFlags: string[];
  reviewStatus: "unreviewed" | "approved" | "rejected";
}

export interface PersonCandidateReviewArtifact {
  schemaVersion: 1;
  candidates: PersonCandidate[];
}
