import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.hoisted runs before vi.mock factories, allowing shared references
const { mockLimit } = vi.hoisted(() => ({
  mockLimit: vi.fn(),
}));

// --- Mocks ---
vi.mock("@upstash/redis", () => {
  const Redis = vi.fn().mockImplementation(function () {
    return {};
  });
  return { Redis };
});

vi.mock("@upstash/ratelimit", () => {
  const Ratelimit = Object.assign(
    vi.fn().mockImplementation(function () {
      return { limit: mockLimit };
    }),
    {
      slidingWindow: vi.fn().mockReturnValue({ type: "sliding" }),
    }
  );
  return { Ratelimit };
});

vi.mock("@/lib/api/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Import AFTER mocks
import {
  getRateLimitIdentifier,
  getApiKeyTier,
  getRateLimiter,
  applyRateLimit,
  _resetLimitersForTest,
} from "@/lib/api/rate-limit";
import * as SentryMock from "@sentry/nextjs";
import { logger } from "@/lib/api/logger";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Typed references to mocked fns
const mockCaptureException = vi.mocked(SentryMock.captureException);
const mockLoggerError = vi.mocked(logger.error);
const MockRatelimit = vi.mocked(Ratelimit);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockRedis = vi.mocked(Redis as any);

function makeRequest(opts: { ip?: string; authHeader?: string; path?: string } = {}) {
  const url = `http://localhost${opts.path ?? "/api/v2/peoples"}`;
  const headers: Record<string, string> = {};
  if (opts.ip) headers["x-forwarded-for"] = opts.ip;
  if (opts.authHeader) headers["authorization"] = opts.authHeader;
  return new NextRequest(url, { headers });
}

/** Restore constructor mocks so lazy singletons can be created after clearAllMocks */
function restoreConstructorMocks() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MockRedis.mockImplementation(function () { return {} as any; });
  MockRatelimit.mockImplementation(function () {
    return { limit: mockLimit } as unknown as Ratelimit;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(Ratelimit.slidingWindow).mockReturnValue({ type: "sliding" } as any);
}

describe("getApiKeyTier", () => {
  beforeEach(() => {
    vi.stubEnv("RATE_LIMIT_ADMIN_KEYS", "admin-key-1,admin-key-2");
    vi.stubEnv("RATE_LIMIT_PARTNER_KEYS", "partner-key-1");
  });

  it("returns admin for admin keys", () => {
    expect(getApiKeyTier("admin-key-1")).toBe("admin");
    expect(getApiKeyTier("admin-key-2")).toBe("admin");
  });

  it("returns partner for partner keys", () => {
    expect(getApiKeyTier("partner-key-1")).toBe("partner");
  });

  it("returns public for unknown keys", () => {
    expect(getApiKeyTier("some-random-key")).toBe("public");
  });
});

describe("getRateLimitIdentifier", () => {
  it("returns ip identifier when no auth header", () => {
    const req = makeRequest({ ip: "1.2.3.4" });
    const result = getRateLimitIdentifier(req);
    expect(result.identifier).toBe("ip:1.2.3.4");
    expect(result.apiKey).toBeNull();
  });

  it("uses first IP from x-forwarded-for chain", () => {
    const req = makeRequest({ ip: "1.2.3.4, 5.6.7.8" });
    expect(getRateLimitIdentifier(req).identifier).toBe("ip:1.2.3.4");
  });

  it("returns ip:unknown when no x-forwarded-for and no auth", () => {
    const req = makeRequest();
    expect(getRateLimitIdentifier(req).identifier).toBe("ip:unknown");
  });

  it("returns key identifier from Bearer token", () => {
    const req = makeRequest({ authHeader: "Bearer my-api-key" });
    const result = getRateLimitIdentifier(req);
    expect(result.identifier).toBe("key:my-api-key");
    expect(result.apiKey).toBe("my-api-key");
  });
});

describe("getRateLimiter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetLimitersForTest();
    vi.stubEnv("RATE_LIMIT_ADMIN_KEYS", "admin-key-1");
    vi.stubEnv("RATE_LIMIT_PARTNER_KEYS", "partner-key-1");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    restoreConstructorMocks();
  });

  it("returns null for admin tier (unrestricted)", () => {
    expect(getRateLimiter("admin-key-1")).toBeNull();
  });

  it("returns a limiter for public tier", () => {
    const limiter = getRateLimiter("public-key");
    expect(limiter).not.toBeNull();
  });

  it("returns a limiter for partner tier", () => {
    const limiter = getRateLimiter("partner-key-1");
    expect(limiter).not.toBeNull();
  });

  it("returns a limiter for null (IP-based)", () => {
    const limiter = getRateLimiter(null);
    expect(limiter).not.toBeNull();
  });

  it("initialises all three limiters with correct slidingWindow arguments", () => {
    getRateLimiter(null); // triggers getLimiters() which calls slidingWindow for all tiers
    expect(Ratelimit.slidingWindow).toHaveBeenCalledWith(60, "1 m");
    expect(Ratelimit.slidingWindow).toHaveBeenCalledWith(600, "1 m");
    expect(Ratelimit.slidingWindow).toHaveBeenCalledWith(6000, "1 m");
    expect(Ratelimit.slidingWindow).toHaveBeenCalledTimes(3);
  });
});

