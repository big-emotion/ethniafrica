import { describe, expect, it } from "vitest";

import { evaluateSourceUrl } from "@/lib/sources/authorized-source-catalog";
import { sourceSchema } from "../sources";

const source = {
  id: "11111111-1111-1111-1111-111111111111",
  sourceKey: null,
  sourceKind: null,
  evidenceTier: null,
  identifiers: null,
  title: "Source",
  url: "https://example.test/source",
  type: "primary",
  pinnedUrl: null,
  year: null,
  author: null,
  publisher: null,
  resolvable: null,
  lastVerifiedAt: null,
};

describe("sourceSchema", () => {
  // @req REQ-092
  it("preserves a discovery-only policy outcome", () => {
    const parsed = sourceSchema.parse({
      ...source,
      policy: evaluateSourceUrl("https://fr.wikipedia.org/wiki/Yoruba"),
    });

    expect(parsed.policy).toMatchObject({
      key: "wikipedia",
      admission: "discovery_only",
      evidenceTier: null,
      publishable: false,
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
      admission: "review_required",
      evidenceTier: null,
      sourceKind: "unknown",
      publishable: false,
    });
  });
});
