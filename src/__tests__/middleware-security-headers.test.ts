import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { NextRequest, NextResponse } from "next/server";

import { validateApiKey } from "@/lib/api/auth";
import { evaluateRateLimit } from "@/lib/api/rate-limit";
import { createServerClient } from "@supabase/ssr";
import { middleware } from "../middleware";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("@/lib/api/rate-limit", () => ({
  evaluateRateLimit: vi.fn(),
  applyIpRateLimit: vi.fn().mockResolvedValue(null),
}));

const connectSrcOf = (response: Response) =>
  response.headers
    .get("Content-Security-Policy")!
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith("connect-src"))!;

const pageResponse = () =>
  middleware(new NextRequest("http://localhost:3000/fr"));

/**
 * The baseline every response the middleware answers must carry, whether it
 * forwards the request or answers it itself. A redirect or an error is still
 * a document a browser holds, and HSTS in particular only protects the next
 * visit if the response that set it was served.
 */
function expectSecurityHeaders(response: Response) {
  expect(response.headers.get("Strict-Transport-Security")).toBe(
    "max-age=31536000; includeSubDomains; preload"
  );
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(response.headers.get("Referrer-Policy")).toBe(
    "strict-origin-when-cross-origin"
  );
  expect(response.headers.get("Permissions-Policy")).toContain("camera=()");
  expect(response.headers.get("Content-Security-Policy")).toContain(
    "default-src 'self'"
  );
}

describe("middleware security headers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SITE_LOCALE_MODE", "fr-only");
    vi.mocked(evaluateRateLimit).mockResolvedValue({
      rejection: null,
      headers: {},
    });
    (createServerClient as Mock).mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Permissions-Policy", () => {
    // @req REQ-052
    it("denies the powerful features the atlas never uses", async () => {
      const policy = (await pageResponse()).headers.get("Permissions-Policy")!;

      for (const feature of [
        "camera",
        "microphone",
        "geolocation",
        "payment",
        "usb",
        "serial",
        "hid",
        "bluetooth",
        "display-capture",
      ]) {
        expect(policy, feature).toContain(`${feature}=()`);
      }
    });

    // Copy-to-clipboard and the native share sheet are used by the citation
    // block, the comparer and the quiz score page: denying them would break
    // features readers rely on.
    // @req REQ-052
    it("leaves clipboard writing and the share sheet available", async () => {
      const policy = (await pageResponse()).headers.get("Permissions-Policy")!;

      expect(policy).not.toContain("clipboard-write");
      expect(policy).not.toContain("web-share");
    });
  });

  describe("responses the middleware answers itself", () => {
    // @req REQ-052
    it("secures the 307 root redirect", async () => {
      const response = await middleware(
        new NextRequest("http://localhost:3000/")
      );

      expect(response.status).toBe(307);
      expectSecurityHeaders(response);
    });

    // @req REQ-052
    it("secures a 308 legacy relocation", async () => {
      const response = await middleware(
        new NextRequest("http://localhost:3000/fr/peuples-hub")
      );

      expect(response.status).toBe(308);
      expectSecurityHeaders(response);
    });

    // @req REQ-052
    it("secures the 307 sign-in redirect of the console", async () => {
      const response = await middleware(
        new NextRequest("http://localhost:3000/fr/admin/dashboard")
      );

      expect(response.status).toBe(307);
      expectSecurityHeaders(response);
    });

    // @req REQ-052
    it("secures the 401 answered to an invalid key", async () => {
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: false,
        reason: "invalid_api_key",
      });

      const response = await middleware(
        new NextRequest("http://localhost:3000/api/v2/countries", {
          headers: { authorization: "Bearer bad-key" },
        })
      );

      expect(response.status).toBe(401);
      expectSecurityHeaders(response);
    });

    // @req REQ-052
    it("secures the 429 answered by the rate limiter", async () => {
      vi.mocked(evaluateRateLimit).mockResolvedValue({
        rejection: NextResponse.json(
          { error: "rate_limited" },
          { status: 429 }
        ),
        headers: {},
      });

      const response = await middleware(
        new NextRequest("http://localhost:3000/api/v2/countries")
      );

      expect(response.status).toBe(429);
      expectSecurityHeaders(response);
    });
  });

  describe("connect-src is built from configuration", () => {
    // @req REQ-052
    it("names the configured hosted Supabase project rather than every project", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcd1234.supabase.co");

      const connectSrc = connectSrcOf(await pageResponse());

      expect(connectSrc).toContain("https://abcd1234.supabase.co");
      expect(connectSrc).not.toContain("*.supabase.co");
    });

    // @req REQ-052
    it("names a self-hosted Supabase origin", async () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SUPABASE_URL",
        "https://supabase.example.org/rest/v1"
      );

      expect(connectSrcOf(await pageResponse())).toContain(
        "https://supabase.example.org"
      );
    });

    // @req REQ-052
    it("falls back to the production Supabase origin when the URL is unusable", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not a url");

      expect(connectSrcOf(await pageResponse())).toContain(
        "https://supabase.ethniafrica.com"
      );
    });

    // @req REQ-052
    it("derives the Sentry ingest origin from the configured DSN", async () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SENTRY_DSN",
        "https://publickey@o123456.ingest.de.sentry.io/789"
      );

      const connectSrc = connectSrcOf(await pageResponse());

      expect(connectSrc).toContain("https://o123456.ingest.de.sentry.io");
      expect(connectSrc).not.toContain("publickey");
    });

    // @req REQ-052
    it("names no Sentry host when no DSN is configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");

      expect(connectSrcOf(await pageResponse())).not.toContain("sentry");
    });

    // The browser never talks to Upstash: rate limiting runs in the
    // middleware, server-side. Allowing it only widened what injected script
    // could exfiltrate to.
    // @req REQ-052
    it("allows neither Upstash nor any wildcard host", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcd1234.supabase.co");
      vi.stubEnv(
        "NEXT_PUBLIC_SENTRY_DSN",
        "https://publickey@o123456.ingest.de.sentry.io/789"
      );

      const connectSrc = connectSrcOf(await pageResponse());

      expect(connectSrc).not.toContain("upstash");
      expect(connectSrc).not.toContain("*");
    });

    // @req REQ-052
    it("keeps a per-request nonce on script-src", async () => {
      const first = await pageResponse();
      const second = await pageResponse();
      const nonceOf = (response: Response) =>
        response.headers
          .get("Content-Security-Policy")!
          .match(/'nonce-([^']+)'/)?.[1];

      expect(nonceOf(first)).toBeDefined();
      expect(nonceOf(first)).not.toBe(nonceOf(second));
    });
  });
});
