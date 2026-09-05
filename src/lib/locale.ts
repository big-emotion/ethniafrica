import type { Language } from "@/types/shared";

/**
 * The locales the site publishes, and the one it answers in by default.
 *
 * `Language` in `src/types/shared.ts` is derived from this tuple, so a third
 * locale is one entry here and the compiler then walks every
 * `Record<Language, …>` — the slug tables, the UI dictionary — that has to
 * follow. English sits first because it is the default (REQ-140, DEC-046).
 */
// @req REQ-140
export const LOCALES = ["en", "fr"] as const;

// @req REQ-140
export const DEFAULT_LOCALE: Language = "en";

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

/**
 * The locale a cookie value stands for, or the default when it stands for
 * none. A stale or tampered cookie is not a choice.
 */
// @req REQ-140
export const resolveLocale = (cookieValue: string | undefined): Language =>
  isLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;

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
