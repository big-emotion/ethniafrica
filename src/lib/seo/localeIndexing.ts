import type { Metadata } from "next";

import { LOCALES } from "@/lib/locale";
import {
  STATIC_PAGE_SLUGS,
  getLocalizedRoute,
  getPageFromRoute,
  getStaticPageRoute,
  type PageType,
  type StaticPageKey,
} from "@/lib/routing";
import type { FicheKind } from "@/lib/seo/ficheCanonical";
import {
  CORPUS_LOCALE,
  ficheHasTranslation,
} from "@/lib/seo/translationParity";
import type { Language } from "@/types/shared";

/**
 * Indexing before parity.
 *
 * Every public surface resolves in both locales (REQ-140), but resolving is
 * not the same as being ready for a search index: an English address that
 * serves French prose under an English header is a page a crawler should
 * read and a page it should not offer as the English answer. So a surface is
 * indexed in a locale only once it is *at parity* there — its chrome and its
 * content both read in that locale — and until then it declares `noindex`,
 * is left out of that locale's sitemap and is dropped from the other
 * locale's hreflang cluster. The reader still gets the page; only the index
 * waits.
 *
 * Two kinds of surface, two rules. A rubric page is at parity by membership
 * in `SURFACES_AT_PARITY`, lifted by hand as each translation wave lands. A
 * fiche is at parity when a translation record exists for the entity, read
 * through `ficheHasTranslation`. Doctrine: `docs/editorial/locale-indexing.md`.
 */

/**
 * The pages the indexing rule addresses. A page type or a static page key
 * from the slug tables, plus the two surfaces the tables do not name: the
 * home, and the games below the games hub (the hub itself is a retired
 * landing page, never indexed).
 */
// @req REQ-141
export type IndexedSurface = PageType | StaticPageKey | "home" | "games";

/**
 * The surfaces whose chrome and content read in every published locale.
 *
 * Measured, not aspirational, the way `SOFT_CHECK_NAMES` is in
 * validateAfrikData.ts: a surface enters this list when its page copy comes
 * from the locale dictionary (`src/lib/translations.ts`) and what it lists
 * needs no translating, and the wave that translates a surface is the commit
 * that adds it here. Measured on 2026-09-05 against the foundation branch:
 *
 *   · `names` — the ethnonym index. Its copy is `translations.names`, the
 *     nomenclature component reads the dictionary, and its rows are the
 *     names peoples are called by, which are proper nouns in either locale.
 *
 * Everything else still carries French prose under `/en`: the home hero and
 * its facts, the facets' ledes and filter labels, the search results, the
 * legal pages (machine-translated with a French-prevails notice, ETNI-1830),
 * the doctrine, the dossiers, the glossary, the reports, the quiz tracks. A
 * dictionary existing for a page is not parity while its body is French.
 */
// @req REQ-141
export const SURFACES_AT_PARITY: readonly IndexedSurface[] = ["names"];

// @req REQ-141
export const surfaceIndexedLocales = (surface: IndexedSurface): Language[] =>
  SURFACES_AT_PARITY.includes(surface) ? [...LOCALES] : [CORPUS_LOCALE];

/**
 * The locales a fiche is indexed in: the corpus locale, plus each locale a
 * translation record exists for. A read that fails costs the locale it was
 * asked about, never the French fiche.
 */
// @req REQ-141
export async function ficheIndexedLocales(
  kind: FicheKind,
  id: string
): Promise<Language[]> {
  const verdicts = await Promise.all(
    LOCALES.map((locale) =>
      ficheHasTranslation(kind, id, locale).catch(
        () => locale === CORPUS_LOCALE
      )
    )
  );
  return LOCALES.filter((_, index) => verdicts[index]);
}

/**
 * The robots directive a page owes the locale it was served in: nothing
 * while indexed, so the root layout's default stands; `noindex, follow`
 * otherwise — the links still point at indexable pages and should keep
 * carrying the signal they earn.
 */
// @req REQ-141
export const robotsForLocale = (
  current: Language,
  indexedLocales: readonly Language[]
): Metadata["robots"] =>
  indexedLocales.includes(current) ? undefined : { index: false, follow: true };

const STATIC_PAGE_KEYS = Object.keys(STATIC_PAGE_SLUGS.fr) as StaticPageKey[];

/**
 * The surface a rubric path addresses, or null when the path is outside the
 * locale's vocabulary. This is how the sitemap decides whether a path is
 * indexed in the locale it is about to list it under.
 */
// @req REQ-141
export function surfaceForPath(
  locale: Language,
  path: string
): IndexedSurface | null {
  if (path === `/${locale}`) return "home";

  const page = getPageFromRoute(path);
  if (page) {
    // Only the hub itself is `jeuxHub`; anything below it is a game.
    return page === "jeuxHub" && path !== getLocalizedRoute(locale, "jeuxHub")
      ? "games"
      : page;
  }

  return (
    STATIC_PAGE_KEYS.find((key) => getStaticPageRoute(locale, key) === path) ??
    null
  );
}
