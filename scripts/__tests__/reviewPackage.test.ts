import { describe, expect, it } from "vitest";

import {
  buildReviewPackage,
  readAtPath,
  renderReviewPackage,
  type ReviewSubject,
} from "../lib/reviewPackage";

const NIGERIA_SOURCE = {
  id: "NGA",
  nameOfficial: "République fédérale du Nigeria",
  etymology:
    "Du fleuve Niger, nom forgé en 1897 par la journaliste Flora Shaw.",
  content: {
    historicalNames: {
      formerNames: ["Protectorat du Sud-Nigeria", "Colonie de Lagos"],
    },
    kingdoms: [{ name: "Royaume du Bénin" }, { name: "Califat de Sokoto" }],
    majorPeoples: [{ appellationRemarks: "L'exonyme est daté." }],
  },
};

const NIGERIA_SIDECAR = {
  id: "NGA",
  nameOfficial: "Federal Republic of Nigeria",
  etymology:
    "From the river Niger, a name coined in 1897 by the journalist Flora Shaw.",
  content: {
    historicalNames: {
      formerNames: ["Southern Nigeria Protectorate", "Colony of Lagos"],
    },
    kingdoms: [{ name: "Kingdom of Benin" }, { name: "Sokoto Caliphate" }],
    majorPeoples: [{ appellationRemarks: "The exonym is dated." }],
  },
  _translation: {
    kind: "machine" as const,
    translatedAt: "2026-09-08T09:00:00.000Z",
    model: "sonnet",
    sourceHash: "a".repeat(64),
    fieldHashes: {},
    reviewRequired: [
      "nameOfficial",
      "etymology",
      "content.historicalNames.formerNames[0]",
      "content.kingdoms[1].name",
    ],
  },
};

function nigeria(): ReviewSubject {
  return {
    recordId: "NGA",
    sourceRelativePath: "pays/NGA.json",
    source: NIGERIA_SOURCE,
    sidecar: NIGERIA_SIDECAR,
  };
}

describe("readAtPath", () => {
  // @req REQ-142
  it("resolves a dotted path", () => {
    expect(readAtPath(NIGERIA_SOURCE, "nameOfficial")).toBe(
      "République fédérale du Nigeria"
    );
  });

  // @req REQ-142
  it("resolves an indexed path through an array of objects", () => {
    expect(readAtPath(NIGERIA_SOURCE, "content.kingdoms[1].name")).toBe(
      "Califat de Sokoto"
    );
  });

  // @req REQ-142
  it("resolves an indexed path into an array of strings", () => {
    expect(
      readAtPath(NIGERIA_SOURCE, "content.historicalNames.formerNames[0]")
    ).toBe("Protectorat du Sud-Nigeria");
  });

  // @req REQ-142
  it("returns undefined for a path the record does not hold", () => {
    expect(readAtPath(NIGERIA_SOURCE, "content.kingdoms[9].name")).toBe(
      undefined
    );
  });
});

describe("buildReviewPackage", () => {
  // @req REQ-142
  it("pairs the French source with the English proposal on every review path", () => {
    const pkg = buildReviewPackage([nigeria()], "en");

    expect(pkg.itemCount).toBe(4);
    const etymology = pkg.records[0].items.find(
      (item) => item.path === "etymology"
    );
    expect(etymology?.french).toBe(
      "Du fleuve Niger, nom forgé en 1897 par la journaliste Flora Shaw."
    );
    expect(etymology?.english).toBe(
      "From the river Niger, a name coined in 1897 by the journalist Flora Shaw."
    );
  });

  // @req REQ-142
  it("carries the provenance the reviewer signs off against", () => {
    const pkg = buildReviewPackage([nigeria()], "en");

    expect(pkg.records[0].provenance).toEqual({
      kind: "machine",
      model: "sonnet",
      translatedAt: "2026-09-08T09:00:00.000Z",
      reviewedBy: null,
      sourceHash: "a".repeat(64),
    });
  });

  // @req REQ-142
  it("reports a review path the source does not hold instead of dropping it", () => {
    const subject = nigeria();
    subject.sidecar = {
      ...NIGERIA_SIDECAR,
      _translation: {
        ...NIGERIA_SIDECAR._translation,
        reviewRequired: ["content.kingdoms[9].name"],
      },
    };

    const pkg = buildReviewPackage([subject], "en");

    expect(pkg.records[0].items[0].unresolved).toBe(true);
    expect(pkg.unresolvedCount).toBe(1);
  });
});

describe("renderReviewPackage", () => {
  // @req REQ-142
  it("prints every review path with both languages", () => {
    const markdown = renderReviewPackage(buildReviewPackage([nigeria()], "en"));

    expect(markdown).toContain("content.kingdoms[1].name");
    expect(markdown).toContain("Califat de Sokoto");
    expect(markdown).toContain("Sokoto Caliphate");
  });

  // @req REQ-142
  it("leaves the reviewer unnamed so no record can claim approval it lacks", () => {
    const markdown = renderReviewPackage(buildReviewPackage([nigeria()], "en"));

    expect(markdown).toContain("Reviewer: _unnamed_");
    expect(markdown).not.toContain("machine_reviewed");
  });
});
