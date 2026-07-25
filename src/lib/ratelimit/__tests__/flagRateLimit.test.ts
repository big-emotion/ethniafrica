import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockHourlyLimit, mockDailyLimit } = vi.hoisted(() => ({
  mockHourlyLimit: vi.fn(),
  mockDailyLimit: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

vi.mock("@upstash/ratelimit", () => {
  const Ratelimit = Object.assign(
    vi
      .fn()
      .mockImplementationOnce(function () {
        return { limit: mockHourlyLimit };
      })
      .mockImplementationOnce(function () {
        return { limit: mockDailyLimit };
      }),
    {
      slidingWindow: vi.fn().mockReturnValue({ type: "sliding" }),
    }
  );

  return { Ratelimit };
});

vi.mock("@/lib/api/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/api/logger";
import {
  _resetFlagRateLimitForTest,
  checkFlagRateLimit,
} from "@/lib/ratelimit/flagRateLimit";

const MockRatelimit = vi.mocked(Ratelimit);
const MockRedis = vi.mocked(Redis);
const mockLoggerWarn = vi.mocked(logger.warn);

function restoreConstructors(): void {
  MockRedis.mockImplementation(function () {
    return {};
  });
  MockRatelimit.mockImplementationOnce(function () {
    return { limit: mockHourlyLimit } as unknown as Ratelimit;
  }).mockImplementationOnce(function () {
    return { limit: mockDailyLimit } as unknown as Ratelimit;
  });
  vi.mocked(Ratelimit.slidingWindow).mockReturnValue({
    type: "sliding",
  } as never);
}

describe("checkFlagRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    _resetFlagRateLimitForTest();
    restoreConstructors();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // @req REQ-012
  it("allows a contributor when both standard windows have capacity", async () => {
    mockHourlyLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60 * 60 * 1000,
    });
    mockDailyLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      reset: Date.now() + 24 * 60 * 60 * 1000,
    });

    await expect(checkFlagRateLimit("user-123")).resolves.toEqual({
      allowed: true,
    });
    expect(mockHourlyLimit).toHaveBeenCalledWith("flags:contributor:user-123");
    expect(mockDailyLimit).toHaveBeenCalledWith("flags:contributor:user-123");
  });

  // @req REQ-012
  it("creates and caches the 10/hour and 30/day sliding-window limiters", async () => {
    mockHourlyLimit.mockResolvedValue({ success: true });
    mockDailyLimit.mockResolvedValue({ success: true });

    await checkFlagRateLimit("user-123");
    await checkFlagRateLimit("user-456");

    expect(Redis).toHaveBeenCalledTimes(1);
    expect(Ratelimit.slidingWindow).toHaveBeenCalledWith(10, "1 h");
    expect(Ratelimit.slidingWindow).toHaveBeenCalledWith(30, "24 h");
    expect(Ratelimit.slidingWindow).toHaveBeenCalledTimes(2);
    expect(Ratelimit).toHaveBeenCalledTimes(2);
  });

  // @req REQ-012
  it("returns the denied window metadata and retry delay", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    mockHourlyLimit.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: now + 30_001,
    });
    mockDailyLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 15,
      reset: now + 60_000,
    });

    await expect(checkFlagRateLimit("user-123")).resolves.toEqual({
      allowed: false,
      retryAfter: 31,
      limit: 10,
      remaining: 0,
      reset: now + 30_001,
    });
  });

  // @req REQ-012
  it("returns the longest necessary retry delay when both windows deny", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    mockHourlyLimit.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: now + 30_000,
    });
    mockDailyLimit.mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      reset: now + 90_000,
    });

    await expect(checkFlagRateLimit("user-123")).resolves.toEqual({
      allowed: false,
      retryAfter: 90,
      limit: 30,
      remaining: 0,
      reset: now + 90_000,
    });
  });

  // @req REQ-012
  it("fails open and warns when Upstash configuration is missing", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    await expect(checkFlagRateLimit("user-123")).resolves.toEqual({
      allowed: true,
    });
    expect(Redis).not.toHaveBeenCalled();
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "Flag rate limit disabled because Upstash is not configured",
      expect.objectContaining({ tag: "flag_rate_limit_unavailable" })
    );
  });

  // @req REQ-012
  it("fails open and warns when Redis rejects a limit check", async () => {
    const error = new Error("Redis unavailable");
    mockHourlyLimit.mockRejectedValue(error);
    mockDailyLimit.mockResolvedValue({ success: true });

    await expect(checkFlagRateLimit("user-123")).resolves.toEqual({
      allowed: true,
    });
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "Flag rate limit check failed; allowing submission",
      expect.objectContaining({
        error,
        tag: "flag_rate_limit_unavailable",
      })
    );
  });
});
