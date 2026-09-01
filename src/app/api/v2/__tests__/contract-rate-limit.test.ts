/**
 * The 429 path lives entirely in src/middleware.ts + src/lib/api/rate-limit.ts
 * (ETNI-84 / FR33) — route-level unit tests call a route's exported GET/POST
 * directly and never go through middleware, so they cannot exercise this at
 * all (see contract.test.ts's own header comment). This file drives the real
 * `middleware()` function end-to-end for a representative /v2 request, with
 * only Upstash mocked (the same @upstash/redis + @upstash/ratelimit mock
 * shape as src/lib/api/__tests__/rate-limit.test.ts, for consistency).
 *
 * Deliberately not validated against the OpenAPI spec's documented 429
 * response: none of the 6 non-flags routes that declare a 429 (search
 * included) document a `content` schema for it — only headers — because the
 * real body (`{error, retry_after_seconds}`) never went through
 * createApiError/the ApiErrorEnvelope. That is a pre-existing spec gap
 * distinct from flags' own contributor-rate-limit 429, which *does* use
 * ApiErrorEnvelope. This test asserts the actual runtime shape instead of
 * inventing spec content beyond this ticket's scope.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockLimit } = vi.hoisted(() => ({ mockLimit: vi.fn() }));

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    vi.fn().mockImplementation(function () {
      return { limit: mockLimit };
    }),
    { slidingWindow: vi.fn().mockReturnValue({ type: "sliding" }) }
  ),
}));

import { middleware } from "@/middleware";
import { _resetLimitersForTest } from "@/lib/api/rate-limit";

describe("contract: 429 rate-limit path (middleware + Upstash)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    _resetLimitersForTest();
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    _resetLimitersForTest();
  });

  // @req REQ-033
  it("returns 429 with Retry-After and rate-limit headers when Upstash reports the limit exceeded", async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 60,
      remaining: 0,
      reset: Date.now() + 42_000,
    });

    const response = await middleware(
      new NextRequest("http://localhost/api/v2/search?q=test")
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    const retryAfter = Number(response.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);

    const body = await response.json();
    expect(body).toEqual({
      error: "rate_limited",
      retry_after_seconds: expect.any(Number),
    });
  });

  // @req REQ-033
  it("passes a request through untouched when Upstash reports it within the limit", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60_000,
    });

    const response = await middleware(
      new NextRequest("http://localhost/api/v2/search?q=test")
    );

    expect(response.status).not.toBe(429);
  });

  // @req REQ-033
  it("is deterministic and repeatable: two limited requests in a row both 429", async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 60,
      remaining: 0,
      reset: Date.now() + 10_000,
    });

    const first = await middleware(
      new NextRequest("http://localhost/api/v2/search?q=test")
    );
    const second = await middleware(
      new NextRequest("http://localhost/api/v2/search?q=test")
    );

    expect(first.status).toBe(429);
    expect(second.status).toBe(429);
  });
});
