import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { applyIpRateLimit, applyRateLimit } from "@/lib/api/rate-limit";
import { applyVersioningHeaders } from "@/lib/api/versioning";
import {
  localeSlugMismatch,
  resolveCountryDeepLink,
  resolveFamilyDeepLink,
  resolvePeopleDeepLink,
  toRouteFilePath,
  translatePath,
  type DeepLinkQuery,
} from "@/lib/routing";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  resolveLocale,
} from "@/lib/locale";
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
  LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

// The public developer portal sits outside the localized tree but mounts the
// same global header. That header carries static CSS in a client-injected
// <style> element; unlike the data-driven fiches, it uses no style attributes.
const isDeveloperPortalPage = (pathname: string) =>
  pathname === "/docs/api" || pathname.startsWith("/docs/api/");

// Strict routes allow the two fixed Next.js 16 runtime <style> payloads by
// exact hash because the framework does not propagate the request nonce.
const SUPABASE_ORIGIN_FALLBACK = "https://supabase.ethniafrica.com";

const NEXT_RUNTIME_STYLE_HASHES = [
  "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
  "'sha256-CIxDM5jnsGiKqXs2v7NKCY5MzdR9gu6TtiMJrDw29AY='",
].join(" ");

// ARCH-016: the CSP had no media-src or frame-src at all, so both fell back
// to default-src 'self' and blocked every editorial media/embed host before
// REQ-128 could render one. Each host below is named explicitly — never a
// wildcard — so a provider must be declared to be trusted.
//
// images.prismic.io is Prismic's single fixed asset-delivery domain, shared
// by every Prismic repository; it is the one host the committed
// Prismic-as-editorial-source architecture already confirms.
const MEDIA_SRC_HOSTS = ["https://images.prismic.io"].join(" ");

// No embed provider is confirmed yet — REQ-128 ("Media and external links on
// the fiche") owns that decision. Left empty rather than guessed so the
// directive still exists explicitly (not an implicit default-src fallback)
// and stays a deliberate host-by-host allowlist once REQ-128 names a host.
const FRAME_SRC_HOSTS: string[] = [];
/**
 * The self-hosted Supabase origin the browser is allowed to reach.
 *
 * `*.supabase.co` covers every hosted project, but production runs its own
 * Supabase behind a custom domain, which that wildcard does not match. Baking
 * one deployment's hostname into the policy meant any other deployment — a
 * self-hosted staging, a branch database, a fork — had its Supabase calls
 * blocked by the browser with no server-side error to find. Derived from
 * NEXT_PUBLIC_SUPABASE_URL so it follows the database the app is actually
 * pointed at, with the production host as the fallback.
 */
function selfHostedSupabaseOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configured) return SUPABASE_ORIGIN_FALLBACK;
  try {
    const { origin } = new URL(configured);
    return origin.endsWith(".supabase.co") ? "" : origin;
  } catch {
    return SUPABASE_ORIGIN_FALLBACK;
  }
}

/**
 * The Plausible script/collector origin, or "" when analytics is off.
 *
 * Mirrors buildPlausibleSrc() in src/lib/plausible.ts: empty when
 * NEXT_PUBLIC_PLAUSIBLE_DOMAIN is unset (PlausibleScript renders nothing in
 * that case either, so there is nothing to allow), otherwise
 * NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN for a self-hosted instance or
 * https://plausible.io by default. Needed in both script-src (to load the
 * tracker) and connect-src (for the beacon POST the tracker itself makes) —
 * script-src 'self' alone blocked the script outright, on either hosting
 * option, until this was added.
 */
