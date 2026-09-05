import { isLocale } from "@/lib/locale";
import type { Language } from "@/types/shared";

/**
 * The two locales the bilingual programme publishes, English first.
 *
 * An alias of `Language` rather than a second union: the i18n modules were
 * written while `Language` still said `"fr"`, and the alias is what let them
 * land first. It stays so the translation records keep one import path and
 * the union is never maintained in two places.
 */
export type TranslationLocale = Language;

/**
 * Whether a request value names a locale the atlas publishes. Delegates to
 * the one allow-list in src/lib/locale.ts so the API cannot accept a locale
 * the site does not serve.
 */
// @req REQ-141
export function isTranslationLocale(value: string): value is TranslationLocale {
  return isLocale(value);
}
