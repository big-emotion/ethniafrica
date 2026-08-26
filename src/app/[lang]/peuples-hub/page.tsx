import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { AccessModeHub } from "@/components/hubs/AccessModeHub";
import { getHubModules } from "@/lib/hubs/moduleAvailability";
import { OG_TITLE } from "@/lib/brand";

// @req REQ-114
export const metadata: Metadata = {
  title: `Peuples — ${OG_TITLE}`,
  alternates: {
    canonical: "/fr/peuples-hub",
  },
};

// @req REQ-114
export default async function PeuplesHubPage() {
  const modules = await getHubModules("peuples");

  return (
    <PageLayout language="fr">
      <AccessModeHub language="fr" mode="peuples" modules={modules} />
    </PageLayout>
  );
}
