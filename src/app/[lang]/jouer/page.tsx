import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { AccessModeHub } from "@/components/hubs/AccessModeHub";
import { JouerProjectionContrast } from "@/components/hubs/JouerProjectionContrast";
import { getHubModules } from "@/lib/hubs/moduleAvailability";
import { getTranslation } from "@/lib/translations";
import { OG_TITLE } from "@/lib/brand";
import { getLocalizedRoute } from "@/lib/routing";

const strings = getTranslation("fr").hubs.jouer;

// @req REQ-114
export const metadata: Metadata = {
  title: `${strings.title} — ${OG_TITLE}`,
  description: strings.blurb,
  alternates: {
    canonical: getLocalizedRoute("fr", "jouerHub"),
  },
};

// @req REQ-114
export default async function JouerHubPage() {
  const modules = await getHubModules("jouer");

  return (
    <PageLayout language="fr" title={strings.pageTitle}>
      <AccessModeHub language="fr" mode="jouer" modules={modules}>
        <JouerProjectionContrast modules={modules} />
      </AccessModeHub>
    </PageLayout>
  );
}
