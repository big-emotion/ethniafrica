import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleFlagTransition } from "@/api/v2/handlers/flags";

/**
 * The moderator half of the loop.
 *
 * The state machine has been enforced by Postgres since migration 022, and
 * had no HTTP verb able to drive it: `/api/v2/flags/[id]` exported GET and
 * OPTIONS only. Reports could be filed and never resolved.
 *
 * These assertions cover what the handler owns, which is the authorization —
 * the transition rules themselves belong to the trigger, and are asserted
 * there rather than restated here.
 */

const moderator = { id: "mod-1", role: "editor" as const };

const resolvedFlag = {
  id: "flag-1",
  public_slug: "ABC123DEFG",
  status: "under_review" as const,
};

function makeDependencies() {
  return {
    getModeratorByAccessToken: vi.fn().mockResolvedValue(moderator),
    transitionFlag: vi.fn().mockResolvedValue({
      ok: true,
      flag: resolvedFlag,
      previousStatus: "open",
    }),
    writeAuditLog: vi.fn().mockResolvedValue(undefined),
  };
}

describe("handleFlagTransition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-042
  it("refuses a caller with no access token, before touching the flag", async () => {
    const dependencies = makeDependencies();

    const result = await handleFlagTransition(
      "flag-1",
      { status: "under_review" },
      { accessToken: null },
      dependencies
    );

    expect(result.status).toBe(403);
    expect(dependencies.transitionFlag).not.toHaveBeenCalled();
  });

  /**
   * RLS gives a contributor no path to a status change, so this check is the
   * only thing between a session and a state transition. It refuses by
   * default: a token that resolves to no moderator role is a 403, not a
   * fallthrough.
   */
  // @req REQ-042
  it("refuses a signed-in reader who holds no moderator role", async () => {
    const dependencies = makeDependencies();
    dependencies.getModeratorByAccessToken.mockResolvedValue(null);

    const result = await handleFlagTransition(
      "flag-1",
      { status: "under_review" },
      { accessToken: "reader-token" },
      dependencies
    );

    expect(result.status).toBe(403);
    expect(dependencies.transitionFlag).not.toHaveBeenCalled();
  });

  // @req REQ-042
  it("rejects a status outside the vocabulary before reaching the database", async () => {
    const dependencies = makeDependencies();

    const result = await handleFlagTransition(
      "flag-1",
      { status: "banane" },
      { accessToken: "mod-token" },
      dependencies
    );

    expect(result.status).toBe(400);
    expect(dependencies.transitionFlag).not.toHaveBeenCalled();
  });

  // @req REQ-042
  it("applies the transition and answers with the updated flag", async () => {
    const dependencies = makeDependencies();

    const result = await handleFlagTransition(
      "flag-1",
      { status: "under_review", moderator_notes: "Source à vérifier." },
      { accessToken: "mod-token" },
      dependencies
    );

    expect(result.status).toBe(200);
    expect(dependencies.transitionFlag).toHaveBeenCalledWith("flag-1", {
      status: "under_review",
      moderatorId: "mod-1",
      moderatorNotes: "Source à vérifier.",
    });
    expect(result.body).toMatchObject({ data: resolvedFlag, errors: [] });
  });

  /**
   * A register that records decisions without recording who made them is not
   * auditable, which is the whole point of publishing it.
   */
  // @req REQ-042
  it("records who decided what, in the audit log", async () => {
    const dependencies = makeDependencies();

    await handleFlagTransition(
      "flag-1",
      { status: "under_review" },
      { accessToken: "mod-token" },
      dependencies
    );

    expect(dependencies.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "mod-1",
        action: "flag.transition",
        targetType: "flag",
        targetId: "flag-1",
        before: { status: "open" },
        after: { status: "under_review" },
      })
    );
  });

  // @req REQ-042
  it("reports an unknown flag as not found", async () => {
    const dependencies = makeDependencies();
    dependencies.transitionFlag.mockResolvedValue({
      ok: false,
      reason: "not_found",
    });

    const result = await handleFlagTransition(
      "nope",
      { status: "under_review" },
      { accessToken: "mod-token" },
      dependencies
    );

    expect(result.status).toBe(404);
    expect(dependencies.writeAuditLog).not.toHaveBeenCalled();
  });

  /**
   * The trigger is the authority on which moves are legal, so the handler
   * reports its refusal rather than duplicating the diagram. Two definitions
   * of one state machine is one too many.
   */
  // @req REQ-042
  it("passes on the database's refusal of an illegal move", async () => {
    const dependencies = makeDependencies();
    dependencies.transitionFlag.mockResolvedValue({
      ok: false,
      reason: "illegal_transition",
    });

    const result = await handleFlagTransition(
      "flag-1",
      { status: "accepted" },
      { accessToken: "mod-token" },
      dependencies
    );

    expect(result.status).toBe(409);
    expect(dependencies.writeAuditLog).not.toHaveBeenCalled();
  });
});
