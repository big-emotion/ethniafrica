import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { middleware, config } from "../middleware";
import { createServerClient } from "@supabase/ssr";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

describe("middleware", () => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockEq.mockResolvedValue({ data: [], error: null });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    (createServerClient as Mock).mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    });

    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  describe("admin auth", () => {
    it("redirects unauthenticated user to /fr/compte/connexion with redirect param", async () => {
      const request = new NextRequest(
        "http://localhost:3000/fr/admin/dashboard"
      );
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr/compte/connexion?redirect=%2Ffr%2Fadmin%2Fdashboard"
      );
    });

    it("redirects contributor with moderator_role=none to /fr with flash message", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockEq.mockResolvedValue({
        data: [{ moderator_role: "none" }],
        error: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/fr/admin/dashboard"
      );
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr?message=acces_moderateurs_requis"
      );
      expect(mockFrom).toHaveBeenCalledWith("contributor_profiles");
      expect(mockSelect).toHaveBeenCalledWith("moderator_role");
      expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("allows authenticated moderator (editor) to pass through", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "editor-123" } },
        error: null,
      });
      mockEq.mockResolvedValue({
        data: [{ moderator_role: "editor" }],
        error: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/fr/admin/dashboard"
      );
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("allows authenticated moderator (senior_editor) to pass through", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "senior-123" } },
        error: null,
      });
      mockEq.mockResolvedValue({
        data: [{ moderator_role: "senior_editor" }],
        error: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/fr/admin/dashboard"
      );
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("allows authenticated moderator (admin) to pass through", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "admin-123" } },
        error: null,
      });
      mockEq.mockResolvedValue({
        data: [{ moderator_role: "admin" }],
        error: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/fr/admin/dashboard"
      );
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("allows access to /fr/admin/connexion without authentication", async () => {
      const request = new NextRequest(
        "http://localhost:3000/fr/admin/connexion"
      );
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("redirects to /fr with flash when contributor_profiles row is missing", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockEq.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest(
        "http://localhost:3000/fr/admin/dashboard"
      );
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr?message=acces_moderateurs_requis"
      );
    });

    it("redirects to /fr with flash on database error when fetching profile", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockEq.mockResolvedValue({ data: null, error: new Error("DB error") });

      const request = new NextRequest(
        "http://localhost:3000/fr/admin/dashboard"
      );
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr?message=acces_moderateurs_requis"
      );
    });

    it("refreshes session on non-admin routes", async () => {
      const request = new NextRequest("http://localhost:3000/some-page");
      const response = await middleware(request);

      expect(mockGetUser).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("does not protect the legacy /admin/* path (unmigrated; no gate)", async () => {
      // The old /admin/* routes are no longer behind this middleware gate.
      const request = new NextRequest("http://localhost:3000/admin/dashboard");
      const response = await middleware(request);

      // Should pass through without auth challenge
      expect(response.status).toBe(200);
    });
  });

  describe("language redirect (FR-only)", () => {
    it("redirects /en to /fr with 308 (permanent)", async () => {
      const request = new NextRequest("http://localhost:3000/en");
      const response = await middleware(request);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe("http://localhost:3000/fr");
    });

    it("redirects /en/ to /fr (trailing slash normalized)", async () => {
      const request = new NextRequest("http://localhost:3000/en/");
      const response = await middleware(request);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe("http://localhost:3000/fr");
    });

    it("redirects /en/peuples to /fr/peuples preserving subpath", async () => {
      const request = new NextRequest("http://localhost:3000/en/peuples");
      const response = await middleware(request);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr/peuples"
      );
    });

    it("redirects /es/pays/zaf to /fr/pays/zaf preserving deep subpath", async () => {
      const request = new NextRequest("http://localhost:3000/es/pays/zaf");
      const response = await middleware(request);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr/pays/zaf"
      );
    });

    it("preserves query string on language redirect", async () => {
      const request = new NextRequest(
        "http://localhost:3000/en/peuples?people=PPL_YORUBA"
      );
      const response = await middleware(request);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr/peuples?people=PPL_YORUBA"
      );
    });

    it("does not redirect /fr (already the canonical locale)", async () => {
      const request = new NextRequest("http://localhost:3000/fr");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("does not redirect /fr/peuples", async () => {
      const request = new NextRequest("http://localhost:3000/fr/peuples");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("does not redirect /admin (not a 2-letter locale segment)", async () => {
      const request = new NextRequest("http://localhost:3000/admin/login");
      const response = await middleware(request);

      // /admin/* is not a locale prefix and is not gated by admin auth
      expect(response.status).toBe(200);
    });

    it("does not redirect /api/v2/* paths to a /fr/* equivalent", async () => {
      const request = new NextRequest("http://localhost:3000/api/v2/peoples");
      const response = await middleware(request);

      // No language redirect; behavior governed by rate-limit / api auth
      const location = response.headers.get("location");
      if (location) {
        expect(location).not.toMatch(/\/fr\//);
      }
    });

    it("does not redirect /docs (4-letter, not a locale)", async () => {
      const request = new NextRequest("http://localhost:3000/docs/api");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("security headers", () => {
    it("sets Strict-Transport-Security on pass-through responses", async () => {
      const request = new NextRequest("http://localhost:3000/some-page");
      const response = await middleware(request);

      expect(response.headers.get("Strict-Transport-Security")).toBe(
        "max-age=31536000; includeSubDomains; preload"
      );
    });

    it("sets X-Content-Type-Options on pass-through responses", async () => {
      const request = new NextRequest("http://localhost:3000/some-page");
      const response = await middleware(request);

      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("sets Referrer-Policy on pass-through responses", async () => {
      const request = new NextRequest("http://localhost:3000/some-page");
      const response = await middleware(request);

      expect(response.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin"
      );
    });

    it("sets Content-Security-Policy with required directives", async () => {
      const request = new NextRequest("http://localhost:3000/some-page");
      const response = await middleware(request);

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("img-src 'self' data:");
      expect(csp).toContain("frame-ancestors 'self'");
    });

    it("does not include 'unsafe-inline' in script-src or style-src", async () => {
      const request = new NextRequest("http://localhost:3000/some-page");
      const response = await middleware(request);

      const csp = response.headers.get("Content-Security-Policy")!;
      const directives = csp.split(";").map((d) => d.trim());

      const scriptSrc = directives.find((d) => d.startsWith("script-src"));
      const styleSrc = directives.find((d) => d.startsWith("style-src"));

      expect(scriptSrc).toBeDefined();
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).toMatch(/'nonce-[^']+'/);
      expect(styleSrc).toBeDefined();
      expect(styleSrc).not.toContain("'unsafe-inline'");
      expect(styleSrc).toMatch(/'nonce-[^']+'/);
    });

    it("generates a different nonce for each request", async () => {
      const request1 = new NextRequest("http://localhost:3000/page1");
      const response1 = await middleware(request1);
      const nonce1 = response1.headers
        .get("Content-Security-Policy")!
        .match(/'nonce-([^']+)'/)?.[1];

      const request2 = new NextRequest("http://localhost:3000/page2");
      const response2 = await middleware(request2);
      const nonce2 = response2.headers
        .get("Content-Security-Policy")!
        .match(/'nonce-([^']+)'/)?.[1];

      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
      expect(nonce1).not.toBe(nonce2);
    });
  });
});

describe("config", () => {
  it("exports a config with matcher", () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
  });

  it("matcher includes /api/v2/* and the app catch-all, excludes static assets", () => {
    expect(Array.isArray(config.matcher)).toBe(true);
    const patterns = (config.matcher as string[]).map(
      (p) => new RegExp(`^${p}$`)
    );

    const matchesAny = (path: string) => patterns.some((r) => r.test(path));

    // App routes
    expect(matchesAny("/")).toBe(true);
    expect(matchesAny("/api/health")).toBe(true);
    expect(matchesAny("/about")).toBe(true);
    expect(matchesAny("/some/nested/page")).toBe(true);

    // /api/v2/* must match (rate-limit gate must always run there)
    expect(matchesAny("/api/v2/countries")).toBe(true);
    expect(matchesAny("/api/v2/peoples/PPL_YORUBA")).toBe(true);

    // Static assets must not match
    expect(matchesAny("/_next/static/chunk.js")).toBe(false);
    expect(matchesAny("/_next/static/css/main.css")).toBe(false);
    expect(matchesAny("/_next/image?url=foo")).toBe(false);
    expect(matchesAny("/favicon.ico")).toBe(false);
    expect(matchesAny("/logo.svg")).toBe(false);
  });
});
