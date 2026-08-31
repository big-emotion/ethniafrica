import { describe, expect, it } from "vitest";

import {
  buildCoverageByFamily,
  selectApprovedCandidates,
} from "../lib/clanNameReview";
import type {
  ClanNameCandidate,
  LoadedPeopleFiche,
} from "../lib/clanNameTypes";

function candidate(
  overrides: Partial<ClanNameCandidate> = {}
): ClanNameCandidate {
  return {
    candidateId: "CANDIDATE_1",
    name: "Diallo",
    normalizedName: "diallo",
    sourceFicheId: "PPL_TEST",
    linguisticFamilyId: "FLG_TEST",
    sourcePath: "content.organization.clanOrganization",
    verbatimPassage: "Le clan Diallo est attesté.",
    sourceCandidates: [],
    inheritedTier: "official",
    sourceKind: "institutional",
    tierResolution: "single_source",
    reviewFlags: [],
    reviewStatus: "approved",
    ...overrides,
  };
}

describe("buildCoverageByFamily", () => {
  // @req REQ-133
  it("counts unequal occurrences and distinct normalized names in family-id order", () => {
    const fiches: LoadedPeopleFiche[] = [
      { id: "PPL_3", languageFamilyId: "FLG_ZULU", content: {} },
      { id: "PPL_1", languageFamilyId: "FLG_ALPHA", content: {} },
      { id: "PPL_2", languageFamilyId: "FLG_ALPHA", content: {} },
    ];
    const candidates = [
      candidate({
        candidateId: "CANDIDATE_3",
        linguisticFamilyId: "FLG_ZULU",
        normalizedName: "sylla",
      }),
      candidate({
        candidateId: "CANDIDATE_1",
        linguisticFamilyId: "FLG_ALPHA",
        normalizedName: "diallo",
      }),
      candidate({
        candidateId: "CANDIDATE_2",
        linguisticFamilyId: "FLG_ALPHA",
        normalizedName: "diallo",
      }),
      candidate({
        candidateId: "CANDIDATE_4",
        linguisticFamilyId: "FLG_ALPHA",
        normalizedName: "barry",
      }),
    ];

    expect(buildCoverageByFamily(fiches, candidates)).toEqual([
      {
        linguisticFamilyId: "FLG_ALPHA",
        fichesScanned: 2,
        candidateOccurrences: 3,
        distinctNames: 2,
      },
      {
        linguisticFamilyId: "FLG_ZULU",
        fichesScanned: 1,
        candidateOccurrences: 1,
        distinctNames: 1,
      },
    ]);
  });

  // @req REQ-133
  it("includes scanned families that have zero candidates", () => {
    const fiches: LoadedPeopleFiche[] = [
      { id: "PPL_B", languageFamilyId: "FLG_BETA", content: {} },
      { id: "PPL_A", languageFamilyId: "FLG_ALPHA", content: {} },
    ];

    expect(buildCoverageByFamily(fiches, [])).toEqual([
      {
        linguisticFamilyId: "FLG_ALPHA",
        fichesScanned: 1,
        candidateOccurrences: 0,
        distinctNames: 0,
      },
      {
        linguisticFamilyId: "FLG_BETA",
        fichesScanned: 1,
        candidateOccurrences: 0,
        distinctNames: 0,
      },
    ]);
  });
});

describe("selectApprovedCandidates", () => {
  // @req REQ-133
  it("keeps only approved, tier-resolved candidates without unresolved-source flags", () => {
    const accepted = candidate({ reviewFlags: ["manually_verified"] });
    const unreviewed = candidate({
      candidateId: "CANDIDATE_UNREVIEWED",
      reviewStatus: "unreviewed",
    });
    const rejected = candidate({
      candidateId: "CANDIDATE_REJECTED",
      reviewStatus: "rejected",
    });
    const missingTier = candidate({
      candidateId: "CANDIDATE_MISSING_TIER",
      inheritedTier: null,
    });
    const unresolvedTier = candidate({
      candidateId: "CANDIDATE_UNRESOLVED_TIER",
      reviewFlags: ["source_tier_unresolved"],
    });
    const sourceReviewRequired = candidate({
      candidateId: "CANDIDATE_SOURCE_REVIEW",
      reviewFlags: ["source_review_required"],
    });

    expect(
      selectApprovedCandidates([
        unreviewed,
        accepted,
        rejected,
        missingTier,
        unresolvedTier,
        sourceReviewRequired,
      ])
    ).toEqual([accepted]);
  });
});
