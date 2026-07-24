import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/api/logger";

export type FlagRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      retryAfter: number;
      limit?: number;
      remaining?: number;
      reset?: number;
    };

interface FlagLimiters {
  hourly: Ratelimit;
  daily: Ratelimit;
}

let limiters: FlagLimiters | null = null;

function getLimiters(url: string, token: string): FlagLimiters {
  if (limiters) return limiters;

  const redis = new Redis({ url, token });

  limiters = {
    hourly: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      prefix: "flags:rate-limit:hourly",
    }),
    daily: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "24 h"),
      prefix: "flags:rate-limit:daily",
    }),
  };

  return limiters;
}

// @req REQ-012
export function _resetFlagRateLimitForTest(): void {
  limiters = null;
}

// @req REQ-012
export async function checkFlagRateLimit(
  contributorId: string
): Promise<FlagRateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.warn("Flag rate limit disabled because Upstash is not configured", {
      tag: "flag_rate_limit_unavailable",
    });
    return { allowed: true };
  }

  try {
    const contributorKey = `flags:contributor:${contributorId}`;
    const { hourly, daily } = getLimiters(url, token);
    const results = await Promise.all([
      hourly.limit(contributorKey),
      daily.limit(contributorKey),
    ]);
    const denied = results.filter((result) => !result.success);

    if (denied.length === 0) return { allowed: true };

    const longestDenial = denied.reduce((longest, result) =>
      result.reset > longest.reset ? result : longest
    );
    const retryAfter = Math.max(
      0,
      Math.ceil((longestDenial.reset - Date.now()) / 1000)
    );

    return {
      allowed: false,
      retryAfter,
      limit: longestDenial.limit,
      remaining: longestDenial.remaining,
      reset: longestDenial.reset,
    };
  } catch (error) {
    logger.warn("Flag rate limit check failed; allowing submission", {
      error,
      tag: "flag_rate_limit_unavailable",
    });
    return { allowed: true };
  }
}