describe("applyRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetLimitersForTest();
    // After clearAllMocks, restore constructor mocks so singletons are re-created correctly
    restoreConstructorMocks();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.stubEnv("RATE_LIMIT_ADMIN_KEYS", "admin-key");
    vi.stubEnv("RATE_LIMIT_PARTNER_KEYS", "partner-key");
  });

  it("returns null when rate limit passes (success: true)", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });
    const req = makeRequest({ ip: "1.2.3.4" });
    const result = await applyRateLimit(req);
    expect(result).toBeNull();
  });

  it("returns 429 response when rate limit exceeded (success: false)", async () => {
    const resetTime = Date.now() + 30000;
    mockLimit.mockResolvedValue({
      success: false,
      limit: 60,
      remaining: 0,
      reset: resetTime,
    });
    const req = makeRequest({ ip: "5.6.7.8" });
    const result = await applyRateLimit(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
    expect(result!.headers.get("Retry-After")).toBeDefined();
    expect(result!.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(result!.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(result!.headers.get("X-RateLimit-Reset")).toBeDefined();
    const body = await result!.json();
    expect(body.error).toBe("rate_limited");
    expect(typeof body.retry_after_seconds).toBe("number");
  });

  it("returns null (fail open) when Upstash throws, logs error, captures with Sentry", async () => {
    mockLimit.mockRejectedValue(new Error("Redis connection failed"));
    const req = makeRequest({ ip: "9.9.9.9" });
    const result = await applyRateLimit(req);
    expect(result).toBeNull();
    expect(mockLoggerError).toHaveBeenCalledWith(
      "Rate limit check failed",
      expect.any(Error),
      expect.objectContaining({ tag: "rate_limit_unavailable" })
    );
    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
  });

  it("returns null for admin tier API keys (unrestricted)", async () => {
    const req = makeRequest({ authHeader: "Bearer admin-key" });
    const result = await applyRateLimit(req);
    expect(result).toBeNull();
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it("calls limiter.limit with key: prefix for Bearer token requests", async () => {
    mockLimit.mockResolvedValue({ success: true, limit: 600, remaining: 599, reset: Date.now() + 60000 });
    const req = makeRequest({ authHeader: "Bearer public-key" });
    await applyRateLimit(req);
    expect(mockLimit).toHaveBeenCalledWith("key:public-key");
  });

  it("calls limiter.limit with ip: prefix for unauthenticated requests", async () => {
    mockLimit.mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 });
    const req = makeRequest({ ip: "10.0.0.1" });
    await applyRateLimit(req);
    expect(mockLimit).toHaveBeenCalledWith("ip:10.0.0.1");
  });

  it("returns 500 when Upstash env vars are missing", async () => {
    _resetLimitersForTest();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const req = makeRequest({ ip: "1.2.3.4" });
    const result = await applyRateLimit(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(500);
  });
});
