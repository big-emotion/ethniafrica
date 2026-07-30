import { describe, expect, it } from "vitest";
import {
  contributionSchema,
  getContributionSourcePolicyIssues,
} from "@/lib/validations/contribution";

const baseContribution = {
  type: "new_people" as const,
  proposed_payload: {
    sources: [{ url: "https://www.unesco.org/en/culture" }],
  },
};

describe("contributionSchema", () => {
  // @req REQ-092
  it("rejects discovery-only citations", () => {
    const result = contributionSchema.safeParse({
      ...baseContribution,
      proposed_payload: {
        sources: [{ url: "https://fr.wikipedia.org/wiki/Yoruba" }],
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["proposed_payload", "sources", 0, "url"],
          message: expect.stringContaining("discovery-only"),
        }),
      ])
    );
  });

  // @req REQ-092
  it("rejects prohibited citations", () => {
    const result = contributionSchema.safeParse({
      ...baseContribution,
      proposed_payload: {
        sources: [{ url: "https://chatgpt.com/share/example" }],
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["proposed_payload", "sources", 0, "url"],
          message: expect.stringContaining("prohibited"),
        }),
      ])
    );
  });

  // @req REQ-092
  it("keeps unknown citations for human review", () => {
    const contribution = {
      ...baseContribution,
      proposed_payload: {
        sources: [{ url: "https://archives.example.org/yoruba" }],
      },
    };

    expect(contributionSchema.safeParse(contribution).success).toBe(true);
    expect(
      getContributionSourcePolicyIssues(contribution.proposed_payload)
    ).toEqual([
      expect.objectContaining({
        admission: "review_required",
        path: ["sources", 0, "url"],
      }),
    ]);
  });
});
