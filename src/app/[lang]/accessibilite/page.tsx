import { LegalDocument } from "@/components/layout/LegalDocument";
import { PageLayout } from "@/components/layout/PageLayout";
import { getTranslation } from "@/lib/translations";

// @req REQ-090
export default function AccessibilityPage() {
  const { legalPages } = getTranslation("fr");

  return (
    <PageLayout language="fr" hideHeader>
      <LegalDocument document={legalPages.accessibility} />
    </PageLayout>
  );
}
