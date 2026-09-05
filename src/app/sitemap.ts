import type { MetadataRoute } from "next";

import { CANONICAL_DOMAIN } from "@/lib/brand";
import {
  getCountryRoute,
  getFamilyRoute,
  getLanguageRoute,
  getPatronymeRoute,
  getPeopleLinksRoute,
  getPeopleRoute,
} from "@/lib/routing";
import { getSiteTreePaths } from "@/lib/siteTree";
import { getSitemapEntityIds } from "@/lib/supabase/queries/afrik/sitemapEntries";

/**
 * `sitemap.xml`.
 *
 * Two things about this file that are not obvious:
 *
 * The base URL comes from `CANONICAL_DOMAIN`, never from the root layout's
 * `metadataBase` — that one falls back to `localhost:3000`, which in a sitemap
 * would publish 890 unreachable URLs.
 *
 * And this is a Next special file, not a route segment: it sits outside the
 * root layout's tree, so the `await connection()` that makes every page
 * request-time does not reach it, and it escapes the `generateStaticParams`
 * ban in `src/app/__tests__/staticParamsBan.test.ts` — that regex matches
 * `page|layout|route.tsx` only.
 */

const LANGUAGE = "fr";
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

// @req REQ-110
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { peoples, countries, families, languages, patronymes } =
    await getSitemapEntityIds();

  const rubrics = getSiteTreePaths(LANGUAGE).map((path) =>
    entry(path, RUBRIC_CHANGE_FREQUENCY, path === `/${LANGUAGE}` ? 1 : 0.8)
  );

  const fiches = [
    ...families.map((id) => getFamilyRoute(LANGUAGE, id)),
    ...peoples.flatMap((id) => [
      getPeopleRoute(LANGUAGE, id),
      getPeopleLinksRoute(LANGUAGE, id),
    ]),
    ...countries.map((id) => getCountryRoute(LANGUAGE, id)),
    ...languages.map((id) => getLanguageRoute(LANGUAGE, id)),
    ...patronymes.map((id) => getPatronymeRoute(LANGUAGE, id)),
  ].map((path) => entry(path, FICHE_CHANGE_FREQUENCY, 0.6));

  return [...rubrics, ...fiches];
}
