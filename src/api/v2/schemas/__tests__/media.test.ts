import { describe, expect, it } from "vitest";

import { validateMedia } from "../../utils/validation";

const validMedia = {
  entityType: "people" as const,
  entityId: "PPL_KONGO",
  author: "Example archive",
  licenceUri: "https://creativecommons.org/licenses/by-sa/4.0/",
  sourcePageUrl: "https://example.test/archive/item",
  period: "19th century",
  depictionTiming: "reconstitution" as const,
};

describe("validateMedia", () => {
  // @req REQ-128
  it("rejects media without a licence URI", () => {
    const { licenceUri: _licenceUri, ...withoutLicence } = validMedia;

    expect(() => validateMedia(withoutLicence)).toThrow();
    expect(() => validateMedia({ ...validMedia, licenceUri: "" })).toThrow();
  });

  // @req REQ-128
  it("rejects a licence that is not a URI", () => {
    expect(() =>
      validateMedia({ ...validMedia, licenceUri: "CC BY-SA 4.0" })
    ).toThrow();
  });

  // @req REQ-128
  it("preserves valid authorship, provenance, period and depiction timing", () => {
    expect(validateMedia(validMedia)).toEqual(validMedia);
  });
});
