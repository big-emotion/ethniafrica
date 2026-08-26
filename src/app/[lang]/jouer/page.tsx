import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { AccessModeHub } from "@/components/hubs/AccessModeHub";
import { JouerFaceOff } from "@/components/hubs/JouerFaceOff";
import { getHubModules } from "@/lib/hubs/moduleAvailability";
import { getTranslation } from "@/lib/translations";
import { OG_TITLE } from "@/lib/brand";

const strings = getTranslation("fr").hubs.jouer;

// @req REQ-114
export const metadata: Metadata = {
  title: `${strings.title} — ${OG_TITLE}`,
  description: strings.blurb,
  alternates: {
    canonical: "/fr/jouer",
  },
};

// @req REQ-114
export default async function JouerHubPage() {
  const modules = await getHubModules("jouer");

  return (
    <PageLayout language="fr">
      <AccessModeHub language="fr" mode="jouer" modules={modules}>
        <JouerFaceOff modules={modules} />
      </AccessModeHub>
    </PageLayout>
  );
}
