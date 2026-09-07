"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Language } from "@/types/shared";
import { useLocalePublicationMode } from "@/components/layout/LocalePublicationProvider";
import { getLanguageFromRoute, translatePath } from "@/lib/routing";
import {
  LOCALE_COOKIE,
  getDefaultLocale,
  isPublishedLocale,
  localeCookieAttributes,
  resolveLocale,
} from "@/lib/locale";

/**
 * The locale of the page a client component is rendered on, and only that.
 *
 * For the components that format a figure or a date deep inside a fiche —
 * the confidence chip, the source sheet — where threading the locale through
 * every caller would move dozens of files for one argument. It reads the
 * route rather than the cookie, because the route is what the server
 * rendered in: a component that formatted in the remembered locale on a page
 * served in the other would hydrate with a mismatch. Outside the App Router
 * (a story, a test that mocked no route) `usePathname` answers null, and the
 * default locale is the honest answer there (REQ-140).
 *
 * No router and no state, unlike `useLanguage` below: `useRouter` throws
 * outside the App Router, and a formatter needs no way to navigate.
 */
// @req REQ-140
export const useRouteLanguage = (): Language =>
  getLanguageFromRoute(usePathname() ?? "") ?? getDefaultLocale();

/**
 * The remembered choice, read the way the middleware reads it — off the
 * cookie, never localStorage. A choice that does not travel with the request
 * is one the server cannot honour on the root (REQ-140).
 */
const rememberedLocale = (): string | undefined => {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
};

// `localeCookieAttributes()` is shared with the middleware, which hands it to
// `response.cookies.set`; the browser has only the string form.
const rememberLocale = (locale: Language) => {
  const { path, sameSite, maxAge, secure } = localeCookieAttributes();
  document.cookie = [
    `${LOCALE_COOKIE}=${locale}`,
    `path=${path}`,
    `SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`,
    `max-age=${maxAge}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ");
};

// @req REQ-091
export const useLanguage = () => {
  const publicationMode = useLocalePublicationMode();
  const pathname = usePathname();
  const router = useRouter();
  const candidateRouteLanguage = getLanguageFromRoute(pathname);
  const routeLanguage = isPublishedLocale(
    candidateRouteLanguage,
    publicationMode
  )
    ? candidateRouteLanguage
    : null;
  const [language, setLanguageState] = useState<Language>(
    () => routeLanguage ?? resolveLocale(rememberedLocale(), publicationMode)
  );

  useEffect(() => {
    if (routeLanguage && routeLanguage !== language) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguageState(routeLanguage);
    }
  }, [routeLanguage, language]);

  const setLanguage = (lang: Language) => {
    if (!isPublishedLocale(lang, publicationMode)) return;
    setLanguageState(lang);
    rememberLocale(lang);

    // The same page in the other locale, query kept; a page outside the
    // locale tree has no counterpart, so the switch lands on the home.
    const destination = routeLanguage
      ? `${translatePath(routeLanguage, lang, pathname)}${window.location.search}`
      : `/${lang}`;
    router.push(destination);
  };

  return { language, setLanguage };
};
