// @req REQ-126
import { describe, expect, it } from "vitest";

import { selectPublishableCandidates } from "../lib/personCandidateReview";
import type { PersonCandidate } from "../lib/personCandidateTypes";

function makeCandidate(
  overrides: Partial<PersonCandidate> = {}
): PersonCandidate {
  return {
    candidateId: "PPL_TEST::content.historicalRole::nyabela",
    name: "Nyabela",
    normalizedName: "nyabela",
    roleCue: "roi",
    sourceFicheId: "PPL_TEST",
    linguisticFamilyId: "FLG_TEST",
    sourcePath: "content.historicalRole",
    verbatimPassage: "Capitulation du roi Nyabela le 8 juillet 1883.",
    sourceCandidates: [],
    inheritedTier: "referenced",
    sourceKind: "academic",
    tierResolution: "single_source",
    reviewFlags: [],
    reviewStatus: "approved",
    ...overrides,
  };
}

describe("selectPublishableCandidates", () => {
  // @req REQ-126
  it("blocks an unreviewed candidate from ever being selected for publication", () => {
    const candidate = makeCandidate({ reviewStatus: "unreviewed" });

    expect(selectPublishableCandidates([candidate])).toEqual([]);
  });

  // @req REQ-126
  it("blocks a rejected candidate from being selected for publication", () => {
    const candidate = makeCandidate({ reviewStatus: "rejected" });

    expect(selectPublishableCandidates([candidate])).toEqual([]);
  });

  // @req REQ-126
  it("publishes an approved candidate carrying the source-passage tier, never ai_generated", () => {
    const candidate = makeCandidate({
      reviewStatus: "approved",
      inheritedTier: "official",
    });

    const published = selectPublishableCandidates([candidate]);

    expect(published).toHaveLength(1);
    expect(published[0].inheritedTier).toBe("official");
  });

  // @req REQ-126
  it("keeps an approved candidate blocked while its source tier remains unresolved", () => {
    const candidate = makeCandidate({
      reviewStatus: "approved",
      inheritedTier: null,
      tierResolution: "review_required",
      reviewFlags: ["source_tier_unresolved", "source_review_required"],
    });

    expect(selectPublishableCandidates([candidate])).toEqual([]);
  });
});
