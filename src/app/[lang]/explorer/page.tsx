import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { AccessModeHub } from "@/components/hubs/AccessModeHub";
import { ExplorerContinent } from "@/components/hubs/ExplorerContinent";
import { getHubModules } from "@/lib/hubs/moduleAvailability";
import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";
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
  const [modules, counts] = await Promise.all([
    getHubModules("explorer"),
    getContinentPeopleCounts().catch(() => undefined),
  ]);

  return (
    <PageLayout language="fr">
      <AccessModeHub language="fr" mode="explorer" modules={modules}>
        <ExplorerContinent
          peopleCountsByCountry={counts}
          missingMessage="Le corpus ne renseigne encore aucun peuple par pays."
        />
      </AccessModeHub>
    </PageLayout>
  );
}
