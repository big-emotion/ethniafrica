import { describe, expect, it, vi } from "vitest";
import {
  handleFlagCreate,
  type FlagHandlerDependencies,
} from "@/api/v2/handlers/flags";

const validInput = {
  target_type: "people",
  target_id: "PPL_YORUBA",
  flag_kind: "inaccurate" as const,
  reason_text: "The published figure needs a newer source.",
  turnstile_token: "turnstile-token",
};

function makeDependencies(
  turnstileResult: "rejected" | "unavailable"
): Partial<FlagHandlerDependencies> {
  return {
    getAuthenticatedContributor: vi
      .fn()
      .mockResolvedValue({ id: "contributor-1" }),
    getAgeConfirmedAt: vi.fn().mockResolvedValue("2026-01-01T00:00:00.000Z"),
    verifyTurnstileToken: vi.fn().mockResolvedValue(turnstileResult),
    createFlag: vi.fn(),
  };
}

describe("handleFlagCreate Turnstile errors", () => {
  // @req REQ-012
  it("returns the French unauthorized error without creating a rejected flag", async () => {
    const dependencies = makeDependencies("rejected");

    const result = await handleFlagCreate(
      validInput,
      { accessToken: "valid-token" },
      dependencies
    );

    expect(result.status).toBe(403);
    expect(result.body.errors).toEqual([
      {
        code: "UNAUTHORIZED",
        message: "vérification anti-bot échouée",
      },
    ]);
    expect(dependencies.createFlag).not.toHaveBeenCalled();
  });

  // @req REQ-012
  it("returns a French retry suggestion without creating a flag when verification is unavailable", async () => {
    const dependencies = makeDependencies("unavailable");

    const result = await handleFlagCreate(
      validInput,
      { accessToken: "valid-token" },
      dependencies
    );

    expect(result.status).toBe(503);
    expect(result.body.errors).toEqual([
      {
        code: "UNAVAILABLE",
        message:
          "vérification anti-bot temporairement indisponible, veuillez réessayer plus tard",
      },
    ]);
    expect(dependencies.createFlag).not.toHaveBeenCalled();
  });
});
