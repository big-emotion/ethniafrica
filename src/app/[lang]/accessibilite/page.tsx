import { LegalDocument } from "@/components/layout/LegalDocument";
import { PageLayout } from "@/components/layout/PageLayout";
import { legalPages } from "@/lib/legal-pages";

// @req REQ-090
export default function AccessibilityPage() {
  return (
    <PageLayout language="fr" hideHeader>
      <LegalDocument document={legalPages.accessibility} />
    </PageLayout>
  );
}