function plausibleOrigin(): string {
  if (!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim()) return "";
  const host = process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN?.trim();
  return host ? host.replace(/\/$/, "") : "https://plausible.io";
}

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
  const allowsInlineStyleElements =
    publicLocalizedPage || isDeveloperPortalPage(pathname);
  const plausibleSrc = plausibleOrigin();
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${
      process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"
    }${plausibleSrc ? ` ${plausibleSrc}` : ""}`,
    allowsInlineStyleElements
      ? "style-src 'self' 'unsafe-inline'"
      : `style-src 'self' 'nonce-${nonce}' ${NEXT_RUNTIME_STYLE_HASHES}`,
    ...(publicLocalizedPage ? ["style-src-attr 'unsafe-inline'"] : []),
    "img-src 'self' data:",
    `media-src 'self' ${MEDIA_SRC_HOSTS}`,
    ["frame-src 'self'", ...FRAME_SRC_HOSTS].join(" "),
    "frame-ancestors 'self'",
    // Neither of these falls back to default-src, so omitting them leaves them
    // wide open rather than inheriting 'self'. base-uri stops an injected
    // <base> from re-pointing every relative URL on the page; form-action stops
    // an injected form from posting elsewhere. Both are unscoped: the style
    // relaxation above is only for public pages, these two are for all of them.
    "base-uri 'self'",
    "form-action 'self'",
    `connect-src 'self' https://*.supabase.co ${selfHostedSupabaseOrigin()} https://*.ingest.de.sentry.io https://*.upstash.io${plausibleSrc ? ` ${plausibleSrc}` : ""}`,
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);
}

// Whatever sits in the locale slot. Two letters is the shape of a locale, not
// proof of one: the allow-list in `@/lib/locale` decides, and anything else
// of this shape is sent to the default (REQ-140). Longer first segments —
// /docs, /admin, /monitoring — are not locales and are left alone.
const LOCALE_SEGMENT = /^\/([a-z]{2})(?=\/|$)/;

// The console, in either locale. The sign-in page below it is the one address
// a signed-out visitor is meant to reach.
const LOCALIZED_ADMIN = new RegExp(`^/(${LOCALES.join("|")})/admin(?=/|$)`);

// Locale, the first segment below it, and whatever follows. The third group
// is the tail this rewrite must not interpret.
const RELOCATED_SEGMENT = /^\/([a-z]{2})\/([a-z-]+)(\/.*)?$/;

/**
 * A slug as the given locale spells it — `atlas/pays` under `en` is
 * `atlas/countries` — read off the slug tables in `routing.ts`, which own the
 * vocabulary. A word the tables have no entry for (a retired segment, an
 * identifier) comes back unchanged.
 */
const localiseSlug = (locale: Language, slug: string) =>
  translatePath("fr", locale, `/fr/${slug}`).slice(`/${locale}/`.length);

type Localiser<Value> = (locale: Language, value: Value) => Value;

const verbatim = <Value>(_: Language, value: Value) => value;

/**
 * One side per locale of a table written once, in French.
 *
 * DEC-049 gives the redirect tables a locale dimension so a retired address
 * requested under `/en` resolves to the English successor and never crosses
 * into `/fr` on the way. Deriving the English side rather than typing it
 * keeps a rename to what it was before: one row here, and the slug table does
 * the rest — a hand-kept English column would be a second place for the same
 * row to go stale.
 *
 * Each caller says which side of the row is vocabulary. A redirect table's
 * keys are retired addresses, published once and the same bytes under any
 * locale, so they stay verbatim — translated, `peuples` would become
 * `peoples` through the comparer's entity words and `/en/peuples` would stop
 * matching. Its values are live slugs and take the locale's words. The
 * deep-link table is the other way round: keyed by live slugs, valued by
 * resolvers.
 */
function perLocale<Value>(
  frenchTable: Record<string, Value>,
  localiseKey: Localiser<string>,
  localiseValue: Localiser<Value>
): Record<Language, Record<string, Value>> {
  const sides = LOCALES.map((locale) => [
    locale,
    Object.fromEntries(
      Object.entries(frenchTable).map(([key, value]) => [
        localiseKey(locale, key),
        localiseValue(locale, value),
      ])
    ),
  ]);
  return Object.fromEntries(sides) as Record<Language, Record<string, Value>>;
}

