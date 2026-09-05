import type { Metadata } from "next";

import { getStaticPageRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";
import ContributePageClient from "@/app/[lang]/contribute/ContributePageClient";

/**
 * The route is a server component so it can declare its head; the page
 * itself is a client component (`useLanguage`, download buttons) and lives
 * beside it. A `"use client"` file cannot export `generateMetadata`.
 */

interface ContributePageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-141
export async function generateMetadata({
  params,
}: ContributePageProps): Promise<Metadata> {
  const { lang } = await params;
  const title = "Contribuer";
  return {
    title,
    ...surfaceHead(
      lang as Language,
      "contribute",
      (locale) => getStaticPageRoute(locale, "contribute"),
      { title }
    ),
  };
}

// @req REQ-045
export default function ContributePage() {
  return <ContributePageClient />;
}
