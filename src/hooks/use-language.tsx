"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Language } from "@/types/shared";
import { getLanguageFromRoute, translatePath } from "@/lib/routing";
import {
  LOCALE_COOKIE,
  isLocale,
  localeCookieAttributes,
  resolveLocale,
} from "@/lib/locale";

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
  const pathname = usePathname();
  const router = useRouter();
  const routeLanguage = getLanguageFromRoute(pathname);
  const [language, setLanguageState] = useState<Language>(
    () => routeLanguage ?? resolveLocale(rememberedLocale())
  );

  useEffect(() => {
    if (routeLanguage && routeLanguage !== language) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguageState(routeLanguage);
    }
  }, [routeLanguage, language]);

  const setLanguage = (lang: Language) => {
    if (!isLocale(lang)) return;
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
