import type { Metadata } from "next";

import { getLocalizedRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";
import DoctrinePageClient from "@/app/[lang]/doctrine/DoctrinePageClient";

/**
 * The route is a server component so it can declare its head; the page
 * itself is a client component (`useLanguage`) and lives beside it. A
 * `"use client"` file cannot export `generateMetadata`, which is how this
 * route went without a canonical for as long as it was one.
 */

interface DoctrinePageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-141
export async function generateMetadata({
  params,
}: DoctrinePageProps): Promise<Metadata> {
  const { lang } = await params;
  const title = "Doctrine éditoriale";
  return {
    title,
    ...surfaceHead(
      lang as Language,
      "doctrine",
      (locale) => getLocalizedRoute(locale, "doctrine"),
      { title }
    ),
  };
}

// @req REQ-091
export default function DoctrinePage() {
  return <DoctrinePageClient />;
}
