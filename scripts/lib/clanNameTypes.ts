export type SourceTier = "official" | "referenced" | "unverified";

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

export interface FamilyCoverage {
  linguisticFamilyId: string;
  fichesScanned: number;
  candidateOccurrences: number;
  distinctNames: number;
}

export interface ClanNameCandidate {
  candidateId: string;
  name: string;
  normalizedName: string;
  sourceFicheId: string;
  linguisticFamilyId: string;
  sourcePath: string;
  verbatimPassage: string;
  sourceCandidates: FicheSource[];
  inheritedTier: SourceTier | null;
  sourceKind: string | null;
  tierResolution: "single_source" | "uniform_fiche_tier" | "review_required";
  reviewFlags: string[];
  reviewStatus: "unreviewed" | "approved" | "rejected";
}

export interface ClanNameReviewArtifact {
  schemaVersion: 1;
  candidates: ClanNameCandidate[];
  coverageByFamily: FamilyCoverage[];
}
