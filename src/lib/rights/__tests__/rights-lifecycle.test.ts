import { describe, expect, it } from "vitest";

import { evaluatePublicEligibility } from "@/lib/rights/rights-lifecycle";

const now = new Date("2026-07-29T12:00:00.000Z");

const publicRecord = {
  rightsBasis: "community-agreement",
  consentScope: "public",
  visibility: "public",
  communityReviewStatus: "approved",
};

describe("evaluatePublicEligibility", () => {
  // @req REQ-096
  it("allows an explicitly public, approved record without an effective block", () => {
    expect(evaluatePublicEligibility(publicRecord, now)).toEqual({
      publicEligible: true,
      accessState: "public",
      evaluatedAt: now.toISOString(),
    });
  });

  // @req REQ-096
  it.each([
    ["rights are missing", { ...publicRecord, rightsBasis: undefined }],
    ["rights are ambiguous", { ...publicRecord, rightsBasis: "ambiguous" }],
    ["consent is missing", { ...publicRecord, consentScope: undefined }],
    ["consent is ambiguous", { ...publicRecord, consentScope: "editorial" }],
    ["visibility is not public", { ...publicRecord, visibility: "editorial" }],
    [
      "consent is withdrawn",
      { ...publicRecord, withdrawnAt: "2026-07-01T00:00:00.000Z" },
    ],
    [
      "the embargo remains effective",
      { ...publicRecord, embargoUntil: "2026-08-01T00:00:00.000Z" },
    ],
    [
      "retention has expired",
      { ...publicRecord, retentionUntil: "2026-07-01T00:00:00.000Z" },
    ],
    [
      "community review is pending",
      { ...publicRecord, communityReviewStatus: "pending" },
    ],
    [
      "community review is rejected",
      { ...publicRecord, communityReviewStatus: "rejected" },
    ],
  ])("denies access when %s", (_scenario, record) => {
    expect(evaluatePublicEligibility(record, now)).toEqual({
      publicEligible: false,
      accessState: "blocked",
      evaluatedAt: now.toISOString(),
    });
  });

  // @req REQ-096
  it("allows records after embargo expiry when all other requirements are met", () => {
    expect(
      evaluatePublicEligibility(
        { ...publicRecord, embargoUntil: "2026-07-01T00:00:00.000Z" },
        now
      )
    ).toMatchObject({ publicEligible: true, accessState: "public" });
  });

  // @req REQ-096
  it("returns only auditable access state fields", () => {
    const protectedRecord = {
      ...publicRecord,
      rightsEvidence: { private: true },
      restrictedTranscript: "not for public output",
      rejectionReason: "not for public output",
    };
    const result = evaluatePublicEligibility(protectedRecord, now);

    expect(Object.keys(result).sort()).toEqual([
      "accessState",
      "evaluatedAt",
      "publicEligible",
    ]);
  });
});
