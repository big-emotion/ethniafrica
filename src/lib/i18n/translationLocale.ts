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
