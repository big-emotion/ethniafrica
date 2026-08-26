import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { AccessModeHub } from "@/components/hubs/AccessModeHub";
import { getHubModules } from "@/lib/hubs/moduleAvailability";
import { OG_TITLE } from "@/lib/brand";

// @req REQ-114
export const metadata: Metadata = {
  title: `Pays — ${OG_TITLE}`,
  alternates: {
    canonical: "/fr/pays-hub",
  },
};

// @req REQ-114
export default async function PaysHubPage() {
  const modules = await getHubModules("pays");

  return (
    <PageLayout language="fr">
      <AccessModeHub language="fr" mode="pays" modules={modules} />
    </PageLayout>
  );
}
