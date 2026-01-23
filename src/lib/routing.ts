import { Language } from "@/types/ethnicity";

export type PageType =
  | "regions"
  | "countries"
  | "ethnicities"
  | "families"
  | "peoples";

// Mapping des slugs par langue
const SLUGS: Record<Language, Record<PageType, string>> = {
  en: {
    regions: "regions",
    countries: "countries",
    ethnicities: "ethnicities",
    families: "families",
    peoples: "peoples",
  },
  fr: {
    regions: "regions",
    countries: "pays",
    ethnicities: "ethnies",
    families: "familles",
    peoples: "peuples",
  },
  es: {
    regions: "regiones",
    countries: "paises",
    ethnicities: "etnias",
    families: "familias",
    peoples: "pueblos",
  },
  pt: {
    regions: "regioes",
    countries: "paises",
    ethnicities: "etnias",
    families: "familias",
    peoples: "povos",
  },
};

// Mapping inverse : slug -> pageType
const SLUG_TO_PAGE: Record<string, PageType> = {
  regions: "regions",
  regiones: "regions",
  regioes: "regions",
  countries: "countries",
  pays: "countries",
  paises: "countries",
  ethnicities: "ethnicities",
  ethnies: "ethnicities",
  etnias: "ethnicities",
  families: "families",
  familles: "families",
  familias: "families",
  peoples: "peoples",
  peuples: "peoples",
  pueblos: "peoples",
  povos: "peoples",
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
  if (["en", "fr", "es", "pt"].includes(lang)) {
    return lang as Language;
  }

  // Fallback pour les anciennes routes (sans préfixe de langue)
  if (
    pathname.startsWith("/regiones") ||
    pathname.startsWith("/paises") ||
    pathname.startsWith("/etnias")
  ) {
    if (pathname.startsWith("/regiones")) return "es";
    if (pathname.startsWith("/regioes")) return "pt";
    return "es";
  }
  if (pathname.startsWith("/regioes")) return "pt";
  if (pathname.startsWith("/pays") || pathname.startsWith("/ethnies"))
    return "fr";
  if (
    pathname.startsWith("/countries") ||
    pathname.startsWith("/ethnicities") ||
    pathname.startsWith("/regions")
  ) {
    return "en";
  }
  return null;
};

export const getSlugFromRoute = (pathname: string): string | null => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return parts[1];
};
