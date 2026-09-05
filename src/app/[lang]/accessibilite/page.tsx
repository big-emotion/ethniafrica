import type { Metadata } from "next";

import { LegalDocument } from "@/components/layout/LegalDocument";
import { PageLayout } from "@/components/layout/PageLayout";
import { legalPages } from "@/lib/legal-pages";
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
  const title = legalPages.accessibility.title;
  return {
    title,
    ...surfaceHead(
      lang as Language,
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
  return (
    <PageLayout language={lang as Language} hideHeader>
      <LegalDocument document={legalPages.accessibility} />
    </PageLayout>
  );
}
