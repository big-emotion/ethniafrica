import { describe, expect, it } from "vitest";
import {
  contributionSchema,
  getContributionSourceCitations,
} from "@/lib/validations/contribution";

const baseContribution = {
  type: "new_people" as const,
  proposed_payload: {
    sources: [{ url: "https://www.unesco.org/en/culture" }],
  },
};

/**
 * These three used to be refusals. Under the source doctrine no citation is
 * refused — it is tiered, and a weak tier lowers the fiche's confidence
 * instead of silencing the claim. The inversion is kept in the suite so the
 * behaviour change stays visible rather than disappearing with the old tests.
 */
describe("contributionSchema", () => {
  // @req REQ-092
  it("accepts a discovery-surface citation and tiers it unverified", () => {
    const payload = {
      sources: [{ url: "https://fr.wikipedia.org/wiki/Yoruba" }],
    };

    expect(
      contributionSchema.safeParse({
        ...baseContribution,
        proposed_payload: payload,
      }).success
    ).toBe(true);
    expect(getContributionSourceCitations(payload)).toEqual([
      expect.objectContaining({ tier: "unverified", sourceKind: "discovery" }),
    ]);
  });

  // @req REQ-092
  it("accepts an AI-generated citation, keeping provenance off the tier axis", () => {
    const payload = {
      sources: [{ url: "https://chatgpt.com/share/example" }],
    };

    expect(
      contributionSchema.safeParse({
        ...baseContribution,
        proposed_payload: payload,
      }).success
    ).toBe(true);
    expect(getContributionSourceCitations(payload)).toEqual([
      expect.objectContaining({
        tier: "unverified",
        sourceKind: "ai_generated",
      }),
    ]);
  });

  // @req REQ-092
  it("accepts an off-catalogue citation as unverified", () => {
    const payload = {
      sources: [{ url: "https://archives.example.org/yoruba" }],
    };

    expect(
      contributionSchema.safeParse({
        ...baseContribution,
        proposed_payload: payload,
      }).success
    ).toBe(true);
    expect(getContributionSourceCitations(payload)).toEqual([
      expect.objectContaining({
        tier: "unverified",
        path: ["sources", 0, "url"],
      }),
    ]);
  });

  // @req REQ-092
  it("tiers a catalogued authority as official", () => {
    expect(
      getContributionSourceCitations(baseContribution.proposed_payload)
    ).toEqual([
      expect.objectContaining({
        url: "https://www.unesco.org/en/culture",
        tier: "official",
        sourceKind: "intergovernmental",
      }),
    ]);
  });
});
