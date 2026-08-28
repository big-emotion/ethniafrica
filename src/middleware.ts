import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { applyIpRateLimit, applyRateLimit } from "@/lib/api/rate-limit";
import {
  resolveCountryDeepLink,
  resolveFamilyDeepLink,
  resolvePeopleDeepLink,
  type DeepLinkQuery,
} from "@/lib/routing";
import type { Language } from "@/types/shared";

// Public localized pages still contain data-driven React style attributes.
// API and admin routes keep the strict nonce-only policy.
//
// Why the relaxation is scoped rather than global: public fiche components set
// CSS from entity data through both `style={{...}}` attributes (governed by
// style-src-attr) and client-injected <style> elements (governed by style-src).
// Their values vary per entity, so a fixed hash allowlist cannot cover them. An
// earlier pass applied the directive to every route in every environment,
// including admin and API routes that render no inline styles at all — this
// scoping limits the weakening to the pages that actually need it.
//
// Follow-up: once the fiche components use nonce-aware alternatives instead of
// data-driven inline styles, both exceptions can be dropped entirely.
const isPublicLocalizedPage = (pathname: string) =>
  pathname === "/fr" || pathname.startsWith("/fr/");

// Strict routes allow the two fixed Next.js 16 runtime <style> payloads by
// exact hash because the framework does not propagate the request nonce.
const NEXT_RUNTIME_STYLE_HASHES = [
  "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
  "'sha256-CIxDM5jnsGiKqXs2v7NKCY5MzdR9gu6TtiMJrDw29AY='",
].join(" ");
function applySecurityHeaders(
  response: NextResponse,
  nonce: string,
  pathname: string
) {
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  const publicLocalizedPage = isPublicLocalizedPage(pathname);
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${
      process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"
    }`,
    publicLocalizedPage
      ? "style-src 'self' 'unsafe-inline'"
      : `style-src 'self' 'nonce-${nonce}' ${NEXT_RUNTIME_STYLE_HASHES}`,
    ...(publicLocalizedPage ? ["style-src-attr 'unsafe-inline'"] : []),
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

// Locale, the first segment below it, and whatever follows. The third group
// is the tail this rewrite must not interpret.
const RELOCATED_SEGMENT = /^\/([a-z]{2})\/([a-z-]+)(\/.*)?$/;

// REQ-114 renamed the hubs from the resources they group to the verb the
// reader arrives with. All three were published, so the old URLs are
// indexed and bookmarked and have to keep resolving. Keyed on the whole
// segment, never a prefix: /fr/peuples is a live resource page and must
// not be swept up by the /fr/peuples-hub entry.
// @req REQ-114
export const RENAMED_HUB_SEGMENTS: Record<string, string> = {
  "peuples-hub": "comprendre",
  "pays-hub": "explorer",
  "familles-hub": "jouer",
};

// Lot 3 moved every module below the hub that leads to it, so the top-level
// segment each one was published under has to keep resolving — this time for
// a whole subtree, not one page: `/fr/peuples/PPL_YORUBA/liens` is as indexed
// as `/fr/peuples`.
//
// Hence a second table rather than an entry in the one above. That one is
// anchored on exactly one segment on purpose, because `/fr/peuples` is a live
// resource page that must not be swept up by `/fr/peuples-hub`; widening its
// regex to carry these would re-open precisely that. This one is prefix-
// shaped and keeps the tail verbatim — verbatim, so an identifier that was
// percent-encoded when the link was made survives being read back.
//
// The last six keys are the vocabularies of the V1 corpus, which the deleted
// `[lang]/[section]` route redirected client-side. They were the reason that
// route existed; carried here they cost one table row each, and left behind
// they would have died with it, silently, since nothing links to them.
// @req REQ-091
export const RELOCATED_SEGMENTS: Record<string, string> = {
  pays: "explorer/pays",
  peuples: "explorer/peuples",
  familles: "explorer/familles",
  recherche: "explorer/recherche",
  doctrine: "comprendre/doctrine",
  noms: "comprendre/noms",
  migrations: "comprendre/migrations",
  regards: "comprendre/regards",
  quiz: "jouer/quiz",
  // English spellings, published by V1 and still linked from outside.
  countries: "explorer/pays",
  families: "explorer/familles",
  peoples: "explorer/peuples",
  // Regions became linguistic families; ethnicities became peoples.
  regions: "explorer/familles",
  regiones: "explorer/familles",
  regioes: "explorer/familles",
  ethnicities: "explorer/peuples",
  ethnies: "explorer/peuples",
  etnias: "explorer/peuples",
};

// Which directory a relocated segment was, for the deep links that named a
// fiche in the query string. Without this a `/fr/pays?country=BEN` costs two
// redirects: one here to the moved directory, one from the directory to the
// fiche. Two hops halve the link equity a 308 passes on, and the second one
// only exists because the first forgot what the query said.
//
// The resolvers are `routing.ts`'s, not a copy: they hold the encoding rule
// that keeps `?country=//evil.com` from becoming an off-origin redirect, and
// a rule with two implementations is a rule with one enforced version.
const DEEP_LINK_RESOLVERS: Record<
  string,
  (language: Language, query: DeepLinkQuery) => string | null
> = {
  pays: resolveCountryDeepLink,
  countries: resolveCountryDeepLink,
  peuples: resolvePeopleDeepLink,
  peoples: resolvePeopleDeepLink,
  ethnicities: resolvePeopleDeepLink,
  ethnies: resolvePeopleDeepLink,
  etnias: resolvePeopleDeepLink,
  familles: resolveFamilyDeepLink,
  families: resolveFamilyDeepLink,
  regions: resolveFamilyDeepLink,
  regiones: resolveFamilyDeepLink,
  regioes: resolveFamilyDeepLink,
};

/**
 * Where a legacy path leads now.
 *
 * `keepQuery` is false only when the query is what produced the target: a
 * `?country=BEN` that became `/fr/explorer/pays/BEN` has been spent, and
 * carrying it along would leave the identifier stated twice, once in the path
 * and once in a query the directory it lands on would read and act on again.
 *
 * Exported for `redirectCharter.test.ts`, which walks both tables to assert
 * the two properties reading them cannot establish: that every entry lands in
 * one hop, and that no target opens on a segment that is itself a key — the
 * shape a redirect loop takes.
 */
// @req REQ-091
export interface RelocatedPath {
  path: string;
  keepQuery: boolean;
}

// @req REQ-091
export function resolveRelocatedPath(
  pathname: string,
  search: URLSearchParams
): RelocatedPath | null {
  const match = pathname.match(RELOCATED_SEGMENT);
  if (!match) return null;

  const [, locale, segment] = match;
  // A trailing slash is not a tail. Left in, it would send `/fr/pays/` to
  // `/fr/explorer/pays/` and skip the deep-link resolution below.
  const tail = (match[3] ?? "").replace(/\/+$/, "");
  const destination = RELOCATED_SEGMENTS[segment];
  if (!destination) return null;

  // A directory root carrying a fiche identifier goes to the fiche itself.
  // Below the root the query is the page's own business, so it is left alone.
  if (!tail) {
    const fiche = DEEP_LINK_RESOLVERS[segment]?.(locale as Language, search);
    if (fiche) return { path: fiche, keepQuery: false };
  }

  return { path: `/${locale}/${destination}${tail}`, keepQuery: true };
}

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

// @req REQ-052
export async function middleware(request: NextRequest) {
  // Three rewrites, one redirect.
  //
  // They compose rather than each returning: `/en/peuples` is both a
  // non-canonical locale and a relocated module, and answering it with
  // `/fr/peuples` would send the reader to an address this same middleware
  // redirects again. Two 308s is what the one-hop rule forbids, and the
  // second one would be entirely of our own making.
  //
  // All three are 308: none of them is a page moving temporarily, so a
  // crawler should transfer the old URL's standing rather than keep
  // revisiting it.
  const { pathname } = request.nextUrl;
  let canonicalPath = pathname;
  let moved = false;

  // FR-only: any /[2-letter-lang]/* segment that isn't /fr becomes its /fr
  // equivalent, subpath and query preserved.
  const localeMatch = canonicalPath.match(LOCALE_SEGMENT);
  if (localeMatch && localeMatch[1] !== CANONICAL_LOCALE) {
    const rest = canonicalPath.slice(localeMatch[0].length).replace(/\/+$/, "");
    canonicalPath = `/${CANONICAL_LOCALE}${rest}`;
    moved = true;
  }

  // REQ-114's hub rename. Keyed on exactly one segment — see the table.
  const renamedHub = canonicalPath.match(/^\/([a-z]{2})\/([a-z-]+)\/?$/);
  if (renamedHub && RENAMED_HUB_SEGMENTS[renamedHub[2]]) {
    canonicalPath = `/${renamedHub[1]}/${RENAMED_HUB_SEGMENTS[renamedHub[2]]}`;
    moved = true;
  }

  // Lot 3's relocation: the module did not change, its address did. A deep
  // link resolves to the fiche here rather than at the directory, so the
  // reader and the crawler both make the trip once.
  let keepQuery = true;
  const relocated = resolveRelocatedPath(
    canonicalPath,
    request.nextUrl.searchParams
  );
  if (relocated) {
    canonicalPath = relocated.path;
    keepQuery = relocated.keepQuery;
    moved = true;
  }

  if (moved) {
    const search = keepQuery ? request.nextUrl.search : "";
    return NextResponse.redirect(
      new URL(`${canonicalPath}${search}`, request.nextUrl.origin),
      308
    );
  }

  const isApiV2 = request.nextUrl.pathname.startsWith("/api/v2/");
  const requiresApiKeyAuth =
    isApiV2 && !pathname.startsWith("/api/v2/keys/issue");

  // Rate limit routes that never validate an API key (e.g. /api/v2/keys/issue)
  // up front, since there is no DB-validated tier to wait for. Routes that do
  // validate a key are rate-limited below, once the tier is known, so a single
  // request only ever consumes one rate-limit bucket.
  if (isApiV2 && !requiresApiKeyAuth) {
    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
  }

  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // --- API v2 authentication ---
  if (requiresApiKeyAuth) {
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
      const rateLimitResponse = await applyRateLimit(request);
      if (rateLimitResponse) return rateLimitResponse;
      return NextResponse.json({ error: "missing_api_key" }, { status: 401 });
    }

    // Validate before rate limiting so the DB-canonical tier (api_keys.tier)
    // — not a raw key matched against an env list — drives quota selection.
    // Invalid/bypass attempts still consume the "public" bucket rather than
    // going unmetered.
    let result;
    if (devBypass) {
      result = { valid: true, apiKeyId: "dev-bypass", tier: "public" } as const;
    } else if (sameOriginBypass) {
      result = {
        valid: true,
        apiKeyId: "same-origin",
        tier: "public",
      } as const;
    } else {
      // IP pre-limit, distinct from the tier-based bucket below: bounds the
      // DB lookup + PBKDF2 comparison inside validateApiKey so a flood of
      // distinct/invalid keys from one IP can't run that expensive check
      // unbounded before a tier is known.
      const ipRateLimitResponse = await applyIpRateLimit(request);
      if (ipRateLimitResponse) return ipRateLimitResponse;
      result = await validateApiKey(rawKey);
    }

    const tier = result.valid ? result.tier : "public";
    const rateLimitResponse = await applyRateLimit(request, tier);
    if (rateLimitResponse) return rateLimitResponse;

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

    applySecurityHeaders(requestWithKey, nonce, pathname);
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
  const isContributorProfileRoute = pathname === "/fr/compte/profil";

  if (isContributorProfileRoute && !user) {
    const loginUrl = new URL("/fr/compte/connexion", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

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

  applySecurityHeaders(supabaseResponse, nonce, pathname);
  return supabaseResponse;
}

// @req REQ-052
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
