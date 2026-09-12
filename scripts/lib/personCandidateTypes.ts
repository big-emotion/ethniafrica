import type { ProseCandidate } from "./peopleProseCandidates";

export type { FicheSource, LoadedPeopleFiche } from "./peopleProseCandidates";

export interface PersonCandidate extends ProseCandidate {
  roleCue: string;
}

export interface PersonCandidateReviewArtifact {
  schemaVersion: 1;
  candidates: PersonCandidate[];
}
