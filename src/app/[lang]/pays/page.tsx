import { permanentRedirect } from "next/navigation";

import { PageLayout } from "@/components/layout/PageLayout";
import { CountryHubGlobe } from "@/components/hubs/CountryHubGlobe";
import { getCountryIndex } from "@/api/v2/services/countryService";
import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";
import { resolveCountryDeepLink } from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * `/fr/pays` — the way into the countries.
 *
 * This file exists to take the route out of the `[section]` catch-all. That
 * fall-through was the whole reason the directory could open a country in a
 * detail pane of its own: a second country surface, with no globe and its
 * dossier folded behind a disclosure, reached from the main navigation while
 * the atlas fiche sat one URL away.
 *
 * A static segment beats a dynamic one, so putting a page here settles it, and
 * it settles it without editing `[section]`, which still serves the peoples and
 * families directories.
 *
 * What the route renders is a globe now, not an alphabet. The three fiches all
 * open on one; the hub that led to them opened on a grid of cards, which made
 * the countries the one part of the atlas a reader reached without ever seeing
 * where anything was. Choosing a country here goes to its fiche — a hub exists
 * to be left.
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

  // The picker is rendered from the corpus and the counts only shade the map,
  // so a failed count costs the radial field, never the way in.
  const [countries, peopleCounts] = await Promise.all([
    getCountryIndex(),
    getContinentPeopleCounts().catch(() => undefined),
  ]);

  return (
    <PageLayout language="fr" sectionName="Pays" hideHeader flushTop>
      <CountryHubGlobe
        countryIds={countries.map((country) => country.id)}
        peopleCountsByCountry={peopleCounts}
        missingMessage="Le corpus ne renseigne encore aucun peuple par pays."
      />

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
    </PageLayout>
  );
}
