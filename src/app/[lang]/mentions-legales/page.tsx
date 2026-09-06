import type { Metadata } from "next";

import { LegalDocument } from "@/components/layout/LegalDocument";
import { PageLayout } from "@/components/layout/PageLayout";
import { legalPages } from "@/lib/legal-pages";
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
  const title = legalPages.legalNotice.title;
  return {
    title,
    ...surfaceHead(
      lang as Language,
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
  return (
    <PageLayout language={lang as Language} hideHeader>
      <LegalDocument document={legalPages.legalNotice} />
    </PageLayout>
  );
}
