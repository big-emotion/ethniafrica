import type { Metadata } from "next";

import { LegalDocument } from "@/components/layout/LegalDocument";
import { PageLayout } from "@/components/layout/PageLayout";
import { getLegalPage } from "@/lib/legalPagesLocalization";
import { getStaticPageRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";

interface AccessibilityPageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-141
export async function generateMetadata({
  params,
}: AccessibilityPageProps): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  const title = getLegalPage(language, "accessibility").title;
  return {
    title,
    ...surfaceHead(
      language,
      "accessibility",
      (locale) => getStaticPageRoute(locale, "accessibility"),
      { title }
    ),
  };
}

// @req REQ-090
export default async function AccessibilityPage({
  params,
}: AccessibilityPageProps) {
  const { lang } = await params;
  const language = lang as Language;
  return (
    <PageLayout language={language} hideHeader>
      <LegalDocument document={getLegalPage(language, "accessibility")} />
    </PageLayout>
  );
}
