import { Language } from "@/types/shared";
import { isLocale } from "@/lib/locale";

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
  | "nommer"
  | "glossary"
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
//
// DEC-049: English URLs carry English words, so a route rename is now two
// entries here and two redirect rows in `middleware.ts`, forever. The French
// values are byte-identical to what was published; a redirect table exists
// for every retired one, and none exists for a word that quietly changes.
const SLUGS: Record<Language, Record<PageType, string>> = {
  en: {
    countries: "atlas/countries",
    families: "atlas/families",
    peoples: "atlas/peoples",
    languages: "atlas/languages",
    search: "atlas/search",
    doctrine: "doctrine",
    about: "about",
    sources: "sources",
    anecdotes: "dossiers/anecdotes",
    // The two "name" objects again (DEC-038, see the French table): the
    // PageType named `names` is the ethnonym index, so its English slug is
    // `ethnonyms`; the public English word "name" goes to `patronymes`,
    // exactly as « nom » does in French. A reader of this table must not
    // take the key `names` for the slug `names`.
    names: "atlas/ethnonyms",
    patronymes: "atlas/names",
    compare: "compare",
    migrations: "dossiers/migrations",
    quiz: "games/quiz",
    colonization: "dossiers/perspectives/colonisation-and-resistances",
    nommer: "dossiers/naming",
    glossary: "glossary",
    // `dossiers` is kept as an English word on purpose: the retired module
    // paths keyed `dossiers/…` in `middleware.ts` then work in both locales.
    atlasHub: "atlas",
    dossiersHub: "dossiers",
    jeuxHub: "games",
  },
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
    // Epic 13 (Gazes), FR90. Published French-only until DEC-049; the
    // English table above carries its alternate.
    colonization: "dossiers/regards/colonisation-et-resistances",
    // The founding dossier. Its five chapters sit under this slug but are not
    // page types of their own — see NOMMER_CHAPTER_SLUGS below.
    //
    // One character keeps this route from being rewritten: `middleware.ts`
    // retired `dossiers/noms` to `atlas/appellations`, and the prefix match
    // there requires a trailing slash, so `dossiers/nommer` misses it. Do not
    // "simplify" that guard.
    nommer: "dossiers/nommer",
    // No axis lists the glossary, so it carries no prefix — the same reason
    // `about`, `doctrine` and `sources` carry none. It serves the atlas and
    // the games as much as the dossiers, and it is reached from the footer's
    // "Le projet" rubric.
    glossary: "glossaire",
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

/**
 * The locales the slug table serves, read off the table the same way. The
 * middleware's allow-list follows it so a locale cannot be published without
 * a vocabulary to publish it in.
 */
// @req REQ-141
export const PUBLISHED_LOCALES = Object.keys(SLUGS) as Language[];

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

  // Each locale resolves against its own vocabulary and never the other's:
  // `/en/atlas/pays` answers the atlas hub, not `countries`, and it is the
  // middleware's job (`localeSlugMismatch`) to send it to `/en/atlas/countries`.
  const language = parts[0];
  if (!isLocale(language)) return null;
  const slugMap = SLUGS[language];

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
  return isLocale(lang) ? lang : null;
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
  en: "atlas/persons",
  fr: "atlas/personnes",
};

// @req REQ-126
export const getPersonRoute = (language: Language, id: string): string =>
  `/${language}/${PERSON_SLUG[language]}/${id}`;

// ---------------------------------------------------------------------------
// Chapters of the Nommer dossier
// ---------------------------------------------------------------------------

/**
 * The five chapters of `/fr/dossiers/nommer`, keyed by their own slug.
 *
 * They are a standalone slug map rather than five `PageType` members, for the
 * same reason `PERSON_SLUG` is — but the deciding argument here is the trail.
 * `deriveTrail` builds the axis crumb through `getAxisForPage`, which reads
 * `moduleRegistry`, and a chapter cannot be a module there: the shelf
 * mechanism is locked to Jouer, and five registry entries would mean five
 * menu rows and five maturities to declare for what is one dossier.
 *
 * As page types the chapters would therefore trail `Accueil › Le peuple`,
 * losing both the axis and the pillar. Left as segments, the existing segment
 * loop renders `Accueil › Les dossiers › Qui a donné ce nom ? › Le peuple`
 * with nothing to write — `getPageFromRoute` already answers `nommer` for a
 * chapter URL, because it sorts by slug length.
 *
 * Declaration order is reading order: the pillar's tile grid and each
 * chapter's previous/next are derived from it rather than declared twice.
 */
