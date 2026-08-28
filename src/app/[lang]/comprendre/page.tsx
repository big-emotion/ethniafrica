import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { AccessModeHub } from "@/components/hubs/AccessModeHub";
import { ComprendreQuestionSpine } from "@/components/hubs/ComprendreQuestionSpine";
import { getHubModules } from "@/lib/hubs/moduleAvailability";
import { getTranslation } from "@/lib/translations";
import { OG_TITLE } from "@/lib/brand";

const strings = getTranslation("fr").hubs.comprendre;

// @req REQ-114
export const metadata: Metadata = {
  title: `${strings.title} — ${OG_TITLE}`,
  description: strings.blurb,
  alternates: {
    canonical: "/fr/comprendre",
  },
};

// @req REQ-114
export default async function ComprendreHubPage() {
  const modules = await getHubModules("comprendre");

  return (
    <PageLayout language="fr">
      <AccessModeHub language="fr" mode="comprendre" modules={modules}>
        {/* Same resolved modules the rows read: the spine used to link its
            three stops unconditionally and contradict them (charter §3). */}
        <ComprendreQuestionSpine language="fr" modules={modules} />
      </AccessModeHub>
    </PageLayout>
  );
}
