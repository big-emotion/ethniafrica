import type { Metadata } from "next";

import AboutPageShell from "@/components/pages/AboutPageShell";
import AboutPageContent from "@/components/pages/AboutPageContent";
import { getLocalizedRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

interface AboutPageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-141
export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { lang } = await params;
  const title = getTranslation(lang as Language).footer.about;
  return {
    title,
    ...surfaceHead(
      lang as Language,
      "about",
      (locale) => getLocalizedRoute(locale, "about"),
      { title }
    ),
  };
}

/**
 * No longer fetches corpus counts, hub modules or country syntheses: those
 * fed the three blocks trimmed from AboutPageContent (2026-09-01) — the
 * example-country cards, the interactive access cards and the source
 * bibliography. The page is now static, and stays a server component only so
 * `AboutPageShell` can do its client-only language sync outside the route.
 */
// @req REQ-091
// @req REQ-132
export default async function AboutPage({ params }: AboutPageProps) {
  const { lang } = await params;
  return (
    <AboutPageShell>
      <AboutPageContent language={lang as Language} />
    </AboutPageShell>
  );
}
