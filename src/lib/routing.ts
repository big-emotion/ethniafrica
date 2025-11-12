import { Language } from "@/types/ethnicity";

export type PageType = "regions" | "countries" | "ethnicities";

export const getLocalizedRoute = (
  language: Language,
  page: PageType
): string => {
  const routes = {
    en: {
      regions: "/regions",
      countries: "/countries",
      ethnicities: "/ethnicities",
    },
    fr: {
      regions: "/regions",
      countries: "/pays",
      ethnicities: "/ethnies",
    },
    es: {
      regions: "/regiones",
      countries: "/paises",
      ethnicities: "/etnias",
    },
    pt: {
      regions: "/regioes",
      countries: "/paises",
      ethnicities: "/etnias",
    },
  };
  return routes[language][page];
};

export const getPageFromRoute = (pathname: string): PageType | null => {
  if (
    pathname.startsWith("/regions") ||
    pathname.startsWith("/regiones") ||
    pathname.startsWith("/regioes")
  ) {
    return "regions";
  }
  if (
    pathname.startsWith("/countries") ||
    pathname.startsWith("/pays") ||
    pathname.startsWith("/paises")
  ) {
    return "countries";
  }
  if (
    pathname.startsWith("/ethnicities") ||
    pathname.startsWith("/ethnies") ||
    pathname.startsWith("/etnias")
  ) {
    return "ethnicities";
  }
  return null;
};

export const getLanguageFromRoute = (pathname: string): Language | null => {
  if (
    pathname.startsWith("/regiones") ||
    pathname.startsWith("/paises") ||
    pathname.startsWith("/etnias")
  ) {
    // Could be es or pt, need to check more specifically
    if (pathname.startsWith("/regiones")) return "es";
    if (pathname.startsWith("/regioes")) return "pt";
    // For paises and etnias, both es and pt use same routes, default to es
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
