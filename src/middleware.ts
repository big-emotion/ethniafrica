import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";

export async function middleware(request: NextRequest) {
  // Generate a cryptographically random nonce for CSP per request
  const nonce = btoa(crypto.randomUUID());

  // --- API v2 authentication ---
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/v2/") &&
    !pathname.startsWith("/api/v2/keys/issue")
  ) {
    const authHeader = request.headers.get("Authorization") ?? "";
    const rawKey = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

    if (!rawKey) {
      return NextResponse.json({ error: "missing_api_key" }, { status: 401 });
    }

    const result = await validateApiKey(rawKey);

    if (result.valid === false) {
      return NextResponse.json({ error: result.reason }, { status: 401 });
    }

    // Forward request with api key id header for downstream handlers
    const requestWithKey = NextResponse.next({
      request: {
        headers: new Headers({
          ...Object.fromEntries(request.headers),
          "x-nonce": nonce,
          "x-api-key-id": result.apiKeyId,
        }),
      },
    });

    requestWithKey.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
    requestWithKey.headers.set("X-Content-Type-Options", "nosniff");
    requestWithKey.headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin"
    );

    const cspAuth = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'nonce-${nonce}'`,
      "img-src 'self' data:",
      "frame-ancestors 'self'",
    ].join("; ");
    requestWithKey.headers.set("Content-Security-Policy", cspAuth);

    return requestWithKey;
  }

  // --- Standard path: add nonce + security headers ---
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        "x-nonce": nonce,
      }),
    },
  });

  // Strict-Transport-Security: enforce HTTPS
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // X-Content-Type-Options: prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Referrer-Policy: control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content-Security-Policy: nonce-based, compatible with Next.js 16 hashed-script model.
  // 'unsafe-inline' is intentionally absent; Next.js will honour the nonce for its own scripts.
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "frame-ancestors 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
