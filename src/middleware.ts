import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";

type UserRole = "reader" | "contributor" | "moderator" | "admin" | "advisor";

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
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);
}

export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const { pathname } = request.nextUrl;

  // --- API v2 authentication ---
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
  const isAdminRoute =
    pathname.startsWith("/admin") && pathname !== "/admin/login";
  if (isAdminRoute) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
          storage: {
            getItem(key: string) {
              const direct = request.cookies.get(key)?.value;
              if (direct !== undefined) return direct;
              // Reassemble chunked cookies used by @supabase/ssr
              const chunks: string[] = [];
              for (let i = 0; ; i++) {
                const chunk = request.cookies.get(`${key}.${i}`)?.value;
                if (chunk === undefined) break;
                chunks.push(chunk);
              }
              return chunks.length > 0 ? chunks.join("") : null;
            },
            setItem() {},
            removeItem() {},
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
    if (!roles.includes("admin")) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
  }

  // --- Standard path: nonce + security headers ---
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applySecurityHeaders(response, nonce);
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
