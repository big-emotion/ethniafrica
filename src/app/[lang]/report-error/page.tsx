import type { Metadata } from "next";

import { getStaticPageRoute } from "@/lib/routing";
import { localeHead } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";
import ReportErrorPageClient from "@/app/[lang]/report-error/ReportErrorPageClient";
import { reportsCopy } from "@/lib/i18n/copy/reports";

/**
 * The route is a server component so it can declare its head; the form
 * page is a client component and lives beside it. A `"use client"` file
 * cannot export `generateMetadata`.
 */

interface ReportErrorPageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-141
export async function generateMetadata({
  params,
}: ReportErrorPageProps): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  const title = reportsCopy[language].page.metadataTitle;
  // The far end of a flow, meaningless entered cold from a search result
  // (`UNLISTED_ROUTES`): indexed in no locale, canonical declared all the same.
  return {
    title,
    ...localeHead(
      language,
      (locale) => getStaticPageRoute(locale, "reportError"),
      [],
      { title }
    ),
  };
}

// @req REQ-014
export default function ReportErrorPage() {
  return <ReportErrorPageClient />;
}
