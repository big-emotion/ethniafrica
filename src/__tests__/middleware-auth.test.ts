import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- mock validateApiKey before importing middleware ---
vi.mock("@/lib/api/auth", () => ({
  validateApiKey: vi.fn(),
}));

// Rate limiting is exercised by its own test file; here it must always
// pass-through so the auth branch is the only thing under test.
vi.mock("@/lib/api/rate-limit", () => ({
  evaluateRateLimit: vi
    .fn()
    .mockResolvedValue({ rejection: null, headers: {} }),
  applyIpRateLimit: vi.fn().mockResolvedValue(null),
}));

// Use vi.hoisted so these are available when vi.mock factories run (hoisted to top)
const { mockNextResponseNext, mockNextResponseJson, mockResponseHeaders } =
  vi.hoisted(() => {
    const mockResponseHeaders = new Map<string, string>();

    const mockNextResponseNext = vi.fn(
      (init?: { request?: { headers?: Headers } }) => {
        const resp = {
          headers: {
            set: vi.fn((key: string, value: string) => {
              mockResponseHeaders.set(key, value);
            }),
            get: vi.fn((key: string) => mockResponseHeaders.get(key)),
          },
          cookies: { set: vi.fn() },
          _requestHeaders: init?.request?.headers,
        };
        return resp;
      }
    );

    // Carries real Headers: the middleware stamps the API version onto every
    // response it returns itself, so a headerless stand-in would fail on a
    // path the real NextResponse.json supports.
    const mockNextResponseJson = vi.fn(
      (body: unknown, init?: { status?: number }) => {
        return { status: init?.status ?? 200, body, headers: new Headers() };
      }
    );

    return { mockNextResponseNext, mockNextResponseJson, mockResponseHeaders };
  });

vi.mock("next/server", () => ({
  NextResponse: {
    next: mockNextResponseNext,
    json: mockNextResponseJson,
  },
}));

// Mock @supabase/ssr createServerClient used for admin route protection
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  })),
}));

import { validateApiKey } from "@/lib/api/auth";
import { applyIpRateLimit, evaluateRateLimit } from "@/lib/api/rate-limit";
import { middleware } from "../middleware";

function createMockRequest(url: string, headers: Record<string, string> = {}) {
  const parsedUrl = new URL(url);
  return {
    url,
    nextUrl: parsedUrl,
    headers: new Headers({ host: parsedUrl.host, ...headers }),
  } as unknown as Parameters<typeof middleware>[0];
}

function forwardedRequestHeaders(): Headers | undefined {
  return mockNextResponseNext.mock.calls[0]?.[0]?.request?.headers;
}

