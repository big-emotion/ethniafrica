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
  | "quiz";

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
  },
};

// Mapping inverse : slug -> pageType
const SLUG_TO_PAGE: Record<string, PageType> = {
  pays: "countries",
  familles: "families",
  peuples: "peoples",
  recherche: "search",
  doctrine: "doctrine",
  about: "about",
  noms: "names",
  comparer: "compare",
  migrations: "migrations",
  quiz: "quiz",
};

export const getLocalizedRoute = (
  language: Language,
  page: PageType
): string => {
  const slug = SLUGS[language][page];
  return `/${language}/${slug}`;
};

export const getPageFromRoute = (pathname: string): PageType | null => {
  // Format: /{lang}/{slug}
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const slug = parts[1];
  return SLUG_TO_PAGE[slug] || null;
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