export type NommerChapterKey =
  "le-peuple" | "le-pays" | "la-personne" | "la-langue" | "la-chose";

const NOMMER_CHAPTER_SLUG_TABLE = {
  // Keyed by the French chapter key in both locales: the key is the
  // chapter's identity across the corpus, the value is its address.
  en: {
    "le-peuple": "the-people",
    "le-pays": "the-country",
    "la-personne": "the-person",
    "la-langue": "the-language",
    "la-chose": "the-thing",
  },
  fr: {
    "le-peuple": "le-peuple",
    "le-pays": "le-pays",
    "la-personne": "la-personne",
    "la-langue": "la-langue",
    "la-chose": "la-chose",
  },
} satisfies Record<Language, Record<NommerChapterKey, string>>;

// @req REQ-091
export const NOMMER_CHAPTER_SLUGS = NOMMER_CHAPTER_SLUG_TABLE;

// @req REQ-091
export const NOMMER_CHAPTER_KEYS = Object.keys(
  NOMMER_CHAPTER_SLUG_TABLE.fr
) as NommerChapterKey[];

// @req REQ-091
export const getNommerChapterRoute = (
  language: Language,
  chapter: NommerChapterKey
): string =>
  `${getLocalizedRoute(language, "nommer")}/${NOMMER_CHAPTER_SLUGS[language][chapter]}`;

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
  Record<string, string | string[] | undefined> | URLSearchParams;

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
  en: "links",
  fr: "liens",
};

// @req REQ-097
export const getPeopleLinksRoute = (language: Language, id: string): string =>
  `${getPeopleRoute(language, id)}/${LIENS_SLUG[language]}`;

// ---------------------------------------------------------------------------
// Pages that are not page types, and the comparer's entity segment
// ---------------------------------------------------------------------------

/**
 * The pages `PageType` deliberately ignores — legal notices, the report
 * queue, the contribution and contact forms, the admin console. They address
 * no module of the corpus (see `trail.segments` in translations.ts for why
 * that union must not widen), but they do have an address in each locale,
 * and the switcher and the sitemap need to compose it.
 */
// @req REQ-141
export type StaticPageKey =
  | "legalNotice"
  | "dataPolicy"
  | "accessibility"
  | "sitemap"
  | "reports"
  | "contact"
  | "contribute"
  | "reportError"
  | "admin";

// @req REQ-141
export const STATIC_PAGE_SLUGS: Record<
  Language,
  Record<StaticPageKey, string>
> = {
  en: {
    legalNotice: "legal-notice",
    dataPolicy: "data-policy",
    accessibility: "accessibility",
    sitemap: "sitemap",
    reports: "reports",
    contact: "contact",
    contribute: "contribute",
    reportError: "report-error",
    admin: "admin",
  },
  fr: {
    legalNotice: "mentions-legales",
    dataPolicy: "politique-de-donnees",
    accessibility: "accessibilite",
    sitemap: "plan-du-site",
    reports: "signalements",
    // Three routes that were built with English folder names before there
    // was an English locale, and stay so: renaming them buys nothing.
    contact: "contact",
    contribute: "contribute",
    reportError: "report-error",
    admin: "admin",
  },
};

const STATIC_PAGE_KEYS = Object.keys(STATIC_PAGE_SLUGS.fr) as StaticPageKey[];

// @req REQ-141
export const getStaticPageRoute = (
  language: Language,
  key: StaticPageKey
): string => `/${language}/${STATIC_PAGE_SLUGS[language][key]}`;

/**
 * The segment that names what a comparison compares —
 * `/fr/comparer/peuples/PPL_A/PPL_B` — keyed by the entity the API calls it.
 */
// @req REQ-141
export type CompareEntityKey = "peoples" | "countries" | "families";

// @req REQ-141
export const COMPARE_ENTITY_SEGMENTS: Record<
  Language,
  Record<CompareEntityKey, string>
> = {
  en: { peoples: "peoples", countries: "countries", families: "families" },
  fr: { peoples: "peuples", countries: "pays", families: "familles" },
};

const COMPARE_ENTITY_KEYS = Object.keys(
  COMPARE_ENTITY_SEGMENTS.fr
) as CompareEntityKey[];

// ---------------------------------------------------------------------------
// Moving a path between locales (DEC-049)
// ---------------------------------------------------------------------------

/**
 * The pairs that can open a path — a page slug, the person slug, a static
 * page — longest first, so `atlas/persons` is tried before `atlas`.
 */
