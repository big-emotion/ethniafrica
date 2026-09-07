import type { Language } from "@/types/shared";

/**
 * The canonical BCP 47 tag for an AFRIK language code, or `undefined` when the
 * corpus has no code or the code is not a well-formed tag.
 *
 * The canonicalisation is CLDR's, via `Intl`: a language with a two-letter
 * form is shortened (`yor` to `yo`), while codes without one stay unchanged.
 */
// @req REQ-115
export function bcp47LanguageTag(code?: string | null): string | undefined {
  const trimmed = code?.trim();
  if (!trimmed) return undefined;

  try {
    return Intl.getCanonicalLocales(trimmed)[0];
  } catch {
    return undefined;
  }
}

/** British English is the product convention for the English locale. */
export type LocaleTag = "en-GB" | "fr-FR";

// @req REQ-140
export const localeTag = (lang: Language): LocaleTag =>
  lang === "fr" ? "fr-FR" : "en-GB";

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

// @req REQ-140
export function formatNumber(
  lang: Language,
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  const key = `${lang}:${JSON.stringify(options ?? {})}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(localeTag(lang), options);
    numberFormatters.set(key, formatter);
  }
  return formatter.format(value);
}

const LONG_DATE: Intl.DateTimeFormatOptions = { dateStyle: "long" };

// @req REQ-140
export function formatDate(
  lang: Language,
  date: Date,
  options: Intl.DateTimeFormatOptions = LONG_DATE
): string {
  const key = `${lang}:${JSON.stringify(options)}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(localeTag(lang), options);
    dateFormatters.set(key, formatter);
  }
  return formatter.format(date);
}

const regionNames = new Map<Language, Intl.DisplayNames | null>();

function regionNamesFor(lang: Language): Intl.DisplayNames | null {
  if (regionNames.has(lang)) return regionNames.get(lang) ?? null;
  let names: Intl.DisplayNames | null = null;
  if (typeof Intl.DisplayNames === "function") {
    try {
      names = new Intl.DisplayNames([localeTag(lang)], { type: "region" });
    } catch {
      names = null;
    }
  }
  regionNames.set(lang, names);
  return names;
}

/** A country's common name in the locale, from its ISO alpha-2 code. */
// @req REQ-140
export function displayCountryName(
  lang: Language,
  isoAlpha2: string
): string | undefined {
  const code = isoAlpha2.trim();
  const names = regionNamesFor(lang);
  if (!code || !names) return undefined;
  try {
    return names.of(code) || undefined;
  } catch {
    return undefined;
  }
}
