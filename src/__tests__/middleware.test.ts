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
    // @req REQ-042
    it("sends an unauthenticated visitor to the admin sign-in with a return path", async () => {
      const request = new NextRequest(
        "http://localhost:3000/fr/admin/dashboard"
      );
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr/admin/connexion?redirect=%2Ffr%2Fadmin%2Fdashboard"
      );
    });

    // @req REQ-042
    it("lets a signed-in visitor through and leaves authorization to the page", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "mod@example.org" } },
        error: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/fr/admin/dashboard"
      );
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
      // The allowlist is service-role-only, and this client carries the
      // visitor's own session — it could not read the table if it tried.
      expect(mockFrom).not.toHaveBeenCalled();
    });

    // @req REQ-042
    it("allows access to /fr/admin/connexion without authentication", async () => {
      const request = new NextRequest(
        "http://localhost:3000/fr/admin/connexion"
      );
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
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

  /**
   * The atlas has no public accounts any more: reporting costs none, and the
   * console authorizes an address rather than a role. `/fr/compte/*` was
   * published and is in readers' history — moderators' especially, since the
   * middleware used to send them there to sign in — so it is relocated rather
   * than left to 404.
   */
  describe("retired account routes", () => {
    // @req REQ-091
    it.each([
      ["/fr/compte/connexion", "/fr/admin/connexion"],
      ["/fr/compte/cles-api", "/fr/admin/cles-api"],
      // Nothing to register for and no profile to hold: both land on the one
      // sign-in left, which says reporting needs no account.
      ["/fr/compte/inscription", "/fr/admin/connexion"],
      ["/fr/compte/profil", "/fr/admin/connexion"],
    ])("relocates %s to %s in one hop", async (legacy, current) => {
      const response = await middleware(
        new NextRequest(`http://localhost:3000${legacy}`)
      );

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        `http://localhost:3000${current}`
      );
    });

    // @req REQ-091
    it("relocates the bare /fr/compte onto the console", async () => {
      const response = await middleware(
        new NextRequest("http://localhost:3000/fr/compte")
      );

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr/admin"
      );
    });
  });

  // The three hub URLs shipped under their resource names before the axes
  // gave them verbs. They were published, so they are indexed and
  // bookmarked: the rename has to leave a trail rather than a 404. ETNI-1555
  // then deleted the three landing pages they had been retargeted at, so each
  // one now lands on the facet that holds the resource it was named for.
  describe("legacy hub redirects (REQ-114)", () => {
    // @req REQ-114
    it.each([
      ["peuples-hub", "atlas/peuples"],
      ["pays-hub", "atlas/pays"],
      ["familles-hub", "atlas/familles"],
    ])("redirects /fr/%s to /fr/%s with 308", async (legacy, current) => {
      const request = new NextRequest(`http://localhost:3000/fr/${legacy}`);
      const response = await middleware(request);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        `http://localhost:3000/fr/${current}`
      );
    });

    // @req REQ-114
    it("carries the query string across the rename", async () => {
      const request = new NextRequest(
        "http://localhost:3000/fr/pays-hub?from=newsletter"
      );
      const response = await middleware(request);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr/atlas/pays?from=newsletter"
      );
    });

    // @req REQ-114
    it("normalizes a trailing slash rather than 404ing on it", async () => {
      const request = new NextRequest("http://localhost:3000/fr/peuples-hub/");
      const response = await middleware(request);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr/atlas/peuples"
      );
    });

    // The rename moved a hub, not the resource pages it groups. /fr/atlas/peuples
    // is a live route and must not be swept up by a prefix match on
    // "peuples".
    // @req REQ-114
    it("leaves the resource pages the hubs group untouched", async () => {
      const request = new NextRequest("http://localhost:3000/fr/atlas/peuples");
      const response = await middleware(request);

      expect(response.status).not.toBe(308);
    });

    // ETNI-1615 (REQ-138): the verb-prefixed address the hub rename above
    // still targeted (before this ticket) is now itself retired — a reader
    // arriving on it has to reach the noun-prefixed successor, not a 404.
    // @req REQ-091
    it("also retires the verb-prefixed address the hub used to target", async () => {
      const request = new NextRequest(
        "http://localhost:3000/fr/explorer/peuples"
      );
      const response = await middleware(request);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr/atlas/peuples"
      );
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

    // @req REQ-091
    it("redirects /en/peuples to /fr/atlas/peuples preserving subpath", async () => {
      const request = new NextRequest("http://localhost:3000/en/peuples");
      const response = await middleware(request);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr/atlas/peuples"
      );
    });

    // @req REQ-091
    it("redirects /es/pays/zaf to /fr/atlas/pays/zaf preserving deep subpath", async () => {
      const request = new NextRequest("http://localhost:3000/es/pays/zaf");
      const response = await middleware(request);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr/atlas/pays/zaf"
      );
    });

    it("preserves query string on language redirect", async () => {
      const request = new NextRequest(
        "http://localhost:3000/en/peuples?tri=population"
      );
      const response = await middleware(request);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr/atlas/peuples?tri=population"
      );
    });

    // A query naming a fiche is spent by the redirect rather than forwarded:
    // it produced the path. Forwarding it too would hand the directory an
    // identifier it would act on, which is the second hop this composition
    // exists to remove.
    // @req REQ-091
    it("spends a deep-link query rather than forwarding it", async () => {
      const request = new NextRequest(
        "http://localhost:3000/en/peuples?people=PPL_YORUBA"
      );
      const response = await middleware(request);

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/fr/atlas/peuples/PPL_YORUBA"
      );
    });

    it("does not redirect /fr (already the canonical locale)", async () => {
      const request = new NextRequest("http://localhost:3000/fr");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    // @req REQ-091
    it("does not redirect /fr/atlas/peuples", async () => {
      const request = new NextRequest("http://localhost:3000/fr/atlas/peuples");
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

    // ARCH-016: opens the CSP to the Prismic editorial-media host, declared
    // explicitly rather than left to the (previously implicit) default-src
    // fallback.
    // @req REQ-052
    it("declares media-src with the Prismic image host and no wildcard", async () => {
      const request = new NextRequest("http://localhost:3000/some-page");
      const response = await middleware(request);

      const csp = response.headers.get("Content-Security-Policy")!;
      const directives = csp.split(";").map((d) => d.trim());
      const mediaSrc = directives.find((d) => d.startsWith("media-src"));

      expect(mediaSrc).toBeDefined();
      expect(mediaSrc).toContain("'self'");
      expect(mediaSrc).toContain("https://images.prismic.io");
      expect(mediaSrc).not.toContain("*");
    });

    // frame-src is declared explicitly (no longer an implicit default-src
    // fallback) but carries no external host yet: REQ-128 owns which embed
    // provider(s) are trusted, and none is confirmed at this stage.
    // @req REQ-052
    it("declares frame-src restricted to 'self' with no external host yet", async () => {
      const request = new NextRequest("http://localhost:3000/some-page");
      const response = await middleware(request);

      const csp = response.headers.get("Content-Security-Policy")!;
      const directives = csp.split(";").map((d) => d.trim());
      const frameSrc = directives.find((d) => d.startsWith("frame-src"));

      expect(frameSrc).toBeDefined();
      expect(frameSrc).toBe("frame-src 'self'");
      expect(frameSrc).not.toContain("*");
    });

    // A host that was never declared must stay blocked — the CSP is a
    // host-by-host allowlist, not an open door once one provider is trusted.
    // @req REQ-052
    it("does not declare an undeclared media/embed host", async () => {
      const request = new NextRequest("http://localhost:3000/some-page");
      const response = await middleware(request);

      const csp = response.headers.get("Content-Security-Policy")!;
      const directives = csp.split(";").map((d) => d.trim());
      const mediaSrc = directives.find((d) => d.startsWith("media-src"));
      const frameSrc = directives.find((d) => d.startsWith("frame-src"));

      expect(mediaSrc).not.toContain("evil.example");
      expect(frameSrc).not.toContain("evil.example");
    });

    // Neither directive falls back to default-src, so leaving them out leaves
    // them unrestricted: an injected <base> can re-point every relative URL on
    // the page, and an injected form can post to any origin.
    // @req REQ-052
    it("restricts base-uri and form-action, which do not inherit default-src", async () => {
      const request = new NextRequest("http://localhost:3000/some-page");
      const response = await middleware(request);

      const csp = response.headers.get("Content-Security-Policy")!;

      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
    });

    // The style relaxation is scoped to public localized pages; these two are
    // not, so the branch that loosens style-src must still carry them.
    // @req REQ-052
    it("restricts base-uri and form-action on public localized pages too", async () => {
      const request = new NextRequest("http://localhost:3000/fr");
      const response = await middleware(request);

      const csp = response.headers.get("Content-Security-Policy")!;

      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
    });

    // @req REQ-052
    it("does not include 'unsafe-inline' in script-src, style-src, media-src or frame-src", async () => {
      const request = new NextRequest("http://localhost:3000/some-page");
      const response = await middleware(request);

      const csp = response.headers.get("Content-Security-Policy")!;
      const directives = csp.split(";").map((d) => d.trim());

      const scriptSrc = directives.find((d) => d.startsWith("script-src"));
      const styleSrc = directives.find((d) => d.startsWith("style-src"));
      const mediaSrc = directives.find((d) => d.startsWith("media-src"));
      const frameSrc = directives.find((d) => d.startsWith("frame-src"));

      expect(scriptSrc).toBeDefined();
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).toMatch(/'nonce-[^']+'/);
      expect(styleSrc).toBeDefined();
      expect(styleSrc).not.toContain("'unsafe-inline'");
      expect(styleSrc).toMatch(/'nonce-[^']+'/);
      expect(mediaSrc).toBeDefined();
      expect(mediaSrc).not.toContain("'unsafe-inline'");
      expect(frameSrc).toBeDefined();
      expect(frameSrc).not.toContain("'unsafe-inline'");
    });

    // @req REQ-052
    it("allows only the known Next.js runtime style hashes", async () => {
      const request = new NextRequest("http://localhost:3000/some-page");
      const response = await middleware(request);
      const csp = response.headers.get("Content-Security-Policy")!;
      const directives = csp.split(";").map((d) => d.trim());
      const styleSrc = directives.find((d) => d.startsWith("style-src "));

      expect(styleSrc).toContain(
        "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='"
      );
      expect(styleSrc).toContain(
        "'sha256-CIxDM5jnsGiKqXs2v7NKCY5MzdR9gu6TtiMJrDw29AY='"
      );
    });

    // @req REQ-052
    it("allows inline style attributes only on public localized pages", async () => {
      for (const pathname of [
        "/fr",
        "/fr/atlas/pays/SEN",
        "/fr/atlas/familles/FLG_BANTU",
      ]) {
        const response = await middleware(
          new NextRequest(`http://localhost:3000${pathname}`)
        );
        const directives = response.headers
          .get("Content-Security-Policy")!
          .split(";")
          .map((directive) => directive.trim());

        expect(
          directives.find((directive) => directive.startsWith("style-src-attr"))
        ).toBe("style-src-attr 'unsafe-inline'");
        expect(
          directives.find((directive) => directive.startsWith("style-src "))
        ).toBe("style-src 'self' 'unsafe-inline'");
      }

      for (const pathname of ["/api/v2/countries/SEN", "/admin/login"]) {
        const response = await middleware(
          new NextRequest(`http://localhost:3000${pathname}`)
        );
        const directives = response.headers
          .get("Content-Security-Policy")!
          .split(";")
          .map((directive) => directive.trim());

        expect(
          directives.find((directive) => directive.startsWith("style-src-attr"))
        ).toBeUndefined();
      }
    });

    // The developer portal now mounts the global header. Its static CSS is a
    // client-injected <style> element, while the portal itself needs no style
    // attributes. Keep the relaxation narrower than the localized pages.
    // @req REQ-099
    it("allows the developer portal header style element without allowing style attributes", async () => {
      const response = await middleware(
        new NextRequest("http://localhost:3000/docs/api/v2")
      );
      const directives = response.headers
        .get("Content-Security-Policy")!
        .split(";")
        .map((directive) => directive.trim());

      expect(
        directives.find((directive) => directive.startsWith("style-src "))
      ).toBe("style-src 'self' 'unsafe-inline'");
      expect(
        directives.find((directive) => directive.startsWith("style-src-attr"))
      ).toBeUndefined();
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
