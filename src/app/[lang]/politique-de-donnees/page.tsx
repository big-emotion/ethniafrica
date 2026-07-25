import { LegalDocument } from "@/components/layout/LegalDocument";
import { PageLayout } from "@/components/layout/PageLayout";
import { getTranslation } from "@/lib/translations";

// @req REQ-088
export default function DataPolicyPage() {
  const { legalPages } = getTranslation("fr");

  return (
    <PageLayout language="fr" hideHeader>
      <LegalDocument document={legalPages.dataPolicy} />
    </PageLayout>
  );
}
