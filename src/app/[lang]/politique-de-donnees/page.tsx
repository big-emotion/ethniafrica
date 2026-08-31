import { LegalDocument } from "@/components/layout/LegalDocument";
import { PageLayout } from "@/components/layout/PageLayout";
import { legalPages } from "@/lib/legal-pages";

// @req REQ-088
export default function DataPolicyPage() {
  return (
    <PageLayout language="fr" hideHeader>
      <LegalDocument document={legalPages.dataPolicy} />
    </PageLayout>
  );
}
