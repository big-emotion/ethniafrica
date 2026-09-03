import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleFlagCreate } from "@/api/v2/handlers/flags";

/**
 * A contribution is a flag, and the one thing it does not have is an anchor.
 *
 * Reports are always *about* an existing claim, so `flags_has_anchor_check`
 * makes every other kind name one. A contribution proposing a people the
 * corpus does not hold yet has nothing to name, and satisfying the constraint
 * with a placeholder id would write a fictional entity into the anchor column.
 * These tests pin both halves: the exemption exists, and it stops at
 * `contribution`.
 */

const createdFlag = {
  id: "22222222-2222-4222-8222-222222222222",
  public_slug: "flag-contribution",
  status: "open" as const,
  created_at: "2026-09-02T10:00:00.000Z",
};

const antibot = {
  salt: "test-salt",
  nonce: "42",
  difficultyBits: 8,
  expiresAt: 4102444800000,
  signature: "test-signature",
};

function newPeopleContribution() {
  return {
    flag_kind: "contribution",
    reason_text: "Proposition d'une fiche pour un peuple absent du corpus.",
    contribution_payload: {
      contribution_type: "new_people",
      proposed: { name_main: "Bassari", language_family_id: "FLG_NIGER_CONGO" },
    },
    antibot,
    elapsedMs: 12_000,
  };
}

function makeDependencies() {
  return {
    getAuthenticatedContributor: vi.fn().mockResolvedValue(null),
    getAgeConfirmedAt: vi.fn().mockResolvedValue(null),
    verifyAntibotProof: vi.fn().mockResolvedValue("verified" as const),
    checkFlagRateLimit: vi.fn().mockResolvedValue({ allowed: true } as const),
    createFlag: vi.fn().mockResolvedValue(createdFlag),
    listFlags: vi.fn(),
    getFlagByIdOrSlug: vi.fn(),
    decodeFlagCursor: vi.fn(),
    createReporterContact: vi.fn().mockResolvedValue(null),
    sendFlagVerificationEmail: vi.fn().mockResolvedValue(undefined),
  };
}

describe("handleFlagCreate — contribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-092
  it("accepts a contribution that names no existing entity", async () => {
    const dependencies = makeDependencies();

    const result = await handleFlagCreate(
      newPeopleContribution(),
      { accessToken: null },
      dependencies
    );

    expect(result.status).toBe(201);
    expect(dependencies.createFlag).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        flag_kind: "contribution",
        target_type: undefined,
        target_id: undefined,
      })
    );
  });

  // @req REQ-092
  it("carries the structured proposal through to the stored flag", async () => {
    const dependencies = makeDependencies();

    await handleFlagCreate(
      newPeopleContribution(),
      { accessToken: null },
      dependencies
    );

    expect(dependencies.createFlag).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        contribution_payload: expect.objectContaining({
          contribution_type: "new_people",
        }),
      })
    );
  });

  // @req REQ-092
  it("refuses a contribution carrying no proposal", async () => {
    const dependencies = makeDependencies();
    const { contribution_payload: _dropped, ...withoutProposal } =
      newPeopleContribution();

    const result = await handleFlagCreate(
      withoutProposal,
      { accessToken: null },
      dependencies
    );

    expect(result.status).toBe(400);
    expect(result.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "contribution_payload" }),
      ])
    );
    expect(dependencies.createFlag).not.toHaveBeenCalled();
  });

  // @req REQ-092
  it("still demands an anchor from every kind that is not a contribution", async () => {
    const dependencies = makeDependencies();

    const result = await handleFlagCreate(
      { ...newPeopleContribution(), flag_kind: "inaccurate" },
      { accessToken: null },
      dependencies
    );

    expect(result.status).toBe(400);
    expect(result.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "target_type" }),
        expect.objectContaining({ field: "target_id" }),
      ])
    );
    expect(dependencies.createFlag).not.toHaveBeenCalled();
  });
});
