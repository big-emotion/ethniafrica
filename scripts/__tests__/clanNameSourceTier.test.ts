import { describe, expect, it } from "vitest";

import { resolveClanNameSourceTier } from "../lib/clanNameSourceTier";
import type { FicheSource } from "../lib/clanNameTypes";
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

describe("resolveClanNameSourceTier", () => {
  // @req REQ-133
  it("keeps every fiche source unresolved when no passage binding exists", () => {
    expect(resolveClanNameSourceTier(ficheSources)).toEqual({
      sourceCandidates: ficheSources,
      inheritedTier: null,
      sourceKind: null,
      tierResolution: "review_required",
      reviewFlags: ["source_tier_unresolved", "source_review_required"],
    });
  });

  // @req REQ-133
  it("treats an empty passage binding as absent and keeps every fiche source", () => {
    expect(resolveClanNameSourceTier(ficheSources, [])).toEqual({
      sourceCandidates: ficheSources,
      inheritedTier: null,
      sourceKind: null,
      tierResolution: "review_required",
      reviewFlags: ["source_tier_unresolved", "source_review_required"],
    });
  });

  // @req REQ-133
  it.each<SourceTier>(["official", "referenced", "unverified"])(
    "preserves an explicitly bound %s tier verbatim",
    (tier) => {
      const boundSource: FicheSource = {
        title: `${tier} source`,
        tier,
        source_kind: "academic",
      };

      expect(resolveClanNameSourceTier(ficheSources, [boundSource])).toEqual({
        sourceCandidates: [boundSource],
        inheritedTier: tier,
        sourceKind: "academic",
        tierResolution: "single_source",
        reviewFlags: [],
      });
    }
  );

  // @req REQ-133
  it("inherits a tier and source kind only from a uniform explicit binding", () => {
    const boundSources: FicheSource[] = [
      {
        title: "Archive volume one",
        tier: "referenced",
        source_kind: "archive",
      },
      {
        title: "Archive volume two",
        tier: "referenced",
        source_kind: "archive",
      },
    ];

    expect(resolveClanNameSourceTier(ficheSources, boundSources)).toEqual({
      sourceCandidates: boundSources,
      inheritedTier: "referenced",
      sourceKind: "archive",
      tierResolution: "uniform_bound_sources",
      reviewFlags: [],
    });
  });

  // @req REQ-133
  it("requires review for an explicit binding with mixed tiers", () => {
    const boundSources: FicheSource[] = [
      {
        title: "Government register",
        tier: "official",
        source_kind: "government",
      },
      {
        title: "Academic monograph",
        tier: "referenced",
        source_kind: "academic",
      },
    ];

    expect(resolveClanNameSourceTier(ficheSources, boundSources)).toEqual({
      sourceCandidates: boundSources,
      inheritedTier: null,
      sourceKind: null,
      tierResolution: "review_required",
      reviewFlags: ["source_tier_unresolved", "source_review_required"],
    });
  });

  // @req REQ-133
  it.each([undefined, null, "needs_review"])(
    "requires review for a missing or pending tier: %s",
    (tier) => {
      const boundSource: FicheSource = {
        title: "Pending source",
        tier,
        source_kind: "academic",
      };

      expect(resolveClanNameSourceTier(ficheSources, [boundSource])).toEqual({
        sourceCandidates: [boundSource],
        inheritedTier: null,
        sourceKind: null,
        tierResolution: "review_required",
        reviewFlags: ["source_tier_unresolved", "source_review_required"],
      });
    }
  );

  // @req REQ-133
  it("requires review when an explicit binding contains mixed source kinds", () => {
    const boundSources: FicheSource[] = [
      {
        title: "Academic article",
        tier: "referenced",
        source_kind: "academic",
      },
      {
        title: "Community archive",
        tier: "referenced",
        source_kind: "community",
      },
    ];

    expect(resolveClanNameSourceTier(ficheSources, boundSources)).toEqual({
      sourceCandidates: boundSources,
      inheritedTier: null,
      sourceKind: null,
      tierResolution: "review_required",
      reviewFlags: ["source_tier_unresolved", "source_review_required"],
    });
  });

  // @req REQ-133
  it("requires review for a Wikipedia-only explicit binding", () => {
    const boundSource: FicheSource = {
      title: "Wikipedia — Test people",
      url: "https://en.wikipedia.org/wiki/Test_people",
      tier: "referenced",
      source_kind: "discovery",
    };

    expect(resolveClanNameSourceTier(ficheSources, [boundSource])).toEqual({
      sourceCandidates: [boundSource],
      inheritedTier: null,
      sourceKind: null,
      tierResolution: "review_required",
      reviewFlags: ["source_tier_unresolved", "source_review_required"],
    });
  });
});
