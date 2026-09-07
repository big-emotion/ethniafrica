import type { Metadata } from "next";

import { LegalDocument } from "@/components/layout/LegalDocument";
import { PageLayout } from "@/components/layout/PageLayout";
import { getLegalPage } from "@/lib/legalPagesLocalization";
import { getStaticPageRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";

interface LegalNoticePageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-141
export async function generateMetadata({
  params,
}: LegalNoticePageProps): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  const title = getLegalPage(language, "legalNotice").title;
  return {
    title,
    ...surfaceHead(
      language,
      "legalNotice",
      (locale) => getStaticPageRoute(locale, "legalNotice"),
      { title }
    ),
  };
}

// @req REQ-088
export default async function LegalNoticePage({
  params,
}: LegalNoticePageProps) {
  const { lang } = await params;
  const language = lang as Language;
  return (
    <PageLayout language={language} hideHeader>
      <LegalDocument document={getLegalPage(language, "legalNotice")} />
    </PageLayout>
  );
}
