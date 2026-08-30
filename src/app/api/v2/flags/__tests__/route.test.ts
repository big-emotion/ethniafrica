import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/flags", () => ({
  handleFlagCreate: vi.fn(),
  handleFlagList: vi.fn(),
  handleFlagDetail: vi.fn(),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

import {
  handleFlagCreate,
  handleFlagDetail,
  handleFlagList,
} from "@/api/v2/handlers/flags";
import { logger } from "@/lib/api/logger";
import { GET, OPTIONS, POST } from "@/app/api/v2/flags/route";
import {
  GET as GET_DETAIL,
  OPTIONS as OPTIONS_DETAIL,
} from "@/app/api/v2/flags/[id]/route";

const successEnvelope = {
  data: {
    id: "11111111-1111-4111-8111-111111111111",
    public_slug: "flag-example",
    status: "open",
    created_at: "2026-07-24T10:00:00.000Z",
  },
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "EthniAfrica — ethniafrica.com",
  },
  errors: [],
};

const errorEnvelope = (code: string) => ({
  data: null,
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "EthniAfrica — ethniafrica.com",
  },
  errors: [{ code, message: code }],
});

describe("flags API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-012
  it("maps malformed JSON to a validation error without calling the handler", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/v2/flags", {
        method: "POST",
        body: "{",
        headers: { "content-type": "application/json" },
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      data: null,
      errors: [{ code: "VALIDATION_ERROR" }],
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(handleFlagCreate).not.toHaveBeenCalled();
  });

  // @req REQ-012
  it("passes a case-insensitive Bearer token and first forwarded IP to the create handler", async () => {
    const body = {
      target_type: "people",
      target_id: "PPL_YORUBA",
      flag_kind: "inaccurate",
      reason_text: "The published figure needs a newer source.",
      antibot: {
        salt: "test-salt",
        nonce: "42",
        difficultyBits: 8,
        expiresAt: 4102444800000,
        signature: "test-signature",
      },
      elapsedMs: 12_000,
    };
    vi.mocked(handleFlagCreate).mockResolvedValue({
      status: 201,
      body: successEnvelope,
    } as never);

    await POST(
      new NextRequest("http://localhost/api/v2/flags", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          authorization: "bEaReR access-token",
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.10, 10.0.0.2",
        },
      })
    );

    expect(handleFlagCreate).toHaveBeenCalledWith(body, {
      accessToken: "access-token",
      clientIp: "203.0.113.10",
    });
  });

  // @req REQ-012
  it.each([undefined, "Basic credentials", "Bearer token with spaces"])(
    "passes missing or invalid authorization %s as a null access token",
    async (authorization) => {
      vi.mocked(handleFlagCreate).mockResolvedValue({
        status: 401,
        body: errorEnvelope("UNAUTHENTICATED"),
      } as never);
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (authorization) headers.authorization = authorization;

      const response = await POST(
        new NextRequest("http://localhost/api/v2/flags", {
          method: "POST",
          body: JSON.stringify({}),
          headers,
        })
      );

      expect(handleFlagCreate).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ accessToken: null })
      );
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        errors: [{ code: "UNAUTHENTICATED" }],
      });
    }
  );

  // @req REQ-012
  it("returns a 201 response with CORS and no-store headers", async () => {
    vi.mocked(handleFlagCreate).mockResolvedValue({
      status: 201,
      body: successEnvelope,
    } as never);

    const response = await POST(
      new NextRequest("http://localhost/api/v2/flags", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(successEnvelope);
  });

  // @req REQ-012
  it("preserves retry and rate-limit headers from a 429 handler response", async () => {
    vi.mocked(handleFlagCreate).mockResolvedValue({
      status: 429,
      body: errorEnvelope("RATE_LIMITED"),
      headers: {
        "Retry-After": "90",
        "X-RateLimit-Limit": "10",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": "1753351200000",
      },
    } as never);

    const response = await POST(
      new NextRequest("http://localhost/api/v2/flags", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("90");
    expect(response.headers.get("x-ratelimit-limit")).toBe("10");
    expect(response.headers.get("x-ratelimit-remaining")).toBe("0");
    expect(response.headers.get("x-ratelimit-reset")).toBe("1753351200000");
  });

  // @req REQ-014
  it("passes raw list query values to the handler and preserves its pagination response", async () => {
    const paginationEnvelope = {
      data: [successEnvelope.data],
      meta: {
        ...successEnvelope.meta,
        pagination: { limit: 7, next_cursor: "next-cursor" },
      },
      errors: [],
    };
    vi.mocked(handleFlagList).mockResolvedValue({
      status: 200,
      body: paginationEnvelope,
    } as never);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/v2/flags?status=under_review&kind=other&target_type=country&cursor=opaque&limit=007"
      )
    );

    expect(handleFlagList).toHaveBeenCalledWith({
      status: "under_review",
      kind: "other",
      target_type: "country",
      cursor: "opaque",
      limit: "007",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(paginationEnvelope);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  // @req REQ-014
  it("awaits detail params and preserves a handler 404 response", async () => {
    vi.mocked(handleFlagDetail).mockResolvedValue({
      status: 404,
      body: errorEnvelope("NOT_FOUND"),
    } as never);

    const response = await GET_DETAIL(
      new NextRequest("http://localhost/api/v2/flags/missing"),
      { params: Promise.resolve({ id: "missing" }) }
    );

    expect(handleFlagDetail).toHaveBeenCalledWith("missing");
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      errors: [{ code: "NOT_FOUND" }],
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  // @req REQ-014
  it("logs unexpected errors and returns a CORS internal-error envelope", async () => {
    const error = new Error("boom");
    vi.mocked(handleFlagList).mockRejectedValue(error);

    const response = await GET(
      new NextRequest("http://localhost/api/v2/flags")
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      data: null,
      errors: [{ code: "INTERNAL_ERROR" }],
    });
    expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(logger.error).toHaveBeenCalledWith(
      "Error in GET /api/v2/flags",
      error
    );
  });

  // @req REQ-014
  it.each([
    ["collection", OPTIONS],
    ["detail", OPTIONS_DETAIL],
  ])("returns a public API preflight for the %s route", (_name, options) => {
    const response = options();

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET,POST,PATCH,OPTIONS"
    );
    expect(response.headers.get("access-control-allow-headers")).toContain(
      "Authorization"
    );
  });
});
