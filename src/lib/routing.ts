import { Language } from "@/types/shared";

export type PageType =
  | "countries"
  | "families"
  | "peoples"
  | "languages"
  | "search"
  | "doctrine"
  | "about"
  | "sources"
  | "anecdotes"
  | "names"
  | "patronymes"
  | "compare"
  | "migrations"
  | "quiz"
  | "colonization"
  | "atlasHub"
  | "dossiersHub"
  | "jeuxHub";

// Mapping des slugs par langue.
//
// A module's slug opens on the hub that leads to it, so the URL states the
// same hierarchy the menu does: `/fr/atlas/pays` rather than `/fr/pays`
// beside a `/fr/atlas` that claims to lead there. The three hubs were
// published as the three entry points and then led to pages that sat above
// them, which left every module addressable without ever naming the axis it
// belonged to — and so no way for a reader, or a crawler, to tell an axis
// from a heading.
//
// The prefix is written out rather than composed from `moduleRegistry`,
// which imports this file: deriving it would put a cycle in the module
// every page and the middleware load. Nothing closes that gap
// automatically — a comment here once claimed `routingCharter.test.ts` did,
// and no such file has ever existed — so a module filed under one verb in
// the registry and another here is caught by review, not by the build.
//
// `about`, `doctrine`, `sources` and `compare` carry no prefix, for one
// reason: no axis lists them, so nesting them would invent an ancestor the
// menu never offers. The first three describe the project rather than the
// corpus and left the access-mode taxonomy for the footer (REQ-132).
const SLUGS: Record<Language, Record<PageType, string>> = {
  fr: {
    countries: "atlas/pays",
    families: "atlas/familles",
    peoples: "atlas/peuples",
    // ETNI-1507: the fiche exists ahead of a hub listing it (no index page
    // yet reads afrik_languages), so this slug currently has no ancestor to
    // land a reader who walks the crumb up.
    languages: "atlas/langues",
    search: "atlas/recherche",
    doctrine: "doctrine",
    about: "about",
    sources: "sources",
    anecdotes: "dossiers/anecdotes",
    names: "atlas/appellations",
    // DEC-038 separates the two objects the corpus calls "name": an
    // *appellation* is how a people is called (an ethnonym, an access point
    // onto the people fiche), a *patronyme* is the naming system a person is
    // named under — an entity with its own fiche. They shared the
    // `atlas/appellations` prefix, so the second was addressed as a detail of
    // the first while nothing ever linked the two, and the public label
    // "Nom" appeared in no URL. `atlas/noms` is that label.
    patronymes: "atlas/noms",
    compare: "comparer",
    migrations: "dossiers/migrations",
    quiz: "jeux/quiz",
    // Epic 13 (Gazes), FR90 — French-only, no locale alternates.
    colonization: "dossiers/regards/colonisation-et-resistances",
    // REQ-114/REQ-138: one hub route per access mode. The slug is the verb
    // the reader arrived with, which is what keeps it from colliding with
    // the resource pages (peuples/pays/familles) it now holds.
    atlasHub: "atlas",
    dossiersHub: "dossiers",
    jeuxHub: "jeux",
  },
};

/**
 * Every page type, read off the slug table rather than written out.
 *
 * `SLUGS` is a `Record<Language, Record<PageType, string>>`, which the
 * compiler refuses to leave incomplete, so a list derived from it cannot fall
 * behind the union the way a hand-kept array would.
 */
// @req REQ-091
export const PAGE_TYPES = Object.keys(SLUGS.fr) as PageType[];

// @req REQ-091
export const getLocalizedRoute = (
  language: Language,
  page: PageType
): string => {
  const slug = SLUGS[language][page];
  return `/${language}/${slug}`;
};

/**
 * Matches on the longest slug first so a multi-segment slug (e.g.
 * `comprendre/regards/colonisation-et-resistances`) isn't shadowed by a
 * shorter one sharing its first segment.
 *
 * Now that the modules nest, every one of them shares its first segment with
 * its hub, so that sort is what separates `/fr/atlas/pays` from
 * `/fr/atlas`. It needed no change to do it — the ordering was already
 * the rule, only rarely exercised.
 */
// @req REQ-091
export const getPageFromRoute = (pathname: string): PageType | null => {
  // Format: /{lang}/{slug...}
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const language = parts[0] as Language;
  const slugMap = SLUGS[language];
  if (!slugMap) return null;

  const remainder = parts.slice(1).join("/");
  const entries = Object.entries(slugMap) as [PageType, string][];
  entries.sort((a, b) => b[1].length - a[1].length);

  for (const [page, slug] of entries) {
    if (remainder === slug || remainder.startsWith(`${slug}/`)) {
      return page;
    }
  }
  return null;
};

// @req REQ-091
export const getLanguageFromRoute = (pathname: string): Language | null => {
  // Format: /{lang}/{slug}
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 1) return null;

  const lang = parts[0];
  if (["fr"].includes(lang)) {
    return lang as Language;
  }

  return null;
};

// ---------------------------------------------------------------------------
// Entity routes — localized href to a single fiche (ContextTriad, ETNI-818)
// ---------------------------------------------------------------------------

// @req REQ-091
export const getCountryRoute = (language: Language, id: string): string =>
  `${getLocalizedRoute(language, "countries")}/${id}`;

// @req REQ-091
export const getFamilyRoute = (language: Language, id: string): string =>
  `${getLocalizedRoute(language, "families")}/${id}`;

