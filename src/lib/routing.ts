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

export const getSlugFromRoute = (pathname: string): string | null => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return parts[1];
};

// ---------------------------------------------------------------------------
// Entity routes — localized href to a single fiche (ContextTriad, ETNI-818)
// ---------------------------------------------------------------------------

export const getCountryRoute = (language: Language, id: string): string =>
  `${getLocalizedRoute(language, "countries")}/${id}`;

export const getFamilyRoute = (language: Language, id: string): string =>
  `${getLocalizedRoute(language, "families")}/${id}`;

export const getPeopleRoute = (language: Language, id: string): string =>
  `${getLocalizedRoute(language, "peoples")}/${id}`;

// ---------------------------------------------------------------------------
// Nested entity sub-routes — segments below a single fiche (Epic 11, FR72)
// ---------------------------------------------------------------------------

const LIENS_SLUG: Record<Language, string> = {
  fr: "liens",
};

// @req REQ-097
export const getPeopleLinksRoute = (language: Language, id: string): string =>
  `${getPeopleRoute(language, id)}/${LIENS_SLUG[language]}`;
