import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { auditLegacyCitations } from "../migrateLegacySources";

function legacyKey(rawCitation: string): string {
  return `legacy-${createHash("sha256")
    .update(rawCitation, "utf8")
    .digest("hex")}`;
}

describe("auditLegacyCitations", () => {
  // @req REQ-093
  it("creates a stable source key and preserves the original citation byte-for-byte", () => {
    const rawCitation =
      "  Murdock G.P., The Peoples of Africa, 1959.  \nPage 42\t";

    const [result] = auditLegacyCitations([rawCitation]);

    expect(result).toEqual({
      sourceKey: legacyKey(rawCitation),
      legacyRawCitation: rawCitation,
      sourceKind: "unknown",
      tier: "unverified",
      identifiers: {},
      reviewStatus: "review_required",
    });
  });

  // @req REQ-093
  it("does not infer incomplete metadata from a legacy citation", () => {
    const [result] = auditLegacyCitations([
      "Ethnologue – Kissi, Northern (kqs), SIL International, 2024 (https://www.ethnologue.com/language/kqs/)",
    ]);

    expect(result).toMatchObject({
      sourceKind: "unknown",
      tier: "unverified",
      identifiers: {},
      reviewStatus: "review_required",
    });
    expect(result).not.toHaveProperty("title");
    expect(result).not.toHaveProperty("url");
    expect(result).not.toHaveProperty("author");
    expect(result).not.toHaveProperty("year");
  });

  // @req REQ-093
  it("is deterministic and idempotent across repeated audits", () => {
    const citations = [
      "Ibn Khaldun. Kitab al-Ibar. Alger, 1852-1856.",
      "Ibn Khaldun. Kitab al-Ibar. Alger, 1852-1856.",
      "Al-Muqadassi. Ahsan at-Taqasim. 10th century.",
    ];

    const first = auditLegacyCitations(citations);
    const second = auditLegacyCitations(citations);

    expect(second).toEqual(first);
    expect(first.map((result) => result.sourceKey)).toEqual([
      legacyKey(citations[0]),
      legacyKey(citations[1]),
      legacyKey(citations[2]),
    ]);
  });
});