describe("middleware - /api/v2/* authentication", () => {
  beforeEach(() => {
    mockResponseHeaders.clear();
    vi.clearAllMocks();
    // Pinned so no environment-dependent branch can make these pass: the
    // anonymous tier is the production behaviour, not a development courtesy.
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("anonymous tier (no key)", () => {
    // @req REQ-059
    it("serves a keyless request carrying no Origin or Referer", async () => {
      const request = createMockRequest("https://example.com/api/v2/countries");
      await middleware(request);

      expect(mockNextResponseJson).not.toHaveBeenCalled();
      expect(mockNextResponseNext).toHaveBeenCalled();
      expect(validateApiKey).not.toHaveBeenCalled();
    });

    // @req REQ-059
    it("answers a keyless request with the rate-limit headers of its bucket", async () => {
      vi.mocked(evaluateRateLimit).mockResolvedValueOnce({
        rejection: null,
        headers: {
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": "59",
          "X-RateLimit-Reset": "1700000000000",
        },
      });

      const request = createMockRequest("https://example.com/api/v2/countries");
      await middleware(request);

      expect(mockResponseHeaders.get("X-RateLimit-Limit")).toBe("60");
      expect(mockResponseHeaders.get("X-RateLimit-Remaining")).toBe("59");
      expect(mockResponseHeaders.get("X-RateLimit-Reset")).toBe(
        "1700000000000"
      );
    });

    // @req REQ-059
    it("rate limits a keyless request in the per-IP bucket, without a tier", async () => {
      const request = createMockRequest("https://example.com/api/v2/countries");
      await middleware(request);

      expect(evaluateRateLimit).toHaveBeenCalledWith(request);
      expect(evaluateRateLimit).toHaveBeenCalledTimes(1);
      // The IP pre-limit bounds key validation; with no key there is nothing
      // to bound, and charging it too would halve the anonymous quota.
      expect(applyIpRateLimit).not.toHaveBeenCalled();
    });

    // @req REQ-059
    it("returns the 429 of the anonymous bucket", async () => {
      vi.mocked(evaluateRateLimit).mockResolvedValueOnce({
        rejection: { status: 429, headers: new Headers() } as never,
        headers: {},
      });

      const request = createMockRequest("https://example.com/api/v2/countries");
      const response = await middleware(request);

      expect(response.status).toBe(429);
    });

    // @req REQ-059
    it("treats a forged same-origin Referer exactly like no header at all", async () => {
      await middleware(
        createMockRequest("https://example.com/api/v2/countries")
      );
      const bare = {
        json: mockNextResponseJson.mock.calls.length,
        rateLimit: vi.mocked(evaluateRateLimit).mock.calls[0]?.slice(1),
        keyId: forwardedRequestHeaders()?.get("x-api-key-id") ?? null,
      };

      vi.clearAllMocks();
      mockResponseHeaders.clear();

      await middleware(
        createMockRequest("https://example.com/api/v2/countries", {
          referer: "https://example.com/fr",
          origin: "https://example.com",
        })
      );
      const forged = {
        json: mockNextResponseJson.mock.calls.length,
        rateLimit: vi.mocked(evaluateRateLimit).mock.calls[0]?.slice(1),
        keyId: forwardedRequestHeaders()?.get("x-api-key-id") ?? null,
      };

      expect(forged).toEqual(bare);
      expect(forged.keyId).toBeNull();
    });

    // @req REQ-059
    it("serves a cross-origin keyless request the same way", async () => {
      const request = createMockRequest(
        "https://example.com/api/v2/countries",
        { origin: "https://attacker.example" }
      );
      await middleware(request);

      expect(mockNextResponseJson).not.toHaveBeenCalled();
      expect(mockNextResponseNext).toHaveBeenCalled();
    });

    // @req REQ-059
    it("treats a non-Bearer Authorization header as no key", async () => {
      const request = createMockRequest(
        "https://example.com/api/v2/countries",
        {
          authorization: "Basic abc123",
        }
      );
      await middleware(request);

      expect(validateApiKey).not.toHaveBeenCalled();
      expect(mockNextResponseJson).not.toHaveBeenCalled();
      expect(mockNextResponseNext).toHaveBeenCalled();
    });

    // A key id is the middleware's word about who called. Nothing reads it
    // today, but a client-sent one must never reach a handler as if it had
    // been validated.
    // @req REQ-059
    it("drops a client-sent x-api-key-id on an anonymous request", async () => {
      const request = createMockRequest(
        "https://example.com/api/v2/countries",
        {
          "x-api-key-id": "forged-partner-id",
        }
      );
      await middleware(request);

      expect(forwardedRequestHeaders()?.get("x-api-key-id")).toBeNull();
    });
  });

  // @req REQ-034
  it("rejects a present but invalid Bearer key with 401 invalid_api_key", async () => {
    vi.mocked(validateApiKey).mockResolvedValue({
      valid: false,
      reason: "invalid_api_key",
    });

    const request = createMockRequest("https://example.com/api/v2/peoples", {
      authorization: "Bearer bad-key",
    });
    await middleware(request);

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: "invalid_api_key" },
      { status: 401 }
    );
  });

  // @req REQ-034
  it("does not let a same-origin Origin mask an invalid Bearer key", async () => {
    vi.mocked(validateApiKey).mockResolvedValue({
      valid: false,
      reason: "invalid_api_key",
    });

    const request = createMockRequest("https://example.com/api/v2/countries", {
      authorization: "Bearer bad-key",
      origin: "https://example.com",
    });
    await middleware(request);

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: "invalid_api_key" },
      { status: 401 }
    );
  });

  it("should call NextResponse.next() with x-api-key-id header when key is valid", async () => {
    vi.mocked(validateApiKey).mockResolvedValue({
      valid: true,
      apiKeyId: "key-uuid-123",
      tier: "public",
    });

    const request = createMockRequest("https://example.com/api/v2/countries", {
      authorization: "Bearer valid-key",
    });
    await middleware(request);

    expect(mockNextResponseJson).not.toHaveBeenCalled();
    expect(mockNextResponseNext).toHaveBeenCalled();

    const passedHeaders = forwardedRequestHeaders();
    expect(passedHeaders).toBeDefined();
    expect(passedHeaders.get("x-api-key-id")).toBe("key-uuid-123");
  });

  // @req REQ-059
  it("answers a keyed request with the rate-limit headers of its tier", async () => {
    vi.mocked(validateApiKey).mockResolvedValue({
      valid: true,
      apiKeyId: "partner-id",
      tier: "partner",
    });
    vi.mocked(evaluateRateLimit).mockResolvedValueOnce({
      rejection: null,
      headers: { "X-RateLimit-Limit": "6000" },
    });

    const request = createMockRequest("https://example.com/api/v2/countries", {
      authorization: "Bearer partner-key",
    });
    await middleware(request);

    expect(mockResponseHeaders.get("X-RateLimit-Limit")).toBe("6000");
  });

  it("should skip auth for /api/v2/keys/issue (public endpoint)", async () => {
    const request = createMockRequest("https://example.com/api/v2/keys/issue");
    await middleware(request);

    // Should not return a 401
    expect(mockNextResponseJson).not.toHaveBeenCalledWith(
      { error: "missing_api_key" },
      { status: 401 }
    );
    // Should call NextResponse.next() for the normal flow
    expect(mockNextResponseNext).toHaveBeenCalled();
  });

  // @req REQ-056
  it("should skip api_keys Bearer auth for /api/v2/keys self-service endpoints (session-authenticated, ETNI-81)", async () => {
    // A Supabase session access token, not an api_keys row — must not be
    // rejected as an invalid API key before reaching the route handler,
    // which authenticates it itself.
    const request = createMockRequest("https://example.com/api/v2/keys", {
      authorization: "Bearer session-jwt",
    });
    await middleware(request);

    expect(validateApiKey).not.toHaveBeenCalled();
    expect(mockNextResponseJson).not.toHaveBeenCalledWith(
      { error: "invalid_api_key" },
      { status: 401 }
    );
    expect(mockNextResponseNext).toHaveBeenCalled();
  });

  // @req REQ-056
  it("should skip api_keys Bearer auth for /api/v2/keys/{id} revoke (ETNI-81)", async () => {
    const request = createMockRequest("https://example.com/api/v2/keys/key-1", {
      authorization: "Bearer session-jwt",
    });
    await middleware(request);

    expect(validateApiKey).not.toHaveBeenCalled();
    expect(mockNextResponseNext).toHaveBeenCalled();
  });

  it("should not apply auth logic for non-v2 routes", async () => {
    const request = createMockRequest("https://example.com/api/health");
    await middleware(request);

    expect(validateApiKey).not.toHaveBeenCalled();
    expect(mockNextResponseJson).not.toHaveBeenCalledWith(
      expect.objectContaining({ error: "missing_api_key" }),
      expect.anything()
    );
    expect(mockNextResponseNext).toHaveBeenCalled();
  });

  it("should extract the Bearer token and pass it to validateApiKey", async () => {
    vi.mocked(validateApiKey).mockResolvedValue({
      valid: true,
      apiKeyId: "test-id",
      tier: "public",
    });

    const request = createMockRequest(
      "https://example.com/api/v2/peoples/PPL_SHONA",
      {
        authorization: "Bearer my-secret-api-key",
      }
    );
    await middleware(request);

    expect(validateApiKey).toHaveBeenCalledWith("my-secret-api-key");
  });

  describe("rate limiting uses the DB-validated tier", () => {
    // @req REQ-059
    it("passes the partner tier from validateApiKey into evaluateRateLimit", async () => {
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: true,
        apiKeyId: "partner-id",
        tier: "partner",
      });

      const request = createMockRequest(
        "https://example.com/api/v2/countries",
        { authorization: "Bearer partner-key" }
      );
      await middleware(request);

      expect(evaluateRateLimit).toHaveBeenCalledWith(request, "partner");
    });

    // @req REQ-059
    it("falls back to the public tier bucket for an invalid key", async () => {
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: false,
        reason: "invalid_api_key",
      });

      const request = createMockRequest(
        "https://example.com/api/v2/countries",
        { authorization: "Bearer bad-key" }
      );
      await middleware(request);

      expect(evaluateRateLimit).toHaveBeenCalledWith(request, "public");
    });

    // @req REQ-059
    it("rate limits /api/v2/keys/issue in the anonymous bucket (no key validation)", async () => {
      const request = createMockRequest(
        "https://example.com/api/v2/keys/issue"
      );
      await middleware(request);

      expect(evaluateRateLimit).toHaveBeenCalledWith(request);
      expect(validateApiKey).not.toHaveBeenCalled();
    });
  });

  describe("IP pre-limit bounds validateApiKey", () => {
    // @req REQ-059
    it("applies the IP pre-limit before calling validateApiKey", async () => {
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: true,
        apiKeyId: "test-id",
        tier: "public",
      });

      const request = createMockRequest(
        "https://example.com/api/v2/countries",
        { authorization: "Bearer some-key" }
      );
      await middleware(request);

      expect(applyIpRateLimit).toHaveBeenCalledWith(request);
      const ipLimitOrder =
        vi.mocked(applyIpRateLimit).mock.invocationCallOrder[0];
      const validateOrder =
        vi.mocked(validateApiKey).mock.invocationCallOrder[0];
      expect(ipLimitOrder).toBeLessThan(validateOrder);
    });

    // @req REQ-059
    it("returns the 429 from the IP pre-limit and never calls validateApiKey", async () => {
      vi.mocked(applyIpRateLimit).mockResolvedValueOnce({
        status: 429,
        headers: new Headers(),
      } as unknown as Awaited<ReturnType<typeof applyIpRateLimit>>);

      const request = createMockRequest(
        "https://example.com/api/v2/countries",
        { authorization: "Bearer some-key" }
      );
      const response = await middleware(request);

      expect(validateApiKey).not.toHaveBeenCalled();
      expect(response.status).toBe(429);
    });
  });
});
