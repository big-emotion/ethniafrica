import type {
  ClanNameCandidate,
  FamilyCoverage,
  LoadedPeopleFiche,
} from "./clanNameTypes";

export function buildCoverageByFamily(
  fiches: LoadedPeopleFiche[],
  candidates: ClanNameCandidate[]
): FamilyCoverage[] {
  const ficheCounts = new Map<string, number>();
  const candidateNames = new Map<string, string[]>();

  for (const fiche of fiches) {
    ficheCounts.set(
      fiche.languageFamilyId,
      (ficheCounts.get(fiche.languageFamilyId) ?? 0) + 1
    );
  }

  for (const candidate of candidates) {
    const names = candidateNames.get(candidate.linguisticFamilyId) ?? [];
    names.push(candidate.normalizedName);
    candidateNames.set(candidate.linguisticFamilyId, names);
  }

  const familyIds = new Set([...ficheCounts.keys(), ...candidateNames.keys()]);

  return [...familyIds]
    .sort((left, right) => left.localeCompare(right))
    .map((linguisticFamilyId) => {
      const names = candidateNames.get(linguisticFamilyId) ?? [];
      return {
        linguisticFamilyId,
        fichesScanned: ficheCounts.get(linguisticFamilyId) ?? 0,
        candidateOccurrences: names.length,
        distinctNames: new Set(names).size,
      };
    });
}

export function selectApprovedCandidates(
  candidates: ClanNameCandidate[]
): ClanNameCandidate[] {
  return candidates.filter(
    (candidate) =>
      candidate.reviewStatus === "approved" &&
      candidate.inheritedTier !== null &&
      !candidate.reviewFlags.includes("source_tier_unresolved") &&
      !candidate.reviewFlags.includes("source_review_required")
  );
}
