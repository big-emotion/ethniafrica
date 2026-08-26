import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { AccessModeHub } from "@/components/hubs/AccessModeHub";
import { getHubModules } from "@/lib/hubs/moduleAvailability";
import { getTranslation } from "@/lib/translations";
import { OG_TITLE } from "@/lib/brand";

const strings = getTranslation("fr").hubs.explorer;

// @req REQ-114
export const metadata: Metadata = {
  title: `${strings.title} — ${OG_TITLE}`,
  description: strings.blurb,
  alternates: {
    canonical: "/fr/explorer",
  },
};

// @req REQ-114
export default async function ExplorerHubPage() {
  const modules = await getHubModules("explorer");

  return (
    <PageLayout language="fr">
      <AccessModeHub language="fr" mode="explorer" modules={modules} />
    </PageLayout>
  );
}
