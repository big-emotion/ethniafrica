import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/api/logger";
import type { ApiKeyTier } from "@/lib/api/auth";

/** Re-exported for callers that only need the tier type, not auth internals. */
export type { ApiKeyTier };

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

const DEFAULT_IP_RPM = 60;
const DEFAULT_PUBLIC_RPM = 600;
const DEFAULT_PARTNER_RPM = 6000;
const DEFAULT_WINDOW = "1 m";

/**
 * Window strings accepted by @upstash/ratelimit (e.g. `"1 m"`, `"30 s"`).
 * Limited to a closed set so a typo in the env var cannot silently disable
 * limiting at runtime.
 */
type RateLimitWindow =
  | `${number} ms`
  | `${number} s`
  | `${number} m`
  | `${number} h`
  | `${number} d`;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseWindow(value: string | undefined): RateLimitWindow {
  const candidate = (value ?? DEFAULT_WINDOW).trim();
  if (/^\d+\s+(ms|s|m|h|d)$/.test(candidate)) {
    return candidate as RateLimitWindow;
  }
  return DEFAULT_WINDOW as RateLimitWindow;
}

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

  const ipRpm = parsePositiveInt(process.env.RATE_LIMIT_IP_RPM, DEFAULT_IP_RPM);
  const publicRpm = parsePositiveInt(
    process.env.RATE_LIMIT_PUBLIC_RPM,
    DEFAULT_PUBLIC_RPM
  );
  const partnerRpm = parsePositiveInt(
    process.env.RATE_LIMIT_PARTNER_RPM,
    DEFAULT_PARTNER_RPM
  );
  const window = parseWindow(process.env.RATE_LIMIT_WINDOW);

  limiters = {
    redis,
    ip: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(ipRpm, window),
      prefix: "rl:ip",
    }),
    public: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(publicRpm, window),
      prefix: "rl:public",
    }),
    partner: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(partnerRpm, window),
      prefix: "rl:partner",
    }),
  };

  return limiters;
}

/**
 * True only for a real production deployment.
 *
 * Vercel compiles every deployment with `NODE_ENV=production` — previews and
 * per-PR deployments included — so `NODE_ENV` alone cannot tell a preview from
 * the real site. `VERCEL_ENV` makes that distinction (`production` / `preview`
 * / `development`) and takes precedence whenever Vercel sets it. Outside Vercel
 * (self-hosted, local, CI) it is absent and `NODE_ENV` remains the authority.
 */
function isProductionDeployment(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv) return vercelEnv === "production";
  return process.env.NODE_ENV === "production";
}

/**
 * Return the appropriate Ratelimit instance for the request, or null for admin (unrestricted).
 * `tier` is the canonical api_keys.tier value from a validated DB record and defaults to
 * "public" when the caller has not (yet) resolved a tier, e.g. before key validation.
 */
export function getRateLimiter(
  apiKey: string | null,
  tier: ApiKeyTier = "public"
): Ratelimit | null {
  if (apiKey === null) {
    // No API key — IP-based
    return getLimiters().ip;
  }
  if (tier === "admin") return null;
  if (tier === "partner") return getLimiters().partner;
  // public tier
  return getLimiters().public;
}

/**
 * Apply rate limiting to a request.
 * Returns null if the request is allowed (pass-through), or a NextResponse(429) if limited.
 * `tier` should be the canonical api_keys.tier from a validated DB record (see
 * validateApiKey in @/lib/api/auth); callers that have not validated a key yet
 * (or don't have one) omit it and get the "public" default, which — combined with
 * apiKey being null when there's no Bearer token — resolves to IP-based limiting.
 * Returns a 500 response when required env vars are absent on a production
 * deployment (misconfiguration, not transient failure); preview and development
 * deployments fail open instead, so a staging environment without Upstash
 * credentials serves traffic unthrottled rather than 500-ing every route.
 * Fails open (returns null) if Upstash is transiently unreachable.
 */
export async function applyRateLimit(
  request: NextRequest,
  tier?: ApiKeyTier
): Promise<NextResponse | null> {
  // Guard against misconfiguration before entering the try/catch. A missing env var
  // is a deployment error — failing open here would silently disable all rate limiting.
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    if (!isProductionDeployment()) {
      logger.warn(
        "Rate limit disabled: UPSTASH env vars missing (non-production fail-open)",
        { tag: "rate_limit_dev_skip" }
      );
      return null;
    }
    logger.error(
      "Rate limit misconfigured: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required",
      undefined,
      { tag: "rate_limit_misconfigured" }
    );
    Sentry.captureException(
      new Error("Rate limit misconfigured: missing Upstash env vars")
    );
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }

  try {
    const { identifier, apiKey } = getRateLimitIdentifier(request);
    const limiter = getRateLimiter(apiKey, tier);

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
    logger.error("Rate limit check failed", error, {
      tag: "rate_limit_unavailable",
    });
    Sentry.captureException(error);
    // Fail open
    return null;
  }
}
