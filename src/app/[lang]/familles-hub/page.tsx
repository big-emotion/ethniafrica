import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { AccessModeHub } from "@/components/hubs/AccessModeHub";
import { getHubModules } from "@/lib/hubs/moduleAvailability";
import { OG_TITLE } from "@/lib/brand";

// @req REQ-114
export const metadata: Metadata = {
  title: `Familles — ${OG_TITLE}`,
  alternates: {
    canonical: "/fr/familles-hub",
  },
};

// @req REQ-114
export default async function FamillesHubPage() {
  const modules = await getHubModules("familles");

  return (
    <PageLayout language="fr">
      <AccessModeHub language="fr" mode="familles" modules={modules} />
    </PageLayout>
  );
}
