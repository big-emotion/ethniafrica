import type { Metadata } from "next";

import { LegalDocument } from "@/components/layout/LegalDocument";
import { PageLayout } from "@/components/layout/PageLayout";
import { getLegalPage } from "@/lib/legalPagesLocalization";
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
  const language = lang as Language;
  const title = getLegalPage(language, "dataPolicy").title;
  return {
    title,
    ...surfaceHead(
      language,
      "dataPolicy",
      (locale) => getStaticPageRoute(locale, "dataPolicy"),
      { title }
    ),
  };
}

// @req REQ-088
export default async function DataPolicyPage({ params }: DataPolicyPageProps) {
  const { lang } = await params;
  const language = lang as Language;
  return (
    <PageLayout language={language} hideHeader>
      <LegalDocument document={getLegalPage(language, "dataPolicy")} />
    </PageLayout>
  );
}
