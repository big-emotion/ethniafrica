"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Language } from "@/types/ethnicity";
import { getLanguageFromRoute, getLocalizedRoute, getPageFromRoute, getSlugFromRoute } from "@/lib/routing";

const LANGUAGE_STORAGE_KEY = "ethniafrique-language";

export const useLanguage = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get language from route first
    const routeLang = getLanguageFromRoute(pathname);
    if (routeLang) {
      return routeLang;
    }

    // Try localStorage (for SSR compatibility)
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
    const pageType = getPageFromRoute(currentPage);
    
    if (pageType) {
      // Preserve query params if any
      const searchParams = new URLSearchParams(window.location.search);
      const queryString = searchParams.toString();
      const newRoute = getLocalizedRoute(lang, pageType) + (queryString ? `?${queryString}` : "");
      router.push(newRoute);
    } else if (currentPage === "/" || currentPage === "" || currentPage === `/${language}` || currentPage.match(/^\/(en|fr|es|pt)$/)) {
      // If on homepage, redirect to /{lang}
      router.push(`/${lang}`);
    } else if (currentPage.startsWith("/about")) {
      // If on about page, redirect to /{lang}/about
      router.push(`/${lang}/about`);
    }
  };

  return { language, setLanguage };
};
