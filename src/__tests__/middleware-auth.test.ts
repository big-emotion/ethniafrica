import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- mock validateApiKey before importing middleware ---
vi.mock("@/lib/api/auth", () => ({
  validateApiKey: vi.fn(),
}));

// Rate limiting is exercised by its own test file; here it must always
// pass-through so the auth branch is the only thing under test.
vi.mock("@/lib/api/rate-limit", () => ({
  applyRateLimit: vi.fn().mockResolvedValue(null),
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

    const mockNextResponseJson = vi.fn(
      (body: unknown, init?: { status?: number }) => {
        return { status: init?.status ?? 200, body };
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
import { middleware } from "../middleware";

function createMockRequest(url: string, headers: Record<string, string> = {}) {
  const parsedUrl = new URL(url);
  return {
    url,
    nextUrl: parsedUrl,
    headers: new Headers({ host: parsedUrl.host, ...headers }),
  } as unknown as Parameters<typeof middleware>[0];
}

describe("middleware - /api/v2/* authentication", () => {
  beforeEach(() => {
    mockResponseHeaders.clear();
    vi.clearAllMocks();
    // The auth gate is intentionally disabled outside production (devBypass).
    // Pin NODE_ENV=production so this suite exercises the real gate rather
    // than the dev fail-open.
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return 401 with missing_api_key when no Authorization header", async () => {
    const request = createMockRequest("https://example.com/api/v2/countries");
    await middleware(request);

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: "missing_api_key" },
      { status: 401 }
    );
  });

  it("should return 401 with missing_api_key when Authorization header is not Bearer", async () => {
    const request = createMockRequest("https://example.com/api/v2/countries", {
      authorization: "Basic abc123",
    });
    await middleware(request);

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: "missing_api_key" },
      { status: 401 }
    );
  });

  it("should return 401 with invalid_api_key when key fails validation", async () => {
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

  it("should call NextResponse.next() with x-api-key-id header when key is valid", async () => {
    vi.mocked(validateApiKey).mockResolvedValue({
      valid: true,
      apiKeyId: "key-uuid-123",
    });

    const request = createMockRequest("https://example.com/api/v2/countries", {
      authorization: "Bearer valid-key",
    });
    await middleware(request);

    expect(mockNextResponseJson).not.toHaveBeenCalled();
    expect(mockNextResponseNext).toHaveBeenCalled();

    const passedHeaders: Headers =
      mockNextResponseNext.mock.calls[0][0]?.request?.headers;
    expect(passedHeaders).toBeDefined();
    expect(passedHeaders.get("x-api-key-id")).toBe("key-uuid-123");
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

  describe("same-origin bypass", () => {
    it("bypasses API key requirement when Origin matches request host", async () => {
      const request = createMockRequest(
        "https://example.com/api/v2/countries",
        {
          origin: "https://example.com",
        }
      );
      await middleware(request);

      expect(mockNextResponseJson).not.toHaveBeenCalled();
      expect(mockNextResponseNext).toHaveBeenCalled();

      const passedHeaders: Headers =
        mockNextResponseNext.mock.calls[0][0]?.request?.headers;
      expect(passedHeaders?.get("x-api-key-id")).toBe("same-origin");
    });

    it("bypasses API key requirement when Referer matches request host", async () => {
      const request = createMockRequest(
        "https://example.com/api/v2/language-families",
        {
          referer: "https://example.com/fr",
        }
      );
      await middleware(request);

      expect(mockNextResponseJson).not.toHaveBeenCalled();
      expect(mockNextResponseNext).toHaveBeenCalled();
    });

    it("returns 401 when Origin is cross-origin", async () => {
      const request = createMockRequest(
        "https://example.com/api/v2/countries",
        {
          origin: "https://attacker.com",
        }
      );
      await middleware(request);

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { error: "missing_api_key" },
        { status: 401 }
      );
    });

    it("returns 401 when Referer is cross-origin", async () => {
      const request = createMockRequest(
        "https://example.com/api/v2/countries",
        {
          referer: "https://attacker.com/page",
        }
      );
      await middleware(request);

      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { error: "missing_api_key" },
        { status: 401 }
      );
    });

    it("still validates Bearer token when both API key and same-origin headers are present", async () => {
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: false,
        reason: "invalid_api_key",
      });

      const request = createMockRequest(
        "https://example.com/api/v2/countries",
        {
          authorization: "Bearer bad-key",
          origin: "https://example.com",
        }
      );
      await middleware(request);

      // Bearer key wins: a present-but-invalid key must not be masked by same-origin
      expect(mockNextResponseJson).toHaveBeenCalledWith(
        { error: "invalid_api_key" },
        { status: 401 }
      );
    });
  });

  it("should extract the Bearer token and pass it to validateApiKey", async () => {
    vi.mocked(validateApiKey).mockResolvedValue({
      valid: true,
      apiKeyId: "test-id",
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
});
