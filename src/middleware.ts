import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { applyRateLimit } from "@/lib/api/rate-limit";

function applySecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "frame-ancestors 'self'",
    "connect-src 'self' https://*.supabase.co https://*.ingest.de.sentry.io https://plausible.io https://*.upstash.io",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);
}

// Canonical site locale. Any other 2-letter language segment is redirected
// here to keep a single source of truth for crawlers and avoid duplicate
// content under URLs like /en/* that render French anyway.
const CANONICAL_LOCALE = "fr";
const LOCALE_SEGMENT = /^\/([a-z]{2})(?=\/|$)/;

// True when the request originates from the deployment itself — i.e. the
// browser tab or server worker serving our own frontend. Used to let the
// site call its own /api/v2/* without baking an API key into the bundle.
// External clients (curl, partners, other origins) must still bring a key.
function isSameOriginRequest(request: NextRequest): boolean {
  const host = request.headers.get("host");
  if (!host) return false;
  for (const header of ["origin", "referer"] as const) {
    const value = request.headers.get(header);
    if (!value) continue;
    try {
      if (new URL(value).host === host) return true;
    } catch {
      // Malformed Origin/Referer — ignore and fall through to require a key.
    }
  }
  return false;
}

export async function middleware(request: NextRequest) {
  // FR-only canonical redirect: any /[2-letter-lang]/* segment that isn't /fr
  // is permanently redirected to its /fr equivalent (preserves subpath + query).
  const { pathname } = request.nextUrl;
  const localeMatch = pathname.match(LOCALE_SEGMENT);
  if (localeMatch && localeMatch[1] !== CANONICAL_LOCALE) {
    const rest = pathname.slice(localeMatch[0].length).replace(/\/+$/, "");
    const target = new URL(
      `/${CANONICAL_LOCALE}${rest}${request.nextUrl.search}`,
      request.nextUrl.origin
    );
    return NextResponse.redirect(target, 308);
  }

  // Apply rate limiting for /api/v2/* routes before any other logic
  if (request.nextUrl.pathname.startsWith("/api/v2/")) {
    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
  }

  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // --- API v2 authentication ---
  if (
    pathname.startsWith("/api/v2/") &&
    !pathname.startsWith("/api/v2/keys/issue")
  ) {
    const authHeader = request.headers.get("Authorization") ?? "";
    const rawKey = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

    // Fail open in non-production so the same-origin frontend can call
    // /api/v2/* without an API key during local development.
    const devBypass = !rawKey && process.env.NODE_ENV !== "production";

    // Same-origin bypass: the deployment's own frontend calling /api/v2/* is
    // implicitly authorized. IP-based rate limiting still applies. A present
    // (even if invalid) Bearer key takes precedence so that bad tokens are
    // rejected loudly rather than silently masked.
    const sameOriginBypass = !rawKey && isSameOriginRequest(request);

    if (!rawKey && !devBypass && !sameOriginBypass) {
      return NextResponse.json({ error: "missing_api_key" }, { status: 401 });
    }

    const result = devBypass
      ? ({ valid: true, apiKeyId: "dev-bypass" } as const)
      : sameOriginBypass
        ? ({ valid: true, apiKeyId: "same-origin" } as const)
        : await validateApiKey(rawKey);

    if (result.valid === false) {
      return NextResponse.json({ error: result.reason }, { status: 401 });
    }

    const requestWithKey = NextResponse.next({
      request: {
        headers: new Headers({
          ...Object.fromEntries(request.headers),
          "x-nonce": nonce,
          "x-api-key-id": result.apiKeyId,
        }),
      },
    });

    applySecurityHeaders(requestWithKey, nonce);
    return requestWithKey;
  }

  // --- Admin route protection ---
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /fr/admin/* is the moderator-gated admin area.
  // /fr/admin/connexion is the public sign-in entry point and must be excluded.
  const isAdminRoute =
    pathname.startsWith("/fr/admin") && pathname !== "/fr/admin/connexion";

  if (isAdminRoute) {
    if (!user) {
      const loginUrl = new URL("/fr/compte/connexion", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data: profileData, error } = await supabase
      .from("contributor_profiles")
      .select("moderator_role")
      .eq("user_id", user.id);

    const moderatorRole: string | undefined = profileData?.[0]?.moderator_role;

    if (error || !profileData || !moderatorRole || moderatorRole === "none") {
      const homeUrl = new URL("/fr", request.url);
      homeUrl.searchParams.set("message", "acces_moderateurs_requis");
      return NextResponse.redirect(homeUrl);
    }
  }

  applySecurityHeaders(supabaseResponse, nonce);
  return supabaseResponse;
}

export const config = {
  matcher: [
    // Explicitly include all /api/v2/* routes so the rate-limiting gate is
    // never accidentally excluded by the negative-lookahead pattern below.
    "/api/v2/(.*)",
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
