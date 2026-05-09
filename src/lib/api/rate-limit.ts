import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/api/logger";

/** API key tiers */
export type ApiKeyTier = "public" | "partner" | "admin";

/**
 * Resolve the tier from the API key value (via env config or simple prefix convention).
 * Reads from env vars:
 * - RATE_LIMIT_ADMIN_KEYS: comma-separated admin key values
 * - RATE_LIMIT_PARTNER_KEYS: comma-separated partner key values
 * - All other authenticated keys are "public" tier
 */
export function getApiKeyTier(apiKey: string): ApiKeyTier {
  const adminKeys = (process.env.RATE_LIMIT_ADMIN_KEYS ?? "").split(",").filter(Boolean);
  const partnerKeys = (process.env.RATE_LIMIT_PARTNER_KEYS ?? "").split(",").filter(Boolean);
  if (adminKeys.includes(apiKey)) return "admin";
  if (partnerKeys.includes(apiKey)) return "partner";
  return "public";
}

/** Extract identifier from request: "key:<apikey>" or "ip:<ip>" */
export function getRateLimitIdentifier(request: NextRequest): {
  identifier: string;
  apiKey: string | null;
} {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7).trim();
    if (apiKey) return { identifier: `key:${apiKey}`, apiKey };
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return { identifier: `ip:${ip}`, apiKey: null };
}

/** All per-tier Ratelimit instances, created together in one synchronous pass */
interface Limiters {
  redis: Redis;
  ip: Ratelimit;
  public: Ratelimit;
  partner: Ratelimit;
}

let limiters: Limiters | null = null;

/**
 * Reset the cached limiter bundle. Only intended for use in unit tests.
 * @internal
 */
export function _resetLimitersForTest(): void {
  limiters = null;
}

/**
 * Return the cached Limiters bundle, creating it on first call.
 * Initialisation is synchronous so it is inherently race-free in the
 * single-threaded JS runtime — no two callers can observe `limiters === null`
 * and both proceed to construct new instances.
 *
 * Throws immediately with a clear message when required env vars are absent,
 * so the catch block in applyRateLimit can correctly distinguish a
 * configuration error from a transient Upstash failure.
 */
function getLimiters(): Limiters {
  if (limiters !== null) return limiters;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Upstash env vars not configured: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required"
    );
  }

  const redis = new Redis({ url, token });

  limiters = {
    redis,
    ip: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "rl:ip",
    }),
    public: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(600, "1 m"),
      prefix: "rl:public",
    }),
    partner: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(6000, "1 m"),
      prefix: "rl:partner",
    }),
  };

  return limiters;
}

/** Return the appropriate Ratelimit instance for the request, or null for admin (unrestricted) */
export function getRateLimiter(apiKey: string | null): Ratelimit | null {
  if (apiKey !== null) {
    const tier = getApiKeyTier(apiKey);
    if (tier === "admin") return null;
    if (tier === "partner") return getLimiters().partner;
    // public tier
    return getLimiters().public;
  }
  // No API key — IP-based
  return getLimiters().ip;
}

/**
 * Apply rate limiting to a request.
 * Returns null if the request is allowed (pass-through), or a NextResponse(429) if limited.
 * Fails open (returns null) if Upstash is unreachable.
 */
export async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  try {
    const { identifier, apiKey } = getRateLimitIdentifier(request);
    const limiter = getRateLimiter(apiKey);

    // Admin keys are unrestricted
    if (limiter === null) return null;

    const result = await limiter.limit(identifier);

    if (result.success) return null;

    const resetInSeconds = Math.ceil((result.reset - Date.now()) / 1000);
    const retryAfter = Math.max(0, resetInSeconds);

    const response = NextResponse.json(
      { error: "rate_limited", retry_after_seconds: retryAfter },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(retryAfter));
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.reset));

    return response;
  } catch (error) {
    logger.error("Rate limit check failed", error, { tag: "rate_limit_unavailable" });
    Sentry.captureException(error);
    // Fail open
    return null;
  }
}
