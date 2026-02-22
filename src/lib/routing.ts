import { Language } from "@/types/shared";

export type PageType = "countries" | "families" | "peoples" | "search";

// Mapping des slugs par langue
const SLUGS: Record<Language, Record<PageType, string>> = {
  en: {
    countries: "countries",
    families: "families",
    peoples: "peoples",
    search: "search",
  },
  fr: {
    countries: "pays",
    families: "familles",
    peoples: "peuples",
    search: "recherche",
  },
};

// Mapping inverse : slug -> pageType
const SLUG_TO_PAGE: Record<string, PageType> = {
  countries: "countries",
  pays: "countries",
  families: "families",
  familles: "families",
  peoples: "peoples",
  peuples: "peoples",
  search: "search",
  recherche: "search",
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
  if (["en", "fr"].includes(lang)) {
    return lang as Language;
  }

  return null;
};

export const getSlugFromRoute = (pathname: string): string | null => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return parts[1];
};
