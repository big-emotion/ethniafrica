import { LegalDocument } from "@/components/layout/LegalDocument";
import { PageLayout } from "@/components/layout/PageLayout";
import { legalPages } from "@/lib/legal-pages";
import type { Language } from "@/types/shared";

// @req REQ-090
export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <PageLayout language={lang as Language} hideHeader>
      <LegalDocument document={legalPages.accessibility} />
    </PageLayout>
  );
}
