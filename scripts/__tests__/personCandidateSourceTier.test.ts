// @req REQ-126
import { describe, expect, it } from "vitest";

import { resolvePersonSourceTier } from "../lib/personCandidateSourceTier";
import type { FicheSource } from "../lib/personCandidateTypes";
import type { SourceTier } from "../../src/types/sources";

const ficheSources: FicheSource[] = [
  {
    title: "UNESCO record",
    url: "https://www.unesco.org/example",
    tier: "official",
    source_kind: "intergovernmental",
  },
  {
    title: "Academic monograph",
    url: "https://example.org/monograph",
    tier: "referenced",
    source_kind: "academic",
  },
];

describe("resolvePersonSourceTier", () => {
  // @req REQ-126
  it("keeps every fiche source unresolved when no passage binding exists", () => {
    expect(resolvePersonSourceTier(ficheSources)).toEqual({
      sourceCandidates: ficheSources,
      inheritedTier: null,
      sourceKind: null,
      tierResolution: "review_required",
      reviewFlags: ["source_tier_unresolved", "source_review_required"],
    });
  });

  // @req REQ-126
  it.each<SourceTier>(["official", "referenced", "unverified"])(
    "inherits an explicitly bound %s tier verbatim — never ai_generated",
    (tier) => {
      const boundSource: FicheSource = {
        title: `${tier} source`,
        tier,
        source_kind: "academic",
      };

      const resolution = resolvePersonSourceTier(ficheSources, [boundSource]);

      expect(resolution.inheritedTier).toBe(tier);
      expect(resolution.tierResolution).toBe("single_source");
      expect(resolution.reviewFlags).toEqual([]);
    }
  );

  // @req REQ-126
  it("requires review when the only passage-bound source is Wikipedia", () => {
    const wikipediaSource: FicheSource = {
      title: "Wikipedia",
      url: "https://fr.wikipedia.org/wiki/Test",
      tier: "unverified",
    };

    expect(
      resolvePersonSourceTier(ficheSources, [wikipediaSource]).tierResolution
    ).toBe("review_required");
  });

  // @req REQ-126
  it("requires review when passage-bound sources disagree on tier", () => {
    const mismatched: FicheSource[] = [
      { title: "Source A", tier: "official" },
      { title: "Source B", tier: "referenced" },
    ];

    const resolution = resolvePersonSourceTier(ficheSources, mismatched);

    expect(resolution.tierResolution).toBe("review_required");
    expect(resolution.inheritedTier).toBeNull();
  });
});