// REQ-114 renamed the hubs from the resources they group to the verb the
// reader arrives with. All three were published, so the old URLs are
// indexed and bookmarked and have to keep resolving. Keyed on the whole
// segment, never a prefix: /fr/peuples is a live resource page and must
// not be swept up by the /fr/peuples-hub entry.
//
// The targets are facets, not axes. These three pointed at the axis landing
// pages until ETNI-1555 deleted them, which turned every entry into a 308
// into a 404 — a permanent move to nothing, as far as a crawler is concerned.
// Each one now lands on the facet holding the resource its old name promised,
// which is also the closest thing the site still serves to what the reader
// bookmarked. `redirectCharter.test.ts` asserts a page file behind each.
// @req REQ-114
export const RENAMED_HUB_SEGMENTS: Record<
  Language,
  Record<string, string>
> = perLocale(
  {
    "peuples-hub": "atlas/peuples",
    "pays-hub": "atlas/pays",
    "familles-hub": "atlas/familles",
  },
  verbatim,
  localiseSlug
);

// ETNI-1458 renamed the ethnonym module from Noms to Appellations, freeing
// the word "Nom" for the person-name entity (ARCH-018). The published,
// indexed address was already nested one level below its hub
// (`comprendre/noms`), which fits neither existing table: RENAMED_HUB_SEGMENTS
// matches exactly one top-level segment, and RELOCATED_SEGMENTS is keyed on
// the single old top-level segment the V1 flat structure used. A rename that
// starts and ends below the hub needs a key that can itself hold a slash.
//
// Regrouping the modules by the registry's own filing rule then gave that
// table two more entries, and both are *moves across* axes rather than
// renames within one:
//
//   · Appellations went to Explorer (now Atlas), so the address ETNI-1458
//     published (`comprendre/appellations`) is itself now legacy. It is
//     keyed here in its own right rather than chained behind
//     `comprendre/noms`: redirectCharter.test.ts forbids a target that is
//     itself a key, and a reader arriving on either published address must
//     reach Atlas in the one hop a 308 can afford to spend.
//   · Doctrine left the axes entirely, and a page no axis lists carries no
//     prefix — so it lands back at the top level, where `RELOCATED_SEGMENTS`
//     stops holding an entry for it and starts leaving it alone.
//
// ETNI-1615's keys read `dossiers/...`, not the historical `comprendre/...`
// a reader actually followed: within one middleware call, `RELOCATED_SEGMENTS`
// already rewrote `comprendre` to `dossiers` by the time this table is
// consulted (the two compose on `canonicalPath`, see `middleware()` below), so
// a key still spelled `comprendre/noms` would never match and this table
// would silently stop firing. The historical address is still honoured — it
// just reaches this table already half-rewritten.
// @req REQ-091
export const RENAMED_MODULE_PATHS: Record<
  Language,
  Record<string, string>
> = perLocale(
  {
    "dossiers/noms": "atlas/appellations",
    "dossiers/appellations": "atlas/appellations",
    "dossiers/doctrine": "doctrine",
    // The two account pages with no successor. There is nothing to register
    // for and no profile to hold, so both land on the one sign-in the atlas
    // has left — the page that explains, in as many words, that reporting
    // needs no account. A 404 would leave a reader to guess that.
    //
    // Keyed `admin/...` and not `compte/...` on purpose: RELOCATED_SEGMENTS
    // has already rewritten `compte` to `admin` by the time this table is
    // consulted, exactly as the `dossiers/` keys above are reached already
    // half-rewritten from `comprendre/`.
    "admin/inscription": "admin/connexion",
    "admin/profil": "admin/connexion",
  },
  verbatim,
  localiseSlug
);

/**
 * Where a renamed module's old nested path leads now, tail (and trailing
 * slash) handled the same way `resolveRelocatedPath` handles them — carried
 * verbatim, dropped when absent — so the two tables read alike even though
 * their keys are shaped differently.
 *
 * Exported for `redirectCharter.test.ts`, alongside `resolveRelocatedPath`.
 */
