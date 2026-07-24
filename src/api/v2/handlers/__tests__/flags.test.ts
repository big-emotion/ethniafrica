import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleFlagCreate,
  handleFlagDetail,
  handleFlagList,
} from "@/api/v2/handlers/flags";

const contributor = { id: "contributor-1" };
const createdFlag = {
  id: "11111111-1111-4111-8111-111111111111",
  public_slug: "flag-example",
  status: "open" as const,
  created_at: "2026-07-24T10:00:00.000Z",
};
const publicFlag = {
  ...createdFlag,
  target_type: "people",
  target_id: "PPL_YORUBA",
  target_field_path: "demographics.population",
  assertion_id: null,
  flag_kind: "inaccurate" as const,
  reason_text: "The published figure needs a newer source.",
  counter_source_url: "https://example.org/source",
  counter_source_citation: "Example source",
  proposed_rewrite: null,
  contributor_id: contributor.id,
  severity: null,
  auto_generated: false,
  updated_at: null,
  resolved_at: null,
};

function validInput() {
  return {
    target_type: " people ",
    target_id: " PPL_YORUBA ",
    target_field_path: " demographics.population ",
    flag_kind: "inaccurate",
    reason_text: "  The published figure needs a newer source.  ",
    counter_source_url: "https://example.org/source",
    counter_source_citation: "Example source",
    proposed_rewrite: "Use the latest published estimate.",
    turnstile_token: "turnstile-token",
  };
}

function makeDependencies() {
  return {
    getAuthenticatedContributor: vi.fn().mockResolvedValue(contributor),
    getAgeConfirmedAt: vi.fn().mockResolvedValue("2026-01-01T00:00:00.000Z"),
    verifyTurnstileToken: vi.fn().mockResolvedValue("verified" as const),
    checkFlagRateLimit: vi.fn().mockResolvedValue({ allowed: true } as const),
    createFlag: vi.fn().mockResolvedValue(createdFlag),
    listFlags: vi.fn().mockResolvedValue({
      items: [publicFlag],
      next_cursor: "next-cursor",
    }),
    getFlagByIdOrSlug: vi.fn().mockResolvedValue(publicFlag),
    decodeFlagCursor: vi.fn().mockReturnValue({
      createdAt: "2026-07-24T10:00:00.000Z",
      id: createdFlag.id,
    }),
  };
}