// @req REQ-097
export const getPeopleRoute = (language: Language, id: string): string =>
  `${getLocalizedRoute(language, "peoples")}/${id}`;

// @req REQ-133
export const getPatronymeRoute = (language: Language, id: string): string =>
  `${getLocalizedRoute(language, "patronymes")}/${id}`;

// @req REQ-136
export const getLanguageRoute = (language: Language, id: string): string =>
  `${getLocalizedRoute(language, "languages")}/${id}`;

/**
 * A source's own address, on its UUID.
 *
 * The identifier is ugly and deliberately so: it is the only stable one. The
 * title is the conflict target of `upsert(onConflict: "title")` in four AFRIK
 * loaders, so it is precisely the value a re-sourcing rewrites, and there is no
 * redirect table to catch the links that would break. `source_key` is stable
 * but no loader has ever written one. The segment is named `id` rather than
 * `uuid` so a future key can resolve here without moving the route.
 */
// @req REQ-092
export const getSourceRoute = (language: Language, id: string): string =>
  `${getLocalizedRoute(language, "sources")}/${id}`;

// A person (REQ-126) is not a fourth peer of pays/peuples/familles on the
// Explorer axis — it is reached only from a search result or from the people
// it is linked to, never from a hub listing — so it takes a standalone slug
// map rather than a `PageType`, which would otherwise pull it into
// `moduleRegistry` and every other exhaustive consumer of that union for no
// module that will ever exist.
const PERSON_SLUG: Record<Language, string> = {
  fr: "atlas/personnes",
};

// @req REQ-126
export const getPersonRoute = (language: Language, id: string): string =>
  `/${language}/${PERSON_SLUG[language]}/${id}`;

// ---------------------------------------------------------------------------
// Retired directory deep links
// ---------------------------------------------------------------------------

/**
 * A query string in either shape the app reads one from: the plain object a
 * server component receives as `searchParams`, and the `URLSearchParams` a
 * client component gets from `useSearchParams`.
 *
 * One type rather than a second resolver per entity, because the rule below
 * has to have exactly one implementation. The families directory is the
 * proof it does not survive being written twice: it read its own query
 * client-side and forwarded the identifier raw for as long as it existed.
 */
// @req REQ-091
export type DeepLinkQuery =
  | Record<string, string | string[] | undefined>
  | URLSearchParams;

/**
 * The single value the query holds under `key`, or null when it holds none or
 * several — a repeated query has no single answer, so it gets none.
 */
const singleQueryValue = (query: DeepLinkQuery, key: string): string | null => {
  if (query instanceof URLSearchParams) {
    const values = query.getAll(key);
    return values.length === 1 && values[0].length > 0 ? values[0] : null;
  }
  const value = query[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

/**
 * The one place a directory query becomes a fiche href, and so the one place
 * the identifier is **encoded**. Left raw, a `?country=//host` turns the
 * redirect into an open one, because a browser reads two leading slashes as
 * the start of a host.
 *
 * The identifier is otherwise forwarded untouched. Validating its shape would
 * turn a reader's typo into a silent fall-back to a list, where the fiche
 * route answers it with an honest 404.
 */
const resolveDeepLink = (
  query: DeepLinkQuery,
  key: string,
  toFicheRoute: (identifier: string) => string
): string | null => {
  const identifier = singleQueryValue(query, key);
  return identifier === null
    ? null
    : toFicheRoute(encodeURIComponent(identifier));
};

/**
 * The fiche a `/fr/pays?country=XXX` link was reaching for, or null when the
 * query names no country.
 *
 * The country directory used to open a detail pane beside its list; the atlas
 * fiche replaced it, and that query shape survives only in links already sent.
 */
// @req REQ-091
export const resolveCountryDeepLink = (
  language: Language,
  query: DeepLinkQuery
): string | null =>
  resolveDeepLink(query, "country", (id) => getCountryRoute(language, id));

/**
 * The fiche a `/fr/peuples?people=PPL_XXX` link was reaching for, or null when
 * the query names no people.
 *
 * The peoples directory used to open a people in a pane beside its list — the
 * fiche on the left, the list on the right, no globe — which made a second
 * people surface, reached from the main navigation, while the atlas fiche sat
 * one URL away.
 */
// @req REQ-097
export const resolvePeopleDeepLink = (
  language: Language,
  query: DeepLinkQuery
): string | null =>
  resolveDeepLink(query, "people", (id) => getPeopleRoute(language, id));

/**
 * The fiche a `/fr/familles?family=FLG_XXX` link was reaching for, or null
 * when the query names no family.
 *
 * The families directory kept picking a family in place — a tabbed detail
 * competing with the charter fiche one URL away — and it forwarded the
 * bookmarked identifier itself, unencoded. Routing it through the shared
 * resolver is what closes that open redirect.
 */
// @req REQ-091
export const resolveFamilyDeepLink = (
  language: Language,
  query: DeepLinkQuery
): string | null =>
  resolveDeepLink(query, "family", (id) => getFamilyRoute(language, id));

// ---------------------------------------------------------------------------
// Nested entity sub-routes — segments below a single fiche (Epic 11, FR72)
// ---------------------------------------------------------------------------

const LIENS_SLUG: Record<Language, string> = {
  fr: "liens",
};

// @req REQ-097
export const getPeopleLinksRoute = (language: Language, id: string): string =>
  `${getPeopleRoute(language, id)}/${LIENS_SLUG[language]}`;
