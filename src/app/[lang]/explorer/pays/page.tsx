import { permanentRedirect } from "next/navigation";

import { PublishFacetCountryIndex } from "@/components/hubs/facets/FacetCountryIndex";
import type { FacetCountryIndex } from "@/components/hubs/facets/FacetCountryIndex";
import { getCountryIndex } from "@/api/v2/services/countryService";
import { getCountryRoute, resolveCountryDeepLink } from "@/lib/routing";
import type { CountryId } from "@/types/afrik";
import type { Language } from "@/types/shared";

/**
 * The countries facet of the unified Explorer hub.
 *
 * This file exists to take the route out of the `[section]` catch-all. That
 * fall-through was the whole reason the directory could open a country in a
 * detail pane of its own: a second country surface, with no globe and its
 * dossier folded behind a disclosure, reached from the main navigation while
 * the atlas fiche sat one URL away.
 *
 * The globe is no longer this page's. `FacetHubShell` mounts one for all three
 * facets, so that switching to peoples or families repaints the reading and
 * leaves the map standing; this page publishes what the map should say about a
 * country when one is chosen. On this facet that is the country itself, which
 * is why the entry is a single row: the panel's job is to open the fiche, and a
 * hub exists to be left.
 *
 * The redirect below is a net for links already sent — nothing in the app emits
 * the query form any more. It runs on the server, before any render, so it also
 * catches readers arriving from outside and crawlers, which a client-side guard
 * would have served the directory to first.
 */

interface PageParams {
  lang: string;
}

type PageSearchParams = Record<string, string | string[] | undefined>;

// @req REQ-091
export default async function PaysHubPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { lang } = await params;
  const query = (await searchParams) ?? {};

  const fiche = resolveCountryDeepLink(lang as Language, query);
  if (fiche) {
    permanentRedirect(fiche);
  }

  const countries = await getCountryIndex();

  const countryIndex: FacetCountryIndex = Object.fromEntries(
    countries.map((country) => [
      country.id as CountryId,
      [
        {
          id: country.id,
          label: country.nameFr,
          href: getCountryRoute("fr", country.id),
        },
      ],
    ])
  );

  return (
    <>
      <PublishFacetCountryIndex index={countryIndex} />

      <div className="afh-parchment">
        <header className="afh-parchment-head">
          <p className="afh-parchment-eyebrow">
            atlas · les pays d&apos;Afrique
          </p>
          <h1>Les pays d&apos;Afrique</h1>
          <p className="afh-parchment-lede">
            {countries.length} pays au corpus. Choisissez-en un sur le globe
            pour ouvrir sa fiche.
          </p>
        </header>
      </div>
    </>
  );
}
