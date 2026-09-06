import type { Language } from "@/types/shared";

/**
 * The locales the codebase supports. Publication is a separate deployment
 * decision: unfinished English can remain testable without becoming public.
 *
 * `Language` in `src/types/shared.ts` is derived from this tuple, so a third
 * locale is one entry here and the compiler then walks every
 * `Record<Language, …>` — the slug tables, the UI dictionary — that has to
 * follow. Keep this tuple stable while `SITE_LOCALE_MODE` controls exposure.
 */
// @req REQ-140
export const LOCALES = ["en", "fr"] as const;

// @req REQ-140
export const FALLBACK_LOCALE: Language = "fr";

/**
 * One explicit state instead of two booleans that could disagree. Missing or
 * invalid configuration always fails closed to the current French product.
 */
// @req REQ-140
export const LOCALE_MODES = [
  "fr-only",
  "bilingual-fr-default",
  "bilingual-en-default",
] as const;

export type LocalePublicationMode = (typeof LOCALE_MODES)[number];

const isLocalePublicationMode = (
  value: unknown
): value is LocalePublicationMode =>
  typeof value === "string" &&
  (LOCALE_MODES as readonly string[]).includes(value);

// @req REQ-140
export const getLocalePublicationMode = (): LocalePublicationMode => {
  const configured = process.env.SITE_LOCALE_MODE;
  return isLocalePublicationMode(configured) ? configured : "fr-only";
};

// @req REQ-140
export const getPublishedLocales = (
  mode: LocalePublicationMode = getLocalePublicationMode()
): readonly Language[] => (mode === "fr-only" ? ["fr"] : LOCALES);

// @req REQ-140
export const getDefaultLocale = (
  mode: LocalePublicationMode = getLocalePublicationMode()
): Language => (mode === "bilingual-en-default" ? "en" : "fr");

/**
 * Where an explicit language choice is remembered.
 *
 * A cookie rather than localStorage, because the middleware resolves the
 * root before any client code runs and can only read what travels with the
 * request. Named after `ethni-consent` (src/lib/consent.ts). Set only by the
 * switcher: landing on `/fr` is not a choice, clicking « Français » is.
 */
// @req REQ-140
export const LOCALE_COOKIE = "ethni-locale";

/**
 * The request header the middleware sets with the resolved locale, so the
 * root layout — which sits above the `[lang]` segment and cannot read its
 * params — can still declare the right `<html lang>`.
 */
// @req REQ-140
export const LOCALE_HEADER = "x-locale";

// @req REQ-140
export const isLocale = (value: unknown): value is Language =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

// @req REQ-140
export const isPublishedLocale = (
  value: unknown,
  mode: LocalePublicationMode = getLocalePublicationMode()
): value is Language =>
  isLocale(value) && getPublishedLocales(mode).includes(value);

/**
 * The locale a cookie value stands for, or the default when it stands for
 * none. A stale or tampered cookie is not a choice.
 */
// @req REQ-140
export const resolveLocale = (
  cookieValue: string | undefined,
  mode: LocalePublicationMode = getLocalePublicationMode()
): Language =>
  isPublishedLocale(cookieValue, mode) ? cookieValue : getDefaultLocale(mode);

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * The attributes both writers of the cookie agree on — the switcher through
 * `document.cookie`, the middleware through `response.cookies.set`.
 *
 * Not HttpOnly: the switcher writes it from the browser. Secure only in
 * production, or a local `http://localhost` could never set it. Read at call
 * time rather than at import so a test can flip the environment.
 */
// @req REQ-140
export const localeCookieAttributes = () => ({
  path: "/",
  sameSite: "lax" as const,
  maxAge: ONE_YEAR_IN_SECONDS,
  secure: process.env.NODE_ENV === "production",
});
