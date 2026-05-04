import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock NextResponse before importing middleware
const mockHeaders = new Map<string, string>();
const mockRequestHeaders = new Map<string, string>();

const mockNextResponse = {
  headers: {
    set: vi.fn((key: string, value: string) => {
      mockHeaders.set(key, value);
    }),
    get: vi.fn((key: string) => mockHeaders.get(key)),
  },
};

vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn(
      (init?: { request?: { headers?: Headers } }) => {
        // Capture request headers forwarded by middleware (e.g. x-nonce)
        if (init?.request?.headers) {
          for (const [key, value] of init.request.headers.entries()) {
            mockRequestHeaders.set(key, value);
          }
        }
        return mockNextResponse;
      }
    ),
  },
}));

import { middleware, config } from "../middleware";

describe("middleware", () => {
  beforeEach(() => {
    mockHeaders.clear();
    mockRequestHeaders.clear();
    vi.clearAllMocks();
  });

  const createMockRequest = (url = "https://example.com/test") => {
    const headers = new Headers({ host: "example.com" });
    return {
      url,
      nextUrl: new URL(url),
      headers,
    } as unknown as Parameters<typeof middleware>[0];
  };

  it("should return a response with all required security headers", () => {
    const request = createMockRequest();
    const response = middleware(request);

    expect(response).toBeDefined();
    expect(mockHeaders.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains; preload"
    );
    expect(mockHeaders.get("X-Content-Type-Options")).toBe("nosniff");
    expect(mockHeaders.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
    expect(mockHeaders.get("Content-Security-Policy")).toBeDefined();
  });

  it("should set Strict-Transport-Security header correctly", () => {
    const request = createMockRequest();
    middleware(request);

    expect(mockNextResponse.headers.set).toHaveBeenCalledWith(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  });

  it("should set X-Content-Type-Options header correctly", () => {
    const request = createMockRequest();
    middleware(request);

    expect(mockNextResponse.headers.set).toHaveBeenCalledWith(
      "X-Content-Type-Options",
      "nosniff"
    );
  });

  it("should set Referrer-Policy header correctly", () => {
    const request = createMockRequest();
    middleware(request);

    expect(mockNextResponse.headers.set).toHaveBeenCalledWith(
      "Referrer-Policy",
      "strict-origin-when-cross-origin"
    );
  });

  it("should set Content-Security-Policy header with correct directives", () => {
    const request = createMockRequest();
    middleware(request);

    const cspCall = vi
      .mocked(mockNextResponse.headers.set)
      .mock.calls.find((call) => call[0] === "Content-Security-Policy");

    expect(cspCall).toBeDefined();
    const cspValue = cspCall![1];

    expect(cspValue).toContain("default-src 'self'");
    expect(cspValue).toContain("img-src 'self' data:");
    expect(cspValue).toContain("frame-ancestors 'self'");

    // style-src must use nonce, not unsafe-inline
    const styleSrcDirective = cspValue
      .split(";")
      .map((d: string) => d.trim())
      .find((d: string) => d.startsWith("style-src"));
    expect(styleSrcDirective).toBeDefined();
    expect(styleSrcDirective).not.toContain("'unsafe-inline'");
    expect(styleSrcDirective).toMatch(/'nonce-[^']+'/);
    expect(styleSrcDirective).toContain("'self'");
  });

  it("should not include 'unsafe-inline' in script-src", () => {
    const request = createMockRequest();
    middleware(request);

    const cspCall = vi
      .mocked(mockNextResponse.headers.set)
      .mock.calls.find((call) => call[0] === "Content-Security-Policy");

    expect(cspCall).toBeDefined();
    const cspValue = cspCall![1];

    // 'unsafe-inline' must be absent from script-src (hashed/nonce model)
    const scriptSrcDirective = cspValue
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src"));

    expect(scriptSrcDirective).toBeDefined();
    expect(scriptSrcDirective).not.toContain("'unsafe-inline'");
  });

  it("should include a per-request nonce in script-src and forward it via x-nonce header", () => {
    const request = createMockRequest();
    middleware(request);

    const cspCall = vi
      .mocked(mockNextResponse.headers.set)
      .mock.calls.find((call) => call[0] === "Content-Security-Policy");

    expect(cspCall).toBeDefined();
    const cspValue = cspCall![1];

    // script-src must contain a nonce directive
    const nonceMatch = cspValue.match(/'nonce-([^']+)'/);
    expect(nonceMatch).not.toBeNull();
    const nonceInCsp = nonceMatch![1];

    // The same nonce must be forwarded to the document via x-nonce request header
    const forwardedNonce = mockRequestHeaders.get("x-nonce");
    expect(forwardedNonce).toBeDefined();
    expect(forwardedNonce).toBe(nonceInCsp);
  });

  it("should generate a different nonce for each request", () => {
    const request1 = createMockRequest("https://example.com/page1");
    middleware(request1);
    const cspCall1 = vi
      .mocked(mockNextResponse.headers.set)
      .mock.calls.find((call) => call[0] === "Content-Security-Policy");
    const nonce1 = cspCall1![1].match(/'nonce-([^']+)'/)?.[1];

    mockHeaders.clear();
    mockRequestHeaders.clear();
    vi.clearAllMocks();

    const request2 = createMockRequest("https://example.com/page2");
    middleware(request2);
    const cspCall2 = vi
      .mocked(mockNextResponse.headers.set)
      .mock.calls.find((call) => call[0] === "Content-Security-Policy");
    const nonce2 = cspCall2![1].match(/'nonce-([^']+)'/)?.[1];

    expect(nonce1).toBeDefined();
    expect(nonce2).toBeDefined();
    expect(nonce1).not.toBe(nonce2);
  });
});

describe("config", () => {
  it("should export a config with matcher", () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
  });

  it("should have a matcher that excludes static assets and includes app routes", () => {
    const matcher = config.matcher;
    expect(matcher).toBeDefined();

    // Extract the regex string from the single-element matcher array
    const rawPattern = Array.isArray(matcher) ? matcher[0] : String(matcher);

    // Build a RegExp from the Next.js matcher pattern string
    // The pattern is a path-to-regexp style pattern wrapped in a capturing group
    const regex = new RegExp(`^${rawPattern}$`);

    // --- Paths that SHOULD be matched (app routes) ---
    expect(regex.test("/")).toBe(true);
    expect(regex.test("/api/health")).toBe(true);
    expect(regex.test("/about")).toBe(true);
    expect(regex.test("/some/nested/page")).toBe(true);

    // --- Paths that MUST NOT be matched (static assets) ---
    expect(regex.test("/_next/static/chunk.js")).toBe(false);
    expect(regex.test("/_next/static/css/main.css")).toBe(false);
    expect(regex.test("/_next/image?url=foo")).toBe(false);
    expect(regex.test("/favicon.ico")).toBe(false);
  });
});
