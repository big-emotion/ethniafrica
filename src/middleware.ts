import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import type { UserRole } from "@/lib/auth/supabase-auth";
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

    if (!rawKey && !devBypass) {
      return NextResponse.json({ error: "missing_api_key" }, { status: 401 });
    }

    const result = devBypass
      ? ({ valid: true, apiKeyId: "dev-bypass" } as const)
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

  const isAdminRoute =
    pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (isAdminRoute) {
    if (!user) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data: roleData, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (error || !roleData) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }

    const roles: UserRole[] = roleData.map(
      (record: { role: UserRole }) => record.role
    );
    const isAdmin = roles.includes("admin");

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
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
