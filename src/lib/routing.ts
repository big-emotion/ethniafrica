import { Language } from "@/types/shared";

export type PageType =
  | "countries"
  | "families"
  | "peoples"
  | "search"
  | "doctrine"
  | "about"
  | "names"
  | "compare"
  | "migrations"
  | "quiz"
  | "colonization"
  | "explorerHub"
  | "comprendreHub"
  | "jouerHub";

// Mapping des slugs par langue
const SLUGS: Record<Language, Record<PageType, string>> = {
  fr: {
    countries: "pays",
    families: "familles",
    peoples: "peuples",
    search: "recherche",
    doctrine: "doctrine",
    about: "about",
    names: "noms",
    compare: "comparer",
    migrations: "migrations",
    quiz: "quiz",
    // Epic 13 (Gazes), FR90 — French-only, no locale alternates.
    colonization: "regards/colonisation-et-resistances",
    // REQ-114: one hub route per access mode. The slug is the verb the
    // reader arrived with, which is what keeps it from colliding with the
    // resource pages (peuples/pays/familles) it groups.
    explorerHub: "explorer",
    comprendreHub: "comprendre",
    jouerHub: "jouer",
  },
};

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
 * `regards/colonisation-et-resistances`) isn't shadowed by a shorter one
 * sharing its first segment.
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

// @req REQ-091
export const getSlugFromRoute = (pathname: string): string | null => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return parts[1];
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

// ---------------------------------------------------------------------------
// Retired directory deep links
// ---------------------------------------------------------------------------

/**
 * The fiche a `/fr/pays?country=XXX` link was reaching for, or null when the
 * query names no country.
 *
 * The country directory used to open a detail pane beside its list; the atlas
 * fiche replaced it, and that query shape survives only in links already sent.
 * Resolving it here rather than in the page keeps it a pure unit, and keeps the
 * one rule that matters testable: the identifier is **encoded**. Left raw, a
 * `?country=//host` turns the redirect into an open one, because a browser
 * reads two leading slashes as the start of a host.
 *
 * The identifier is otherwise forwarded untouched. Validating its shape would
 * turn a reader's typo into a silent fall-back to the list, where the fiche
 * route answers it with an honest 404.
 */
// @req REQ-091
export const resolveCountryDeepLink = (
  language: Language,
  searchParams: Record<string, string | string[] | undefined>
): string | null => {
  const country = searchParams.country;
  // A repeated query has no single answer, so it gets none.
  if (typeof country !== "string" || country.length === 0) return null;
  return getCountryRoute(language, encodeURIComponent(country));
};

// ---------------------------------------------------------------------------
// Nested entity sub-routes — segments below a single fiche (Epic 11, FR72)
// ---------------------------------------------------------------------------

const LIENS_SLUG: Record<Language, string> = {
  fr: "liens",
};

// @req REQ-097
export const getPeopleLinksRoute = (language: Language, id: string): string =>
  `${getPeopleRoute(language, id)}/${LIENS_SLUG[language]}`;
