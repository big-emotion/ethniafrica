import type { ProseCandidate } from "./peopleProseCandidates";

export type { FicheSource, LoadedPeopleFiche } from "./peopleProseCandidates";

export interface FamilyCoverage {
  linguisticFamilyId: string;
  fichesScanned: number;
  candidateOccurrences: number;
  distinctNames: number;
}

export type ClanNameCandidate = ProseCandidate;

export interface ClanNameReviewArtifact {
  schemaVersion: 1;
  candidates: ClanNameCandidate[];
  coverageByFamily: FamilyCoverage[];
}