describe("flag handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleFlagCreate", () => {
    // @req REQ-012
    it("rejects a missing access token before validation", async () => {
      const dependencies = makeDependencies();

      const result = await handleFlagCreate(
        {},
        { accessToken: null },
        dependencies
      );

      expect(result).toMatchObject({
        status: 401,
        body: {
          data: null,
          errors: [{ code: "UNAUTHENTICATED" }],
        },
      });
      expect(dependencies.getAuthenticatedContributor).not.toHaveBeenCalled();
      expect(dependencies.createFlag).not.toHaveBeenCalled();
    });

    // @req REQ-012
    it("rejects an invalid access token before validation", async () => {
      const dependencies = makeDependencies();
      dependencies.getAuthenticatedContributor.mockResolvedValue(null);

      const result = await handleFlagCreate(
        {},
        { accessToken: "invalid-token" },
        dependencies
      );

      expect(result).toMatchObject({
        status: 401,
        body: {
          data: null,
          errors: [{ code: "UNAUTHENTICATED" }],
        },
      });
      expect(dependencies.getAuthenticatedContributor).toHaveBeenCalledWith(
        "invalid-token"
      );
      expect(dependencies.createFlag).not.toHaveBeenCalled();
    });

    // @req REQ-012
    it("returns one field-level error for each validation issue", async () => {
      const dependencies = makeDependencies();

      const result = await handleFlagCreate(
        {},
        { accessToken: "valid-token" },
        dependencies
      );

      expect(result.status).toBe(400);
      expect(result.body.errors).toHaveLength(5);
      expect(result.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "VALIDATION_ERROR",
            field: "target_type",
          }),
          expect.objectContaining({
            code: "VALIDATION_ERROR",
            field: "target_id",
          }),
          expect.objectContaining({
            code: "VALIDATION_ERROR",
            field: "flag_kind",
          }),
          expect.objectContaining({
            code: "VALIDATION_ERROR",
            field: "reason_text",
          }),
          expect.objectContaining({
            code: "VALIDATION_ERROR",
            field: "turnstile_token",
          }),
        ])
      );
      expect(dependencies.getAgeConfirmedAt).not.toHaveBeenCalled();
      expect(dependencies.createFlag).not.toHaveBeenCalled();
    });

    // @req REQ-012
    it.each([
      ["target_type", { target_type: " " }],
      ["target_id", { target_id: " " }],
      ["target_field_path", { target_field_path: " " }],
      ["flag_kind", { flag_kind: "not-canonical" }],
      ["reason_text", { reason_text: "too short" }],
      ["reason_text", { reason_text: "x".repeat(2001) }],
      ["counter_source_url", { counter_source_url: "not-a-url" }],
      [
        "counter_source_citation",
        { counter_source_citation: "x".repeat(2001) },
      ],
      ["proposed_rewrite", { proposed_rewrite: "x".repeat(5001) }],
      ["turnstile_token", { turnstile_token: " " }],
    ])("validates %s", async (field, patch) => {
      const dependencies = makeDependencies();

      const result = await handleFlagCreate(
        { ...validInput(), ...patch },
        { accessToken: "valid-token" },
        dependencies
      );

      expect(result.status).toBe(400);
      expect(result.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "VALIDATION_ERROR",
            field,
          }),
        ])
      );
      expect(dependencies.createFlag).not.toHaveBeenCalled();
    });

    // @req REQ-012
    it("preserves the FR45 age confirmation gate", async () => {
      const dependencies = makeDependencies();
      dependencies.getAgeConfirmedAt.mockResolvedValue(null);

      const result = await handleFlagCreate(
        validInput(),
        { accessToken: "valid-token" },
        dependencies
      );

      expect(result).toMatchObject({
        status: 403,
        body: {
          data: null,
          errors: [{ code: "AGE_CONFIRMATION_REQUIRED" }],
        },
      });
      expect(dependencies.verifyTurnstileToken).not.toHaveBeenCalled();
      expect(dependencies.createFlag).not.toHaveBeenCalled();
    });

    // @req REQ-012
    it("rejects a failed Turnstile verification without inserting", async () => {
      const dependencies = makeDependencies();
      dependencies.verifyTurnstileToken.mockResolvedValue("rejected");

      const result = await handleFlagCreate(
        validInput(),
        { accessToken: "valid-token", clientIp: "203.0.113.10" },
        dependencies
      );

      expect(result).toMatchObject({
        status: 403,
        body: {
          data: null,
          errors: [{ code: "UNAUTHORIZED" }],
        },
      });
      expect(dependencies.verifyTurnstileToken).toHaveBeenCalledWith(
        "turnstile-token",
        "203.0.113.10"
      );
      expect(dependencies.checkFlagRateLimit).not.toHaveBeenCalled();
      expect(dependencies.createFlag).not.toHaveBeenCalled();
    });

    // @req REQ-012
    it("returns unavailable when Turnstile cannot verify without inserting", async () => {
      const dependencies = makeDependencies();
      dependencies.verifyTurnstileToken.mockResolvedValue("unavailable");

      const result = await handleFlagCreate(
        validInput(),
        { accessToken: "valid-token" },
        dependencies
      );

      expect(result).toMatchObject({
        status: 503,
        body: {
          data: null,
          errors: [{ code: "UNAVAILABLE" }],
        },
      });
      expect(dependencies.checkFlagRateLimit).not.toHaveBeenCalled();
      expect(dependencies.createFlag).not.toHaveBeenCalled();
    });

    // @req REQ-012
    it("returns rate-limit headers without inserting", async () => {
      const dependencies = makeDependencies();
      dependencies.checkFlagRateLimit.mockResolvedValue({
        allowed: false,
        retryAfter: 90,
        limit: 10,
        remaining: 0,
        reset: 1_753_351_200_000,
      });

      const result = await handleFlagCreate(
        validInput(),
        { accessToken: "valid-token" },
        dependencies
      );

      expect(result).toMatchObject({
        status: 429,
        body: {
          data: null,
          errors: [{ code: "RATE_LIMITED" }],
        },
        headers: {
          "Retry-After": "90",
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": "1753351200000",
        },
      });
      expect(dependencies.createFlag).not.toHaveBeenCalled();
    });

    // @req REQ-012
    it("creates a flag with normalized input and a shared response envelope", async () => {
      const dependencies = makeDependencies();

      const result = await handleFlagCreate(
        validInput(),
        { accessToken: "valid-token", clientIp: "203.0.113.10" },
        dependencies
      );

      expect(dependencies.createFlag).toHaveBeenCalledWith(contributor.id, {
        target_type: "people",
        target_id: "PPL_YORUBA",
        target_field_path: "demographics.population",
        flag_kind: "inaccurate",
        reason_text: "The published figure needs a newer source.",
        counter_source_url: "https://example.org/source",
        counter_source_citation: "Example source",
        proposed_rewrite: "Use the latest published estimate.",
      });
      expect(result).toEqual({
        status: 201,
        body: {
          data: createdFlag,
          meta: {
            license: "CC-BY-SA-4.0",
            attribution: "Africa History — africahistory.org",
          },
          errors: [],
        },
      });
    });
  });

  describe("handleFlagList", () => {
    // @req REQ-014
    it("coerces filters, validates the cursor, and returns cursor pagination", async () => {
      const dependencies = makeDependencies();

      const result = await handleFlagList(
        {
          status: "under_review",
          kind: "missing-source",
          target_type: " people ",
          cursor: "valid-cursor",
          limit: "25",
        },
        dependencies
      );

      expect(dependencies.decodeFlagCursor).toHaveBeenCalledWith(
        "valid-cursor"
      );
      expect(dependencies.listFlags).toHaveBeenCalledWith({
        status: "under_review",
        kind: "missing-source",
        target_type: "people",
        cursor: "valid-cursor",
        limit: 25,
      });
      expect(result).toEqual({
        status: 200,
        body: {
          data: [publicFlag],
          meta: {
            license: "CC-BY-SA-4.0",
            attribution: "Africa History — africahistory.org",
            pagination: { limit: 25, next_cursor: "next-cursor" },
          },
          errors: [],
        },
      });
    });

    // @req REQ-014
    it("uses a default limit of 20", async () => {
      const dependencies = makeDependencies();

      const result = await handleFlagList({}, dependencies);

      expect(result.status).toBe(200);
      expect(dependencies.listFlags).toHaveBeenCalledWith({ limit: 20 });
    });

    // @req REQ-014
    it.each([
      ["status", { status: "triaged" }],
      ["kind", { kind: "spam" }],
      ["target_type", { target_type: " " }],
      ["limit", { limit: "0" }],
      ["limit", { limit: "101" }],
    ])("validates the %s query parameter", async (field, query) => {
      const dependencies = makeDependencies();

      const result = await handleFlagList(query, dependencies);

      expect(result).toMatchObject({
        status: 400,
        body: {
          data: null,
          errors: [
            expect.objectContaining({ code: "VALIDATION_ERROR", field }),
          ],
        },
      });
      expect(dependencies.listFlags).not.toHaveBeenCalled();
    });

    // @req REQ-014
    it("rejects an invalid cursor before listing", async () => {
      const dependencies = makeDependencies();
      dependencies.decodeFlagCursor.mockReturnValue(null);

      const result = await handleFlagList(
        { cursor: "invalid-cursor" },
        dependencies
      );

      expect(result).toMatchObject({
        status: 400,
        body: {
          data: null,
          errors: [
            expect.objectContaining({
              code: "VALIDATION_ERROR",
              field: "cursor",
            }),
          ],
        },
      });
      expect(dependencies.listFlags).not.toHaveBeenCalled();
    });
  });

  describe("handleFlagDetail", () => {
    // @req REQ-014
    it("rejects an empty identifier", async () => {
      const dependencies = makeDependencies();

      const result = await handleFlagDetail("  ", dependencies);

      expect(result).toMatchObject({
        status: 400,
        body: {
          data: null,
          errors: [
            expect.objectContaining({
              code: "VALIDATION_ERROR",
              field: "identifier",
            }),
          ],
        },
      });
      expect(dependencies.getFlagByIdOrSlug).not.toHaveBeenCalled();
    });

    // @req REQ-014
    it("returns not found for an unknown id or slug", async () => {
      const dependencies = makeDependencies();
      dependencies.getFlagByIdOrSlug.mockResolvedValue(null);

      const result = await handleFlagDetail("missing-flag", dependencies);

      expect(result).toMatchObject({
        status: 404,
        body: {
          data: null,
          errors: [{ code: "NOT_FOUND" }],
        },
      });
    });

    // @req REQ-014
    it("returns the full flag in the shared response envelope", async () => {
      const dependencies = makeDependencies();

      const result = await handleFlagDetail(" flag-example ", dependencies);

      expect(dependencies.getFlagByIdOrSlug).toHaveBeenCalledWith(
        "flag-example"
      );
      expect(result).toEqual({
        status: 200,
        body: {
          data: publicFlag,
          meta: {
            license: "CC-BY-SA-4.0",
            attribution: "Africa History — africahistory.org",
          },
          errors: [],
        },
      });
    });
  });
});
