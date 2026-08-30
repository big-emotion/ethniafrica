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

import { applyRateLimit } from "@/lib/api/rate-limit";
import { createServerClient } from "@supabase/ssr";
import { middleware } from "../middleware";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

// Rate limiting has its own suite; here it passes through except where a test
// deliberately makes it reject, to prove a 429 still states its API version.
vi.mock("@/lib/api/rate-limit", () => ({
  applyRateLimit: vi.fn().mockResolvedValue(null),
  applyIpRateLimit: vi.fn().mockResolvedValue(null),
}));

const versionHeaders = (response: Response) => ({
  version: response.headers.get("X-API-Version"),
  stable: response.headers.get("X-API-Stable"),
});

describe("versioning headers in middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(applyRateLimit).mockResolvedValue(null);

    (createServerClient as Mock).mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // @req REQ-035
  it("states the version on a request that reaches the route handler", async () => {
    const response = await middleware(
      new NextRequest("http://localhost:3000/api/v2/peoples")
    );

    expect(versionHeaders(response)).toEqual({ version: "2", stable: "true" });
  });

  // @req REQ-035
  it("states it on the 401 an unauthenticated caller receives", async () => {
    // The auth gate fails open outside production, so the real gate only runs
    // with NODE_ENV pinned.
    vi.stubEnv("NODE_ENV", "production");

    const response = await middleware(
      new NextRequest("http://localhost:3000/api/v2/countries")
    );

    expect(response.status).toBe(401);
    expect(versionHeaders(response)).toEqual({ version: "2", stable: "true" });
  });

  // @req REQ-035
  it("states it on a 429, the response a client most needs to attribute", async () => {
    vi.mocked(applyRateLimit).mockResolvedValue(
      NextResponse.json({ error: "rate_limited" }, { status: 429 })
    );

    const response = await middleware(
      new NextRequest("http://localhost:3000/api/v2/peoples")
    );

    expect(response.status).toBe(429);
    expect(versionHeaders(response)).toEqual({ version: "2", stable: "true" });
  });

  // @req REQ-035
  it("states it on the key-issuing endpoint, which takes no key of its own", async () => {
    const response = await middleware(
      new NextRequest("http://localhost:3000/api/v2/keys/issue")
    );

    expect(versionHeaders(response)).toEqual({ version: "2", stable: "true" });
  });

  // @req REQ-035
  it.each(["/api/contributions", "/api/download", "/fr/explorer/pays"])(
    "leaves %s free of the public API's version claim",
    async (pathname) => {
      const response = await middleware(
        new NextRequest(`http://localhost:3000${pathname}`)
      );

      expect(versionHeaders(response)).toEqual({
        version: null,
        stable: null,
      });
    }
  );

  // @req REQ-035
  it("carries no deprecation headers while no endpoint is scheduled for sunset", async () => {
    const response = await middleware(
      new NextRequest("http://localhost:3000/api/v2/peoples")
    );

    expect(response.headers.get("Deprecation")).toBeNull();
    expect(response.headers.get("Sunset")).toBeNull();
  });

  // @req REQ-035
  it("keeps the security headers it already set", async () => {
    const response = await middleware(
      new NextRequest("http://localhost:3000/api/v2/peoples")
    );

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "default-src 'self'"
    );
  });
});
