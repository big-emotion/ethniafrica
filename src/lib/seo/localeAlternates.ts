import type { Metadata } from "next";

import { CANONICAL_DOMAIN, OG_DESCRIPTION, OG_TITLE } from "@/lib/brand";
import { DEFAULT_LOCALE, LOCALES, isLocale } from "@/lib/locale";
import {
  robotsForLocale,
  surfaceIndexedLocales,
  type IndexedSurface,
} from "@/lib/seo/localeIndexing";
import type { Language } from "@/types/shared";

/**
 * The hreflang cluster of a public page (REQ-141).
 *
 * Three decisions live here so that no route file answers them for itself:
 *
 * **Absolute, on `CANONICAL_DOMAIN`.** The root layout's `metadataBase`
 * falls back to `localhost:3000`, and until this helper every rubric page
 * declared a relative canonical that resolved against it — a production
 * canonical pointing at localhost whenever `NEXT_PUBLIC_SITE_URL` was unset.
 * `ficheCanonical` refused that for the fiches; the rubrics now refuse it too.
 *
 * **`x-default` is the English URL**, as REQ-141 is catalogued: English is
 * the default locale (DEC-046), so a reader whose language matches neither
 * cluster member lands where an unprefixed request lands.
 *
 * **The cluster follows the index, not the file tree.** A locale in which
 * the page declares `noindex` is left out of every locale's cluster, and
 * `x-default` with it when that locale is English: a search engine discards
 * a cluster that points at a page it may not index, and the French page
 * would lose its alternates for the English page's fault. So `pageAlternates`
 * takes the indexed locales as an argument rather than assuming both — the
 * caller reads them off `localeIndexing`.
 */

type PageAlternates = NonNullable<Metadata["alternates"]>;
type PageOpenGraph = NonNullable<Metadata["openGraph"]>;

/** The page copy a social card carries when the page has its own. */
interface OpenGraphCopy {
  title?: string;
  description?: string;
}

const absoluteUrl = (path: string) => `https://${CANONICAL_DOMAIN}${path}`;

// @req REQ-141
export function pageAlternates(
  current: Language,
  buildPath: (lang: Language) => string,
  indexedLocales: readonly Language[]
): PageAlternates {
  const alternates: PageAlternates = {
    canonical: absoluteUrl(buildPath(current)),
  };

  const indexed = LOCALES.filter((locale) => indexedLocales.includes(locale));
  if (indexed.length === 0) return alternates;

  const languages: Record<string, string> = {};
  for (const locale of indexed) {
    languages[locale] = absoluteUrl(buildPath(locale));
  }
  if (indexed.includes(DEFAULT_LOCALE)) {
    languages["x-default"] = languages[DEFAULT_LOCALE];
  }
  alternates.languages = languages;
  return alternates;
}

/** `og:locale` values: British English, the register the product writes in. */
// @req REQ-141
export const OG_LOCALE_BY_LANGUAGE: Record<Language, string> = {
  en: "en_GB",
  fr: "fr_FR",
};

/**
 * The image the root layout's site card uses, named once so a page's own
 * card and the layout's cannot point at two files.
 */
// @req REQ-141
export const SITE_OPEN_GRAPH_IMAGE = "/opengraph-image";

/**
 * The whole Open Graph object, not just `locale`. Next merges metadata
 * shallowly: a page that declared `openGraph: { locale }` alone would
 * replace the root layout's card wholesale and ship with no title, no
 * description and no image. The alternate locales are the cluster's other
 * members, so a card never advertises a version the index does not carry.
 */
// @req REQ-141
export function localeOpenGraph(
  current: Language,
  alternates: PageAlternates,
  copy: OpenGraphCopy = {}
): PageOpenGraph {
  const alternateLocale = Object.keys(alternates.languages ?? {})
    .filter((key): key is Language => isLocale(key) && key !== current)
    .map((locale) => OG_LOCALE_BY_LANGUAGE[locale]);

  return {
    title: copy.title ?? OG_TITLE,
    description: copy.description ?? OG_DESCRIPTION,
    type: "website",
    images: [SITE_OPEN_GRAPH_IMAGE],
    url: String(alternates.canonical),
    locale: OG_LOCALE_BY_LANGUAGE[current],
    alternateLocale,
  };
}

/**
 * Everything a public page's `<head>` owes the locale it was served in —
 * alternates, robots and the social card — composed once, so the three
 * cannot disagree about which address the page is or whether it is indexed.
 */
// @req REQ-141
export function localeHead(
  current: Language,
  buildPath: (lang: Language) => string,
  indexedLocales: readonly Language[],
  copy: OpenGraphCopy = {}
): Pick<Metadata, "alternates" | "robots" | "openGraph"> {
  const alternates = pageAlternates(current, buildPath, indexedLocales);
  const robots = robotsForLocale(current, indexedLocales);
  return {
    alternates,
    ...(robots ? { robots } : {}),
    openGraph: localeOpenGraph(current, alternates, copy),
  };
}

/**
 * `localeHead` for a rubric page, whose indexed locales are a matter of
 * which surface it is (`SURFACES_AT_PARITY`) rather than of a record.
 */
// @req REQ-141
export const surfaceHead = (
  current: Language,
  surface: IndexedSurface,
  buildPath: (lang: Language) => string,
  copy: OpenGraphCopy = {}
) => localeHead(current, buildPath, surfaceIndexedLocales(surface), copy);
