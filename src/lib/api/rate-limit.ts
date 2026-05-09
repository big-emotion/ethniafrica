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

// Lazy-initialise the Redis client once
let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

// Cached limiters
let ipLimiter: Ratelimit | null = null;
let publicLimiter: Ratelimit | null = null;
let partnerLimiter: Ratelimit | null = null;

/** Return the appropriate Ratelimit instance for the request, or null for admin (unrestricted) */
export function getRateLimiter(apiKey: string | null): Ratelimit | null {
  if (apiKey !== null) {
    const tier = getApiKeyTier(apiKey);
    if (tier === "admin") return null;
    if (tier === "partner") {
      if (!partnerLimiter) {
        partnerLimiter = new Ratelimit({
          redis: getRedis(),
          limiter: Ratelimit.slidingWindow(6000, "1 m"),
          prefix: "rl:partner",
        });
      }
      return partnerLimiter;
    }
    // public tier
    if (!publicLimiter) {
      publicLimiter = new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(600, "1 m"),
        prefix: "rl:public",
      });
    }
    return publicLimiter;
  }

  // No API key — IP-based
  if (!ipLimiter) {
    ipLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "rl:ip",
    });
  }
  return ipLimiter;
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
