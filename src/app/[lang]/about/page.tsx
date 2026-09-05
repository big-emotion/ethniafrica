import AboutPageShell from "@/components/pages/AboutPageShell";
import AboutPageContent from "@/components/pages/AboutPageContent";
import type { Language } from "@/types/shared";

/**
 * No longer fetches corpus counts, hub modules or country syntheses: those
 * fed the three blocks trimmed from AboutPageContent (2026-09-01) — the
 * example-country cards, the interactive access cards and the source
 * bibliography. The page is now static, and stays a server component only so
 * `AboutPageShell` can do its client-only language sync outside the route.
 */
// @req REQ-091
// @req REQ-132
export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <AboutPageShell>
      <AboutPageContent language={lang as Language} />
    </AboutPageShell>
  );
}
