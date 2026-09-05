import type { FicheKind } from "@/lib/seo/ficheCanonical";
import type { Language } from "@/types/shared";

/**
 * The locale the corpus is written in. A fiche always exists in it; every
 * other locale needs a translation record before the fiche counts as
 * existing there.
 */
// @req REQ-141
export const CORPUS_LOCALE: Language = "fr";

/**
 * Whether a fiche has a translation in a locale.
 *
 * A seam rather than a service: there is no table to read yet. ETNI-1826
 * lands the translation records (`afrik_translations`, keyed by entity kind,
 * entity id and locale) and is the PR that replaces the body below with the
 * read — signature unchanged, so the fiche routes, the sitemap and the
 * hreflang clusters follow without being touched. Until then the honest
 * answer is that a fiche exists only in the locale the corpus is written in,
 * which keeps every `/en` fiche `noindex` and out of the English sitemap.
 */
// @req REQ-141
export async function ficheHasTranslation(
  _kind: FicheKind,
  _id: string,
  lang: Language
): Promise<boolean> {
  return lang === CORPUS_LOCALE;
}
