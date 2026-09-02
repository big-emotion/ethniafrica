import { describe, expect, it } from "vitest";
import { getContributionSourceCitations } from "@/lib/validations/contribution";

/**
 * These three used to be refusals. Under the source doctrine no citation is
 * refused — it is tiered, and a weak tier lowers the fiche's confidence
 * instead of silencing the claim. The inversion is kept in the suite so the
 * behaviour change stays visible rather than disappearing with the old tests.
 *
 * They used to assert acceptance by round-tripping through `contributionSchema`,
 * which validated the body of the retired `POST /api/contributions`. A
 * contribution is now a flag and is validated by the flags handler, so what is
 * left here is the part these tests were always about: the tier a citation
 * earns.
 */
describe("getContributionSourceCitations", () => {
  // @req REQ-092
  it("tiers a discovery-surface citation unverified rather than refusing it", () => {
    const payload = {
      sources: [{ url: "https://fr.wikipedia.org/wiki/Yoruba" }],
    };

    expect(getContributionSourceCitations(payload)).toEqual([
      expect.objectContaining({ tier: "unverified", sourceKind: "discovery" }),
    ]);
  });

  // @req REQ-092
  it("keeps AI provenance off the tier axis", () => {
    const payload = {
      sources: [{ url: "https://chatgpt.com/share/example" }],
    };

    expect(getContributionSourceCitations(payload)).toEqual([
      expect.objectContaining({
        tier: "unverified",
        sourceKind: "ai_generated",
      }),
    ]);
  });

  // @req REQ-092
  it("tiers an off-catalogue citation unverified and records where it sits", () => {
    const payload = {
      sources: [{ url: "https://archives.example.org/yoruba" }],
    };

    expect(getContributionSourceCitations(payload)).toEqual([
      expect.objectContaining({
        tier: "unverified",
        path: ["sources", 0, "url"],
      }),
    ]);
  });

  // @req REQ-092
  it("tiers a catalogued authority as official", () => {
    const payload = {
      sources: [{ url: "https://www.unesco.org/en/culture" }],
    };

    expect(getContributionSourceCitations(payload)).toEqual([
      expect.objectContaining({
        url: "https://www.unesco.org/en/culture",
        tier: "official",
        sourceKind: "intergovernmental",
      }),
    ]);
  });
});
