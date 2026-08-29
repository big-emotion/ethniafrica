import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { AccessModeHub } from "@/components/hubs/AccessModeHub";
import { ExplorerContinent } from "@/components/hubs/ExplorerContinent";
import { getHubModules } from "@/lib/hubs/moduleAvailability";
import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";
import { getCountryIndex } from "@/api/v2/services/countryService";
import { getTranslation } from "@/lib/translations";
import { OG_TITLE } from "@/lib/brand";
import { getLocalizedRoute } from "@/lib/routing";

const strings = getTranslation("fr").hubs.explorer;

// @req REQ-114
export const metadata: Metadata = {
  title: `${strings.title} — ${OG_TITLE}`,
  description: strings.blurb,
  alternates: {
    canonical: getLocalizedRoute("fr", "explorerHub"),
  },
};

// @req REQ-114
export default async function ExplorerHubPage() {
  // The four module links are rendered server-side and unconditionally, so
  // the scene is never the only way into the corpus — a failed count costs
  // the map, not the page.
  // The country index is the scene's *choosable* set, which is wider than its
  // drawn one: the field marks the twelve best-documented countries and the
  // stage answers for all fifty-four. A failed index costs the forty-two, not
  // the map.
  const [modules, counts, countries] = await Promise.all([
    getHubModules("explorer"),
    getContinentPeopleCounts().catch(() => undefined),
    getCountryIndex().catch(() => []),
  ]);

  return (
    <PageLayout language="fr" title={strings.pageTitle}>
      <AccessModeHub language="fr" mode="explorer" modules={modules}>
        <ExplorerContinent
          peopleCountsByCountry={counts}
          countryIds={countries.map((country) => country.id)}
          missingMessage="Le corpus ne renseigne encore aucun peuple par pays."
        />
      </AccessModeHub>
    </PageLayout>
  );
}
