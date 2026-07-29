import { describe, expect, it } from "vitest";
import {
  parseAssertionSourceReference,
  parseSourceFile,
} from "@/lib/afrik/parsers/sourceParser";

const source = {
  sourceKey: "national-archive-folio-42",
  title: "Colonial Records, 1912",
  authors: ["National Archives"],
  publicationYear: 1912,
  sourceKind: "archive",
  evidenceTier: null,
  identifiers: { catalogue: "NA-42" },
  publisher: null,
  url: null,
};

describe("parseSourceFile", () => {
  // @req REQ-093
  it("parses a complete offline source record", () => {
    expect(parseSourceFile(source)).toEqual({ success: true, data: source });
  });

  // @req REQ-093
  it("rejects unrecognized structured source fields", () => {
    const result = parseSourceFile({ ...source, inventedTier: 1 });

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining("Unrecognized"),
      })
    );
  });
});

describe("parseAssertionSourceReference", () => {
  // @req REQ-093
  it("requires a precise locator for an assertion source link", () => {
    expect(
      parseAssertionSourceReference({
        sourceKey: source.sourceKey,
        locatorType: "folio",
        locatorValue: "42r",
      })
    ).toEqual({
      success: true,
      data: {
        sourceKey: source.sourceKey,
        locatorType: "folio",
        locatorValue: "42r",
      },
    });
  });

  // @req REQ-093
  it("rejects an assertion source link without a locator", () => {
    const result = parseAssertionSourceReference({
      sourceKey: source.sourceKey,
      locatorType: "page",
      locatorValue: "",
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "locatorValue" })
    );
  });
});
