/**
 * Turning an AFRIK language code into something `lang` may legally carry.
 *
 * The corpus records ISO 639-3 — 744 distinct codes across the peoples, every
 * one of them three letters. BCP 47 asks for the shortest code a language has,
 * so `yor` must reach the page as `yo`, `kon` as `kg`, `ful` as `ff`. A code
 * with no two-letter equivalent — `bfa`, `zgh`, `tmh`, most of the corpus —
 * stays exactly as the corpus wrote it.
 *
 * This is not cosmetic. `lang` is what tells a screen reader to switch voice
 * for an autonym, and a tag it cannot resolve leaves the name read in French.
 * axe-core enforces it as a serious `valid-lang` violation, and it enforces it
 * on precisely this rule: it rejects a three-letter code when a two-letter one
 * exists, and accepts it when none does.
 *
 * The canonicalisation is CLDR's, via `Intl` — the same table browsers and
 * screen readers resolve tags with. A hand-written map of the 184 codes that
 * have a 639-1 form would be one more thing to keep correct, and wrong in a
 * way nothing would catch until a reader met it.
 */

/**
 * The canonical BCP 47 tag for an AFRIK language code, or `undefined` when the
 * corpus has no code or the code is not a well-formed tag.
 *
 * Returning `undefined` rather than the raw value is deliberate: an absent
 * `lang` inherits the page's, which is merely imprecise, while an invalid one
 * is a violation and can leave assistive technology guessing.
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

export type LocaleTag = "en-GB" | "fr-FR";

// @req REQ-140
export function localeTag(language: Language): LocaleTag {
  return language === "en" ? "en-GB" : "fr-FR";
}

const numberFormatters = new Map<string, Intl.NumberFormat>();

// @req REQ-140
export function formatNumber(
  language: Language,
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  const key = `${language}:${JSON.stringify(options ?? {})}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(localeTag(language), options);
    numberFormatters.set(key, formatter);
  }
  return formatter.format(value);
}

const regionNames = new Map<Language, Intl.DisplayNames | null>();

function regionNamesFor(language: Language): Intl.DisplayNames | null {
  if (regionNames.has(language)) return regionNames.get(language) ?? null;

  let names: Intl.DisplayNames | null = null;
  if (typeof Intl.DisplayNames === "function") {
    try {
      names = new Intl.DisplayNames([localeTag(language)], { type: "region" });
    } catch {
      names = null;
    }
  }
  regionNames.set(language, names);
  return names;
}

// @req REQ-140
export function displayCountryName(
  language: Language,
  isoAlpha2: string
): string | undefined {
  const code = isoAlpha2.trim();
  const names = regionNamesFor(language);
  if (!code || !names) return undefined;

  try {
    return names.of(code) || undefined;
  } catch {
    return undefined;
  }
}
import type { Language } from "@/types/shared";
