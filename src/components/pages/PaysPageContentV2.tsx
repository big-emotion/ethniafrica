"use client";

import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/layout/PageLayout";
import { CountryView } from "@/components/views/CountryView";
import { DirectoryHero } from "@/components/views/DirectoryHero";
import { getTranslation } from "@/lib/translations";

/**
 * The country directory: a list, and nothing else.
 *
 * It used to hold a detail pane beside the list, opened by a `?country=` query
 * and filled by the legacy client detail view. That made a second country
 * surface — no globe, dossier folded behind a disclosure — reachable from the
 * main navigation while the atlas fiche sat one URL away. Selecting a country
 * is a navigation now, and `src/app/[lang]/pays/page.tsx` redirects the old
 * query shape to the fiche.
 *
 * With the pane gone the two breakpoint branches rendered the same thing, so
 * the JS-measured fork went too: one tree, and any denser desktop layout is a
 * matter of CSS.
 */
// @req REQ-091
export function PaysPageContentV2() {
  const { language, setLanguage } = useLanguage();
  const t = getTranslation(language);

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      sectionName={t.countries}
      hideHeader
    >
      <DirectoryHero entityType="country" title={t.countries}>
        <CountryView language={language} />
      </DirectoryHero>
    </PageLayout>
  );
}
