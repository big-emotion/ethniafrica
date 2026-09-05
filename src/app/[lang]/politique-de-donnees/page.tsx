import type { Metadata } from "next";

import { LegalDocument } from "@/components/layout/LegalDocument";
import { PageLayout } from "@/components/layout/PageLayout";
import { legalPages } from "@/lib/legal-pages";
import { getStaticPageRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";

interface DataPolicyPageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-141
export async function generateMetadata({
  params,
}: DataPolicyPageProps): Promise<Metadata> {
  const { lang } = await params;
  const title = legalPages.dataPolicy.title;
  return {
    title,
    ...surfaceHead(
      lang as Language,
      "dataPolicy",
      (locale) => getStaticPageRoute(locale, "dataPolicy"),
      { title }
    ),
  };
}

// @req REQ-088
export default async function DataPolicyPage({ params }: DataPolicyPageProps) {
  const { lang } = await params;
  return (
    <PageLayout language={lang as Language} hideHeader>
      <LegalDocument document={legalPages.dataPolicy} />
    </PageLayout>
  );
}
