import { describe, expect, it } from "vitest";
import {
  authorizedSourceCatalog,
  evaluateSourceUrl,
  validateAuthorizedSourceCatalog,
} from "@/lib/sources/authorized-source-catalog";

describe("authorized source catalogue", () => {
  // @req REQ-092
  it("contains unique stable keys and coherent tiers", () => {
    expect(validateAuthorizedSourceCatalog(authorizedSourceCatalog)).toEqual(
      []
    );

    expect(
      new Set(authorizedSourceCatalog.entries.map((entry) => entry.key)).size
    ).toBe(authorizedSourceCatalog.entries.length);
  });

  // @req REQ-092
  it("rejects a discovery surface claiming authority", () => {
    const issues = validateAuthorizedSourceCatalog({
      version: 99,
      entries: [
        {
          key: "wikipedia",
          name: "Wikipedia",
          tier: "official",
          sourceKind: "discovery",
          matchDomains: ["wikipedia.org"],
        },
      ],
    });
    expect(issues).toEqual([
      'wikipedia: a discovery source cannot be tiered "official"',
    ]);
  });

  // @req REQ-092
  it.each([
    ["https://www.un.org/development/desa/pd/", "official"],
    ["https://glottolog.org/", "official"],
    ["https://www.jstor.org/stable/123", "referenced"],
    ["https://en.wikipedia.org/wiki/Yoruba_people", "unverified"],
    ["https://www.worldcat.org/title/example", "unverified"],
    ["https://chat.openai.com/", "unverified"],
  ])("tiers %s as %s", (url, tier) => {
    expect(evaluateSourceUrl(url)).toMatchObject({ tier });
  });

  // @req REQ-092
  it("keeps AI provenance on the source_kind axis, not the tier", () => {
    expect(evaluateSourceUrl("https://claude.ai/chat/123")).toEqual({
      key: "ai-generated",
      tier: "unverified",
      sourceKind: "ai_generated",
    });
  });

  // @req REQ-092
  it("tiers an off-catalogue source as unverified rather than refusing it", () => {
    expect(evaluateSourceUrl("https://unclassified.example/evidence")).toEqual({
      key: "unknown",
      tier: "unverified",
      sourceKind: "unknown",
    });
  });
});
