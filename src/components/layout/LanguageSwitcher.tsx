"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { LOCALES, LOCALE_COOKIE, localeCookieAttributes } from "@/lib/locale";
import { getLanguageFromRoute, translatePath } from "@/lib/routing";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/shared";

/**
 * Each locale named in itself. The label is read by the reader who wants
 * that locale, so it is never translated: « Français » is what a French
 * speaker looks for on an English page, whatever the page calls it.
 */
const LOCALE_AUTONYMS: Record<Language, string> = {
  en: "English",
  fr: "Français",
};

// `localeCookieAttributes()` is the options object the middleware hands to
// `response.cookies.set`; the browser has only the string form. The exact
// string is pinned by this component's test and by `useLanguage`'s, so the
// two writers cannot drift apart unnoticed.
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

// The query string is the reader's — a filter, a page, a track — and travels
// with the switch. Read as an external store so the server renders none, the
// client renders the real one, and React reconciles the two without a
// hydration error; `useSearchParams` would do the same but demands a Suspense
// boundary every route would then have to carry.
const subscribeToLocation = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
};
const readSearch = () => window.location.search;
const readServerSearch = () => "";

export interface LanguageSwitcherProps {
  language: Language;
  /**
   * `disc` is the bar's 30px circle holding the locale code, beside the
   * search and the surface toggle; `row` is a full-width tray row naming the
   * locale, for the phone.
   */
  appearance?: "disc" | "row";
  className?: string;
}

/**
 * The other locale, as a link to the same page in it (REQ-140, REQ-141).
 *
 * A real anchor and a full navigation, not `router.push`: the `<html lang>`
 * is set by the root layout, which sits above the `[lang]` segment and does
 * not re-render on a soft navigation, so a client-side switch would leave
 * the document declared in the language it just left. The cookie is written
 * on the click, before the browser follows the link — landing on a locale is
 * not a choice, clicking « Français » is.
 */
// @req REQ-140
export function LanguageSwitcher({
  language,
  appearance = "disc",
  className,
}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const search = useSyncExternalStore(
    subscribeToLocation,
    readSearch,
    readServerSearch
  );
  const routeLanguage = getLanguageFromRoute(pathname);

  return (
    <>
      {LOCALES.filter((locale) => locale !== language).map((locale) => {
        // A page outside the locale tree has no counterpart, so the switch
        // lands on the home — the same rule `useLanguage` applies.
        const href = routeLanguage
          ? `${translatePath(routeLanguage, locale, pathname)}${search}`
          : `/${locale}`;
        const autonym = LOCALE_AUTONYMS[locale];

        return (
          <a
            key={locale}
            href={href}
            hrefLang={locale}
            lang={locale}
            aria-label={autonym}
            onClick={() => rememberLocale(locale)}
            className={cn(
              appearance === "disc"
                ? "sh-icon sh-lang min-h-11"
                : "sh-lang-row min-h-11",
              className
            )}
          >
            {appearance === "disc" ? (
              <span className="sh-icon-circle sh-lang-code" aria-hidden="true">
                {locale.toUpperCase()}
              </span>
            ) : (
              autonym
            )}
          </a>
        );
      })}
    </>
  );
}
