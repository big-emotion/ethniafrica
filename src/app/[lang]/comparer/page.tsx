import type { Metadata } from "next";

import { getLocalizedRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";
import ComparerPickerPageClient from "@/app/[lang]/comparer/ComparerPickerPageClient";

/**
 * The route is a server component so it can declare its head; the picker
 * is a client component (debounced search, selection state) and lives
 * beside it. A `"use client"` file cannot export `generateMetadata`.
 */

interface ComparerPickerPageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-141
export async function generateMetadata({
  params,
}: ComparerPickerPageProps): Promise<Metadata> {
  const { lang } = await params;
  const title = "Comparer";
  return {
    title,
    ...surfaceHead(
      lang as Language,
      "compare",
      (locale) => getLocalizedRoute(locale, "compare"),
      { title }
    ),
  };
}

// @req REQ-091
export default function ComparerPickerPage() {
  return <ComparerPickerPageClient />;
}