// @req REQ-091
export function resolveRenamedModulePath(pathname: string): string | null {
  const match = pathname.match(/^\/([a-z]{2})\/(.+)$/);
  if (!match) return null;

  const [, locale, rawRest] = match;
  if (!isLocale(locale)) return null;
  const rest = rawRest.replace(/\/+$/, "");

  for (const [oldPath, newPath] of Object.entries(
    RENAMED_MODULE_PATHS[locale]
  )) {
    if (rest === oldPath || rest.startsWith(`${oldPath}/`)) {
      const tail = rest.slice(oldPath.length);
      return `/${locale}/${newPath}${tail}`;
    }
  }
  return null;
}

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
//
// ETNI-1615 adds `explorer`, `comprendre` and `jouer` as three more keys, of a
// different shape than the rest: those below name a *retired flat V1 address*
// (`/fr/pays`); these three name the *whole axis prefix* the modules were
// nested under until this rename, so a single row here carries every
// currently-published fiche and hub address under that prefix — the tail is
// preserved verbatim by `resolveRelocatedPath` regardless of depth. Every
// other entry's destination is written directly against the new axis prefix
// (`atlas/pays`, not `explorer/pays`) for the same one-hop reason: were it
// left as `explorer/pays`, the *first* redirect would land on an address that
// the new `explorer` entry itself now relocates, and a second request would
// pay for a second 308 this table exists to rule out.
// @req REQ-091
export const RELOCATED_SEGMENTS: Record<
  Language,
  Record<string, string>
> = perLocale(
  {
    pays: "atlas/pays",
    peuples: "atlas/peuples",
    familles: "atlas/familles",
    recherche: "atlas/recherche",
    // `doctrine` was a key here while the page lived under Comprendre. It
    // is served at the top level again, so an entry would send a live route
    // to itself — the loop the charter suite walks this table to rule out.
    noms: "atlas/appellations",
    migrations: "dossiers/migrations",
    // The container keeps its French name under `/en` too: `regards` is
    // only a word of the colonization slug, and the cross-vocabulary step
    // finishes the job on the article below it within the same 308.
    regards: "dossiers/regards",
    quiz: "jeux/quiz",
    // The account area, retired with the public accounts themselves. The
    // subtree maps cleanly onto the admin one — `connexion` and `cles-api`
    // both have a successor there — and the two pages that have none,
    // `inscription` and `profil`, are caught by RENAMED_MODULE_PATHS below.
    // This address is in moderators' history for a specific reason: until
    // now the middleware sent them here to sign in.
    compte: "admin",
    // English spellings, published by V1 and still linked from outside.
    // They are retired addresses in both locales: `/en/countries` is not
    // an English URL the site ever served, only V1's flat vocabulary.
    countries: "atlas/pays",
    families: "atlas/familles",
    peoples: "atlas/peuples",
    // Regions became linguistic families; ethnicities became peoples.
    regions: "atlas/familles",
    regiones: "atlas/familles",
    regioes: "atlas/familles",
    ethnicities: "atlas/peuples",
    ethnies: "atlas/peuples",
    etnias: "atlas/peuples",
    // The three retired axis prefixes, ETNI-1615 (REQ-138): every module
    // moved from the verb the reader arrived with to the noun the label
    // already named. See the block comment above.
    explorer: "atlas",
    comprendre: "dossiers",
    jouer: "jeux",
  },
  verbatim,
  localiseSlug
);

