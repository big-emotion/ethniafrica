import { describe, expect, it } from "vitest";

import { evaluateSourceUrl } from "@/lib/sources/authorized-source-catalog";
import { sourceSchema } from "../sources";

const source = {
  id: "11111111-1111-1111-1111-111111111111",
  sourceKey: null,
  sourceKind: null,
  tier: "official",
  identifiers: null,
  title: "Source",
  url: "https://example.test/source",
  pinnedUrl: null,
  year: null,
  author: null,
  publisher: null,
  resolvable: null,
  lastVerifiedAt: null,
  notes: null,
  page: null,
  addedAt: null,
};

describe("sourceSchema", () => {
  // @req REQ-092
  it("accepts an untiered legacy source", () => {
    const parsed = sourceSchema.parse({
      ...source,
      tier: null,
      policy: evaluateSourceUrl(source.url),
    });

    expect(parsed.tier).toBeNull();
  });

  // @req REQ-092
  it("preserves a discovery surface's policy outcome", () => {
    const parsed = sourceSchema.parse({
      ...source,
      policy: evaluateSourceUrl("https://fr.wikipedia.org/wiki/Yoruba"),
    });

    expect(parsed.policy).toMatchObject({
      key: "wikipedia",
      tier: "unverified",
      sourceKind: "discovery",
    });
  });

  // @req REQ-092
  it("preserves an unknown URL policy outcome", () => {
    const parsed = sourceSchema.parse({
      ...source,
      policy: evaluateSourceUrl("https://unclassified.example/evidence"),
    });

    expect(parsed.policy).toEqual({
      key: "unknown",
      tier: "unverified",
      sourceKind: "unknown",
    });
  });
});
