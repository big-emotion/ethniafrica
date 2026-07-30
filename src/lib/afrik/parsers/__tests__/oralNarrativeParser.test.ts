import { describe, expect, it } from "vitest";
import { parseOralNarrativeFile } from "../oralNarrativeParser";

const validNarrative = {
  _meta: {
    format: "AFRIK JSON v2",
    entity: "recit_oral",
    directives:
      "Oral narratives remain attributed accounts, not factual assertions.",
  },
  id: "ORL_TEST_001",
  links: {
    languageFamilyId: "FLG_BANTU",
    peopleId: "PPL_TEST",
    countryId: "CMR",
    assertionId: null,
  },
  attribution: {
    displayMode: "pseudonym",
    displayName: "M. N.",
    community: "Community test",
    collector: "Collection test",
  },
  context: {
    narrativeDate: "2025-01-01",
    placePrecision: "region",
    languageCode: "fra",
    narrativeKind: "testimony",
  },
  content: {
    transcript: null,
    summary: "A short attributed account.",
    mediaLocator: null,
  },
  variantOf: null,
  visibility: "restricted",
  reviewStatus: "pending",
  rightsStatus: "pending",
};

describe("parseOralNarrativeFile", () => {
  // @req REQ-095
  it("parses a complete oral narrative without turning it into an assertion", () => {
    const result = parseOralNarrativeFile(validNarrative);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      id: "ORL_TEST_001",
      links: { peopleId: "PPL_TEST", assertionId: null },
      attribution: { displayMode: "pseudonym", displayName: "M. N." },
    });
  });

  // @req REQ-095
  it("rejects public display identity when its name is absent", () => {
    const result = parseOralNarrativeFile({
      ...validNarrative,
      attribution: { ...validNarrative.attribution, displayName: null },
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "attribution.displayName" })
    );
  });

  // @req REQ-095
  it("rejects an account with neither transcript nor summary", () => {
    const result = parseOralNarrativeFile({
      ...validNarrative,
      content: { ...validNarrative.content, summary: null },
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "content" })
    );
  });

  // @req REQ-095
  it("rejects a narrative that has no fiche link", () => {
    const result = parseOralNarrativeFile({
      ...validNarrative,
      links: {
        languageFamilyId: null,
        peopleId: null,
        countryId: null,
        assertionId: null,
      },
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "links" })
    );
  });
});
