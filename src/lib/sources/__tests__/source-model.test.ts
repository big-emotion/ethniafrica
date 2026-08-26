import { describe, expect, it } from "vitest";
import {
  adaptLegacySources,
  sourceRecordSchema,
} from "@/lib/sources/source-model";

const structuredSource = {
  sourceKey: "miller-2018-african-archives",
  title: "African Archives and Historical Practice",
  authors: ["Jane Miller"],
  publicationYear: 2018,
  sourceKind: "academic",
  tier: "referenced",
  identifiers: { isbn: "978-1-23456-789-0" },
  publisher: "Example Press",
  url: "https://example.org/african-archives",
};

describe("structured source model", () => {
  // @req REQ-093
  it("accepts a complete structured source with a stable key", () => {
    expect(sourceRecordSchema.safeParse(structuredSource)).toMatchObject({
      success: true,
      data: structuredSource,
    });
  });

  // @req REQ-093
  it("accepts an offline archive without manufacturing a URL", () => {
    const offlineArchive = {
      ...structuredSource,
      sourceKey: "national-archive-folio-42",
      sourceKind: "archive",
      url: null,
      identifiers: { catalogue: "NA-42" },
    };

    const result = sourceRecordSchema.safeParse(offlineArchive);

    expect(result.success).toBe(true);
    expect(result.data?.url).toBeNull();
  });

  // @req REQ-093
  it("rejects incomplete source metadata instead of accepting placeholders", () => {
    const result = sourceRecordSchema.safeParse({
      ...structuredSource,
      sourceKey: "Not a stable key",
      authors: [],
      publicationYear: null,
    });

    expect(result.success).toBe(false);
  });
});

describe("legacy source compatibility adapter", () => {
  // @req REQ-093
  it("preserves every legacy citation byte-for-byte without inferring metadata", () => {
    const citation = "  Ethnologue — SIL International, 2025  ";

    expect(adaptLegacySources([citation])).toEqual({
      success: true,
      data: [
        {
          legacyRawCitation: citation,
          reviewStatus: "review_required",
        },
      ],
    });
  });

  // @req REQ-093
  it("accepts only legacy string arrays at the compatibility boundary", () => {
    expect(adaptLegacySources([{ title: "Already structured" }])).toEqual({
      success: false,
      errors: [
        {
          path: "sources.0",
          message: "legacy sources must be strings",
        },
      ],
    });
  });
});