const headPairs = (from: Language, to: Language): [string, string][] => {
  const pairs: [string, string][] = PAGE_TYPES.map((page) => [
    SLUGS[from][page],
    SLUGS[to][page],
  ]);
  pairs.push([PERSON_SLUG[from], PERSON_SLUG[to]]);
  for (const key of STATIC_PAGE_KEYS) {
    pairs.push([STATIC_PAGE_SLUGS[from][key], STATIC_PAGE_SLUGS[to][key]]);
  }
  return pairs.sort((a, b) => b[0].length - a[0].length);
};

/**
 * The single segments that can follow a head — the links tail, a chapter,
 * the comparer's entity. Everything else below a head is an identifier or a
 * word both locales share (`score`, a game slug) and travels unchanged.
 */
const tailWords = (from: Language, to: Language): Record<string, string> => {
  const words: Record<string, string> = {
    [LIENS_SLUG[from]]: LIENS_SLUG[to],
  };
  for (const key of NOMMER_CHAPTER_KEYS) {
    words[NOMMER_CHAPTER_SLUG_TABLE[from][key]] =
      NOMMER_CHAPTER_SLUG_TABLE[to][key];
  }
  for (const key of COMPARE_ENTITY_KEYS) {
    words[COMPARE_ENTITY_SEGMENTS[from][key]] =
      COMPARE_ENTITY_SEGMENTS[to][key];
  }
  return words;
};

/**
 * The same page in the other locale: `/fr/atlas/peuples/PPL_YORUBA/liens` →
 * `/en/atlas/peoples/PPL_YORUBA/links`.
 *
 * One function for the switcher, the hreflang alternates and the middleware
 * rewrite, so the vocabulary is walked in exactly one place. Identifiers and
 * segments it has no word for are carried verbatim, percent-encoding
 * included. A path that does not open on `from` is returned untouched: it is
 * not this locale's to translate. The query string is the caller's.
 */
// @req REQ-141
export const translatePath = (
  from: Language,
  to: Language,
  pathname: string
): string => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== from) return pathname;

  const remainder = parts.slice(1).join("/");
  let head: string | null = null;
  let tail = parts.slice(1);
  for (const [source, target] of headPairs(from, to)) {
    if (remainder === source || remainder.startsWith(`${source}/`)) {
      head = target;
      tail = remainder.slice(source.length).split("/").filter(Boolean);
      break;
    }
  }

  const words = tailWords(from, to);
  const segments = [
    to,
    ...(head === null ? [] : [head]),
    ...tail.map((segment) => words[segment] ?? segment),
  ];
  return `/${segments.join("/")}`;
};

/**
 * The locale the route folders under `src/app/[lang]` are written in. The
 * folders were never renamed when English URLs arrived: an English address
 * is served by rewriting it onto the French folder, locale prefix kept.
 */
const ROUTE_FOLDER_LOCALE: Language = "fr";

/**
 * The folder path Next serves for a public path, or null when the path
 * already is one: `/en/atlas/countries/BEN` → `/en/atlas/pays/BEN`.
 *
 * Null rather than the input for "nothing to do", so the middleware can tell
 * a rewrite from a pass-through without comparing strings itself.
 */
// @req REQ-141
export const toRouteFilePath = (pathname: string): string | null => {
  const locale = getLanguageFromRoute(pathname);
  if (!locale || locale === ROUTE_FOLDER_LOCALE) return null;

  const folderPath = translatePath(locale, ROUTE_FOLDER_LOCALE, pathname);
  const rewritten = `/${locale}${folderPath.slice(`/${ROUTE_FOLDER_LOCALE}`.length)}`;
  return rewritten === pathname ? null : rewritten;
};

/**
 * Where a path written in the other locale's vocabulary belongs, or null
 * when the path is already in its own: `/en/atlas/pays` → `/en/atlas/countries`.
 *
 * With the folders French, `/en/atlas/pays` would otherwise be served — one
 * document at two English addresses, which is the duplicate DEC-049 refuses.
 * Symmetric on purpose: `/fr/atlas/countries` → `/fr/atlas/pays`. Derived
 * from the slug tables, so a rename costs no redirect row here.
 */
// @req REQ-141
export const localeSlugMismatch = (pathname: string): string | null => {
  const locale = getLanguageFromRoute(pathname);
  if (!locale) return null;

  const rest = pathname.slice(`/${locale}`.length);
  const own = translatePath(locale, locale, pathname);
  for (const foreign of PUBLISHED_LOCALES) {
    if (foreign === locale) continue;
    const resolved = translatePath(foreign, locale, `/${foreign}${rest}`);
    if (resolved !== own) return resolved;
  }
  return null;
};
