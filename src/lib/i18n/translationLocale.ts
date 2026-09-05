/**
 * The two locales the bilingual programme publishes, English first.
 *
 * Declared here rather than read from `Language` in src/types/shared.ts
 * because that type still says `"fr"` while the foundation PR widens it on
 * its own branch. When that PR lands, this becomes `export type
 * TranslationLocale = Language` — the union must never be maintained in two
 * places, and this is the one place the i18n modules import it from.
 */
export type TranslationLocale = "en" | "fr";

const PUBLISHED_LOCALES: ReadonlySet<string> = new Set<TranslationLocale>([
  "en",
  "fr",
]);

/** Whether a request value names a locale the atlas publishes. */
// @req REQ-141
export function isTranslationLocale(value: string): value is TranslationLocale {
  return PUBLISHED_LOCALES.has(value);
}