// Which directory a relocated segment was, for the deep links that named a
// fiche in the query string. Without this a `/fr/pays?country=BEN` costs two
// redirects: one here to the moved directory, one from the directory to the
// fiche. Two hops halve the link equity a 308 passes on, and the second one
// only exists because the first forgot what the query said.
//
// The resolvers are `routing.ts`'s, not a copy: they hold the encoding rule
// that keeps `?country=//evil.com` from becoming an off-origin redirect, and
// a rule with two implementations is a rule with one enforced version.
//
// Not per locale: every key is a retired flat segment no slug table spells
// differently, and the resolver takes the locale as an argument.
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
 * `?country=BEN` that became `/fr/atlas/pays/BEN` has been spent, and
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

/**
 * The directory paths at their *current* address that still answer a fiche
 * deep link, keyed by the path between the locale and the query.
 *
 * `resolveRelocatedPath` already resolves `?country=` on the addresses the
 * move retired, but a link made since carries the new address, and there the
 * 308 has to be issued here too.
 *
 * The directory page cannot issue it. `atlas/pays` has a `loading.tsx`, so its
 * shell streams with a 200 before the page body reaches `permanentRedirect`,
 * and the trip degrades into a client-side hop: the reader still lands on the
 * fiche, but the status is 200, the crawler spends its visit on the directory,
 * and the document that finally renders carries a nonce the first response
 * never authorised. Answering before the render starts is what keeps it one
 * hop with one nonce.
 */
// Keyed per locale because the key is a live slug, and a live slug is spelled
// in the locale's own words: `atlas/countries` under `/en`.
const CANONICAL_DEEP_LINK_DIRECTORIES = perLocale<
  (language: Language, query: DeepLinkQuery) => string | null
>(
  {
    "atlas/pays": resolveCountryDeepLink,
    "atlas/peuples": resolvePeopleDeepLink,
    "atlas/familles": resolveFamilyDeepLink,
  },
  localiseSlug,
  verbatim
);

/**
 * The fiche a canonical directory URL is reaching for, or null when its query
 * names none. A trailing slash is not a tail — `/fr/atlas/pays/` is the
 * directory root, and `resolveRelocatedPath` drops it for the same reason.
 */
// @req REQ-091
export function resolveCanonicalDeepLink(
  pathname: string,
  search: URLSearchParams
): string | null {
  const match = pathname.match(/^\/([a-z]{2})\/(.+?)\/?$/);
  if (!match) return null;

  const [, locale, directory] = match;
  if (!isLocale(locale)) return null;
  return (
    CANONICAL_DEEP_LINK_DIRECTORIES[locale][directory]?.(locale, search) ?? null
  );
}

