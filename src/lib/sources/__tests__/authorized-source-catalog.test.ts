import { describe, expect, it } from "vitest";
import {
  authorizedSourceCatalog,
  evaluateSourceUrl,
  validateAuthorizedSourceCatalog,
} from "@/lib/sources/authorized-source-catalog";

describe("authorized source catalogue", () => {
  // @req REQ-092
  it("contains unique stable keys and only assigns evidence tiers to publishable entries", () => {
    expect(validateAuthorizedSourceCatalog(authorizedSourceCatalog)).toEqual(
      []
    );

    expect(
      new Set(authorizedSourceCatalog.entries.map((entry) => entry.key)).size
    ).toBe(authorizedSourceCatalog.entries.length);
  });

  // @req REQ-092
  it.each([
    ["https://www.un.org/development/desa/pd/", "preferred", 1],
    ["https://glottolog.org/", "preferred", 1],
    ["https://www.jstor.org/stable/123", "allowed", 2],
    ["https://en.wikipedia.org/wiki/Yoruba_people", "discovery_only", null],
    ["https://www.worldcat.org/title/example", "discovery_only", null],
    ["https://chat.openai.com/", "prohibited", null],
  ])("evaluates %s consistently", (url, admission, evidenceTier) => {
    expect(evaluateSourceUrl(url)).toMatchObject({
      admission,
      evidenceTier,
      publishable: admission === "preferred" || admission === "allowed",
    });
  });

  // @req REQ-092
  it("requires review for an unknown source without treating it as publishable evidence", () => {
    expect(evaluateSourceUrl("https://unclassified.example/evidence")).toEqual({
      key: "unknown",
      admission: "review_required",
      evidenceTier: null,
      sourceKind: "unknown",
      publishable: false,
    });
  });
});
