import type { MetadataRoute } from "next";

import { CANONICAL_DOMAIN } from "@/lib/brand";
import { getPublishedLocales } from "@/lib/locale";
import {
  getCountryRoute,
  getFamilyRoute,
  getLanguageRoute,
  getPatronymeRoute,
  getPeopleLinksRoute,
  getPeopleRoute,
} from "@/lib/routing";
import type { FicheKind } from "@/lib/seo/ficheCanonical";
import {
  surfaceForPath,
  surfaceIndexedLocales,
} from "@/lib/seo/localeIndexing";
import { ficheIdsWithTranslation } from "@/lib/seo/translationParity";
import { getSiteTreePaths } from "@/lib/siteTree";
import { getSitemapEntityIds } from "@/lib/supabase/queries/afrik/sitemapEntries";
import type { Language } from "@/types/shared";

/**
 * `sitemap.xml`.
 *
 * Three things about this file that are not obvious:
 *
 * The base URL comes from `CANONICAL_DOMAIN`, never from the root layout's
 * `metadataBase` — that one falls back to `localhost:3000`, which in a sitemap
 * would publish 890 unreachable URLs.
 *
 * It lists a URL under a locale only when the page is indexed there
 * (REQ-141): a rubric when its surface is at parity, a fiche when a
 * translation record exists for it. The English half therefore holds only
 * parity-ready rubrics and fiches backed by ETNI-1826 translation records —
 * a sitemap that listed a `noindex` page would contradict the page.
 *
 * And this is a Next special file, not a route segment: it sits outside the
 * root layout's tree, so the `await connection()` that makes every page
 * request-time does not reach it, and it escapes the `generateStaticParams`
 * ban in `src/app/__tests__/staticParamsBan.test.ts` — that regex matches
 * `page|layout|route.tsx` only.
 */

const BASE_URL = `https://${CANONICAL_DOMAIN}`;

// The emitted name set follows source tiers stored in the corpus projection.
// Revalidate between releases so a corpus reload can add or remove a name
// without waiting for the next production build.
// @req REQ-147
export const revalidate = 3600;

/** Rubrics move when the site is restructured; fiches move when re-sourced. */
const RUBRIC_CHANGE_FREQUENCY = "monthly" as const;
const FICHE_CHANGE_FREQUENCY = "weekly" as const;

function entry(
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number
): MetadataRoute.Sitemap[number] {
  return { url: `${BASE_URL}${path}`, changeFrequency, priority };
}

/** The rubric paths of a locale the locale's index is invited to. */
function indexedRubrics(locale: Language): string[] {
  return getSiteTreePaths(locale).filter((path) => {
    const surface = surfaceForPath(locale, path);
    return surface !== null && surfaceIndexedLocales(surface).includes(locale);
  });
}

/** The identifiers of one fiche kind that are indexed in a locale. */
async function indexedIds(
  kind: FicheKind,
  ids: string[],
  locale: Language
): Promise<string[]> {
  try {
    return await ficheIdsWithTranslation(kind, ids, locale);
  } catch {
    // A parity read may withhold translated URLs, never the authored corpus.
    return locale === "fr" ? ids : [];
  }
}

async function fichePaths(
  locale: Language,
  corpus: Awaited<ReturnType<typeof getSitemapEntityIds>>
): Promise<string[]> {
  const [families, peoples, countries, languages, patronymes] =
    await Promise.all([
      indexedIds("family", corpus.families, locale),
      indexedIds("people", corpus.peoples, locale),
      indexedIds("country", corpus.countries, locale),
      indexedIds("language", corpus.languages, locale),
      indexedIds("name", corpus.patronymes, locale),
    ]);

  return [
    ...families.map((id) => getFamilyRoute(locale, id)),
    ...peoples.flatMap((id) => [
      getPeopleRoute(locale, id),
      getPeopleLinksRoute(locale, id),
    ]),
    ...countries.map((id) => getCountryRoute(locale, id)),
    ...languages.map((id) => getLanguageRoute(locale, id)),
    ...patronymes.map((id) => getPatronymeRoute(locale, id)),
  ];
}

// @req REQ-110
// @req REQ-141
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const corpus = await getSitemapEntityIds();

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of getPublishedLocales()) {
    for (const path of indexedRubrics(locale)) {
      entries.push(
        entry(path, RUBRIC_CHANGE_FREQUENCY, path === `/${locale}` ? 1 : 0.8)
      );
    }
    for (const path of await fichePaths(locale, corpus)) {
      entries.push(entry(path, FICHE_CHANGE_FREQUENCY, 0.6));
    }
  }
  return entries;
}