// @req REQ-091
export function resolveRelocatedPath(
  pathname: string,
  search: URLSearchParams
): RelocatedPath | null {
  const match = pathname.match(RELOCATED_SEGMENT);
  if (!match) return null;

  const [, locale, segment] = match;
  if (!isLocale(locale)) return null;
  // A trailing slash is not a tail. Left in, it would send `/fr/pays/` to
  // `/fr/atlas/pays/` and skip the deep-link resolution below.
  const tail = (match[3] ?? "").replace(/\/+$/, "");
  const destination = RELOCATED_SEGMENTS[locale][segment];
  if (!destination) return null;

  // A directory root carrying a fiche identifier goes to the fiche itself.
  // Below the root the query is the page's own business, so it is left alone.
  if (!tail) {
    const fiche = DEEP_LINK_RESOLVERS[segment]?.(locale, search);
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
  const { pathname } = request.nextUrl;

  // The root is the one address whose answer depends on the reader: English
  // unless the switcher recorded French (REQ-140). A 307, never a 308 — a
  // permanent redirect is cached by the browser without asking again, and it
  // would pin a reader to the locale of their first visit no matter what
  // they chose since. `Vary: Cookie` tells every cache between us and them
  // the same thing. The cookie is only ever written by the switcher: landing
  // on `/fr` is not a choice, clicking « Français » is.
  if (pathname === "/") {
    const locale = resolveLocale(request.cookies.get(LOCALE_COOKIE)?.value);
    const home = NextResponse.redirect(
      new URL(`/${locale}${request.nextUrl.search}`, request.nextUrl.origin),
      307
    );
    home.headers.set("Vary", "Cookie");
    return home;
  }

  // Six rewrites, one redirect.
  //
  // They compose rather than each returning: `/es/peuples` is both an
  // unpublished locale and a relocated module, and answering it with
  // `/en/peuples` would send the reader to an address this same middleware
  // redirects again. Two 308s is what the one-hop rule forbids, and the
  // second one would be entirely of our own making.
  //
  // All six are 308: none of them is a page moving temporarily, so a
  // crawler should transfer the old URL's standing rather than keep
  // revisiting it. The cookie plays no part here — the answer must be the
  // same for everyone, or the 308 could not be cached at all.
  let canonicalPath = pathname;
  let moved = false;

  // A two-letter segment the site does not publish becomes the default,
  // subpath and query preserved. `/fr/*` is never touched (REQ-140).
  const localeMatch = canonicalPath.match(LOCALE_SEGMENT);
  if (localeMatch && !isLocale(localeMatch[1])) {
    const rest = canonicalPath.slice(localeMatch[0].length).replace(/\/+$/, "");
    canonicalPath = `/${DEFAULT_LOCALE}${rest}`;
    moved = true;
  }

  // REQ-114's hub rename. Keyed on exactly one segment — see the table.
  const renamedHub = canonicalPath.match(/^\/([a-z]{2})\/([a-z-]+)\/?$/);
  if (
    renamedHub &&
    isLocale(renamedHub[1]) &&
    RENAMED_HUB_SEGMENTS[renamedHub[1]][renamedHub[2]]
  ) {
    canonicalPath = `/${renamedHub[1]}/${RENAMED_HUB_SEGMENTS[renamedHub[1]][renamedHub[2]]}`;
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

  // The nested moves: the historical comprendre/noms and
  // comprendre/appellations addresses to atlas/appellations, comprendre/
  // doctrine back to the top level — read here as dossiers/noms,
  // dossiers/appellations, dossiers/doctrine, because the axis-prefix rewrite
  // above already ran (see the comment on RENAMED_MODULE_PATHS). A rewrite of
  // its own, composing into the same single 308 as the three above for the
  // same reason — two hops would spend the old URL's standing twice.
  const renamedModule = resolveRenamedModulePath(canonicalPath);
  if (renamedModule) {
    canonicalPath = renamedModule;
    moved = true;
  }

  // DEC-049: a path spelled in the other locale's words goes to its own —
  // `/en/atlas/pays` to `/en/atlas/countries` — or the French folders would
  // serve one document at two English addresses. After the three tables
  // above, whose answers are French words carried verbatim under `/en`
  // (`/en/peuples/PPL_X/liens` → `…/peoples/PPL_X/liens`), and before the
  // deep-link step, whose table is keyed by each locale's own slug: a
  // `/en/atlas/pays?country=BEN` has to be `/en/atlas/countries` by the time
  // that table is consulted, or the query survives into a second 308.
  const ownVocabulary = localeSlugMismatch(canonicalPath);
  if (ownVocabulary) {
    canonicalPath = ownVocabulary;
    moved = true;
  }

  // Last, so it reads the address the rewrites above settled on rather than
  // the one the request arrived with: a legacy path that just became
  // `/fr/atlas/pays` still gets its `?country=` spent here, in the same 308.
  const canonicalFiche = resolveCanonicalDeepLink(
    canonicalPath,
    request.nextUrl.searchParams
  );
  if (canonicalFiche) {
    canonicalPath = canonicalFiche;
    keepQuery = false;
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

  // Every /api/v2 response states which major version answered — the ones this
  // middleware returns itself as much as the ones a route handler produces. The
  // 401 and the 429 below never reach `jsonWithCors`, and they are exactly the
  // responses an integration is read against when it breaks.
  //
  // Self-guarding on the pathname, so wrapping a return that also serves pages
  // costs nothing and cannot leak the public API's version onto /fr or
  // /api/entities.
  const versioned = <ResponseType extends Response>(response: ResponseType) =>
    applyVersioningHeaders(response, pathname);
  // The whole /api/v2/keys subtree sits outside api_keys Bearer auth: /issue
  // is anonymous, and the self-service list/create/revoke endpoints (ETNI-81)
  // authenticate a Supabase session access token themselves inside the route
  // handler (see @/api/v2/services/keyService.getAuthenticatedUser) rather
  // than through this gate — a session JWT is not an api_keys row and would
  // otherwise be rejected here as an invalid API key before ever reaching it.
  const requiresApiKeyAuth = isApiV2 && !pathname.startsWith("/api/v2/keys");

  // Rate limit routes that never validate an API key (e.g. /api/v2/keys/issue)
  // up front, since there is no DB-validated tier to wait for. Routes that do
  // validate a key are rate-limited below, once the tier is known, so a single
  // request only ever consumes one rate-limit bucket.
  if (isApiV2 && !requiresApiKeyAuth) {
    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse) return versioned(rateLimitResponse);
  }

  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // The resolved locale, for the root layout's `<html lang>`, which sits
  // above `[lang]` and cannot read the segment. Deleted first: the header is
  // this middleware's word, and a browser can send one too.
  requestHeaders.delete(LOCALE_HEADER);
  const requestLocale = localeMatch?.[1];
  if (isLocale(requestLocale)) {
    requestHeaders.set(LOCALE_HEADER, requestLocale);
  }

  // The route folders under `src/app/[lang]` are French; an English address
  // is served by rewriting it onto the French folder with the `/en` prefix
  // kept, so the page still reads `lang = "en"`. Built here rather than
  // returned early so the session refresh and the security headers below
  // run on the rewritten response exactly as on a pass-through.
  const routeFilePath = toRouteFilePath(pathname);
  const forward = () =>
    routeFilePath
      ? NextResponse.rewrite(
          new URL(
            `${routeFilePath}${request.nextUrl.search}`,
            request.nextUrl.origin
          ),
          { request: { headers: requestHeaders } }
        )
      : NextResponse.next({ request: { headers: requestHeaders } });

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
      if (rateLimitResponse) return versioned(rateLimitResponse);
      return versioned(
        NextResponse.json({ error: "missing_api_key" }, { status: 401 })
      );
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
      if (ipRateLimitResponse) return versioned(ipRateLimitResponse);
      result = await validateApiKey(rawKey);
    }

    const tier = result.valid ? result.tier : "public";
    const rateLimitResponse = await applyRateLimit(request, tier);
    if (rateLimitResponse) return versioned(rateLimitResponse);

    if (result.valid === false) {
      return versioned(
        NextResponse.json({ error: result.reason }, { status: 401 })
      );
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
    return versioned(requestWithKey);
  }

  // --- Admin route protection ---
  let supabaseResponse = forward();

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
          supabaseResponse = forward();
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

  // `/{locale}/admin/*` is the moderator area, in whichever locale the
  // moderator reads; the sign-in below it is the entry point and is excluded.
  const adminArea = pathname.match(LOCALIZED_ADMIN);
  const signInPath = adminArea ? `/${adminArea[1]}/admin/connexion` : null;
  const isAdminRoute = adminArea !== null && pathname !== signInPath;

  // Authentication here, authorization in the page.
  //
  // This used to read `contributor_profiles.moderator_role` on the visitor's
  // own client. Authorization is now membership of `admin_allowlist`, a table
  // with RLS and no policy — this client could not read it if it tried, and
  // giving it one would publish the moderator roster. So the middleware
  // establishes that somebody is signed in, and `getModeratorSession()` in the
  // page decides whether that somebody may be here.
  if (isAdminRoute && !user) {
    const signInUrl = new URL(signInPath!, request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  applySecurityHeaders(supabaseResponse, nonce, pathname);
  return versioned(supabaseResponse);
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
