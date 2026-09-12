import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/api/logger";
import type { ApiKeyTier } from "@/lib/api/auth";

/** Re-exported for callers that only need the tier type, not auth internals. */
export type { ApiKeyTier };

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

/**
 * The bucket a request is counted in: "key:<sha256 of the key>" or "ip:<ip>".
 *
 * The identifier becomes a Redis key name at Upstash. It used to be the raw
 * key, which put every live credential in plain sight of anyone who can list
 * the Redis instance. A digest separates keys exactly as well and reveals
 * nothing; unsalted is fine here because the keys are long random secrets,
 * not guessable passwords.
 */
// @req REQ-059
export async function getRateLimitIdentifier(request: NextRequest): Promise<{
  identifier: string;
  apiKey: string | null;
}> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7).trim();
    if (apiKey) {
      return { identifier: `key:${await sha256Hex(apiKey)}`, apiKey };
    }
  }
  return { identifier: `ip:${getClientIp(request)}`, apiKey: null };
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
// @req REQ-059
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
// @req REQ-059
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
 * What the limiter decided about one request.
 *
 * `rejection` is a response to return as-is — a 429, or the 500 of a
 * production deployment with no Upstash configured. `headers` are the quota
 * headers for a request that is let through, empty when no limiter ran.
 */
export interface RateLimitDecision {
  rejection: NextResponse | null;
  headers: Record<string, string>;
}

const unmetered = (): RateLimitDecision => ({ rejection: null, headers: {} });

/**
 * Guard against misconfiguration before entering a limiter's try/catch. A missing
 * env var is a deployment error — failing open here would silently disable all
 * rate limiting. Returns "ok" when Upstash is configured and the caller should
 * proceed; otherwise returns the decision the caller should return immediately
 * (a 500 in production, unmetered fail-open elsewhere).
 */
function checkUpstashConfigured(): RateLimitDecision | "ok" {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return "ok";
  }
  if (!isProductionDeployment()) {
    logger.warn(
      "Rate limit disabled: UPSTASH env vars missing (non-production fail-open)",
      { tag: "rate_limit_dev_skip" }
    );
    return unmetered();
  }
  logger.error(
    "Rate limit misconfigured: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required",
    undefined,
    { tag: "rate_limit_misconfigured" }
  );
  Sentry.captureException(
    new Error("Rate limit misconfigured: missing Upstash env vars")
  );
  return {
    rejection: NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    ),
    headers: {},
  };
}

/**
 * Run a resolved limiter against an identifier, converting the Upstash result
 * into a decision and failing open on transient errors.
 */
async function runLimiter(
  identifier: string,
  limiter: Ratelimit | null
): Promise<RateLimitDecision> {
  // Admin keys are unrestricted
  if (limiter === null) return unmetered();

  try {
    const result = await limiter.limit(identifier);
    const headers = {
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.reset),
    };

    if (result.success) return { rejection: null, headers };

    const resetInSeconds = Math.ceil((result.reset - Date.now()) / 1000);
    const retryAfter = Math.max(0, resetInSeconds);

    const response = NextResponse.json(
      { error: "rate_limited", retry_after_seconds: retryAfter },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(retryAfter));
    for (const [name, value] of Object.entries(headers)) {
      response.headers.set(name, value);
    }

    return { rejection: response, headers };
  } catch (error) {
    logger.error("Rate limit check failed", error, {
      tag: "rate_limit_unavailable",
    });
    Sentry.captureException(error);
    // Fail open
    return unmetered();
  }
}

/**
 * Rate limit a request and report both outcomes: the rejection to return, or
 * the quota headers to put on the response that is let through.
 *
 * `tier` should be the canonical api_keys.tier from a validated DB record (see
 * validateApiKey in @/lib/api/auth); callers that have not validated a key yet
 * (or don't have one) omit it and get the "public" default, which — combined
 * with apiKey being null when there's no Bearer token — resolves to IP-based
 * limiting. Preview and development deployments without Upstash credentials
 * fail open; production answers 500. Fails open if Upstash is transiently
 * unreachable.
 */
// @req REQ-059
export async function evaluateRateLimit(
  request: NextRequest,
  tier?: ApiKeyTier
): Promise<RateLimitDecision> {
  const configCheck = checkUpstashConfigured();
  if (configCheck !== "ok") return configCheck;

  const { identifier, apiKey } = await getRateLimitIdentifier(request);
  return runLimiter(identifier, getRateLimiter(apiKey, tier));
}

/**
 * Apply rate limiting to a request.
 * Returns null if the request is allowed (pass-through), or the NextResponse
 * to return (429, or 500 on a misconfigured production). The quota headers of
 * an allowed request are only available through `evaluateRateLimit`.
 */
// @req REQ-034 REQ-059
export async function applyRateLimit(
  request: NextRequest,
  tier?: ApiKeyTier
): Promise<NextResponse | null> {
  return (await evaluateRateLimit(request, tier)).rejection;
}

/**
 * IP-only pre-limit, independent of any Bearer token or tier. Bounds the
 * expensive DB lookup + PBKDF2 comparison inside validateApiKey (see
 * middleware.ts) so a flood of requests with distinct or invalid keys from a
 * single IP can't force unlimited validation attempts before a tier — and
 * therefore the real tier-based limit above — is known.
 */
// @req REQ-059
export async function applyIpRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const configCheck = checkUpstashConfigured();
  if (configCheck !== "ok") return configCheck.rejection;

  return (await runLimiter(`ip:${getClientIp(request)}`, getRateLimiter(null)))
    .rejection;
}
