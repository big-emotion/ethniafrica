"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Language } from "@/types/ethnicity";
import { getLanguageFromRoute, getLocalizedRoute } from "@/lib/routing";

const LANGUAGE_STORAGE_KEY = "ethniafrique-language";

export const useLanguage = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [language, setLanguageState] = useState<Language>(() => {
    // Try localStorage first (for SSR compatibility)
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(
        LANGUAGE_STORAGE_KEY
      ) as Language | null;
      if (stored && ["en", "fr", "es", "pt"].includes(stored)) {
        return stored;
      }
    }

    // Default to English
    return "en";
  });

  useEffect(() => {
    // Try to get language from route and update if different
    const routeLang = getLanguageFromRoute(pathname);
    if (routeLang && routeLang !== language) {
      setLanguageState(routeLang);
    }
  }, [pathname, language]);

  useEffect(() => {
    // Save to localStorage when language changes
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);

    // Update route if we're on a localized page
    const currentPage = pathname;
    if (
      currentPage.startsWith("/regions") ||
      currentPage.startsWith("/regiones") ||
      currentPage.startsWith("/regioes") ||
      currentPage.startsWith("/countries") ||
      currentPage.startsWith("/pays") ||
      currentPage.startsWith("/paises") ||
      currentPage.startsWith("/ethnicities") ||
      currentPage.startsWith("/ethnies") ||
      currentPage.startsWith("/etnias")
    ) {
      // Determine which page we're on
      let pageType: "regions" | "countries" | "ethnicities" | null = null;
      if (
        currentPage.startsWith("/regions") ||
        currentPage.startsWith("/regiones") ||
        currentPage.startsWith("/regioes")
      ) {
        pageType = "regions";
      } else if (
        currentPage.startsWith("/countries") ||
        currentPage.startsWith("/pays") ||
        currentPage.startsWith("/paises")
      ) {
        pageType = "countries";
      } else if (
        currentPage.startsWith("/ethnicities") ||
        currentPage.startsWith("/ethnies") ||
        currentPage.startsWith("/etnias")
      ) {
        pageType = "ethnicities";
      }

      if (pageType) {
        const newRoute = getLocalizedRoute(lang, pageType);
        router.push(newRoute);
      }
    }
  };

  return { language, setLanguage };
};
