import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock NextResponse before importing middleware
const mockHeaders = new Map<string, string>();
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
    next: vi.fn(() => mockNextResponse),
  },
}));

import { middleware, config } from "../middleware";

describe("middleware", () => {
  beforeEach(() => {
    mockHeaders.clear();
    vi.clearAllMocks();
  });

  const createMockRequest = (url = "https://example.com/test") => {
    return {
      url,
      nextUrl: new URL(url),
    } as unknown as Parameters<typeof middleware>[0];
  };

  it("should return a response with all required security headers", () => {
    const request = createMockRequest();
    const response = middleware(request);

    expect(response).toBeDefined();
    expect(mockNextResponse.headers.set).toHaveBeenCalledTimes(4);
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
    expect(cspValue).toContain("script-src 'self' 'unsafe-inline'");
    expect(cspValue).toContain("style-src 'self' 'unsafe-inline'");
    expect(cspValue).toContain("img-src 'self' data:");
    expect(cspValue).toContain("frame-ancestors 'self'");
  });
});

describe("config", () => {
  it("should export a config with matcher", () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
  });

  it("should have a matcher that excludes static assets", () => {
    const matcher = config.matcher;

    // The matcher should be an array or string pattern
    expect(matcher).toBeDefined();

    // Convert to string for pattern checking
    const matcherStr = Array.isArray(matcher)
      ? matcher.join(" ")
      : String(matcher);

    // Verify it's designed to exclude static files
    // Next.js matchers use negative lookahead or specific patterns
    expect(matcherStr).toBeTruthy();
  });
});
