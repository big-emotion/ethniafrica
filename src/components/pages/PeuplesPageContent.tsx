"use client";

import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/layout/PageLayout";
import { PeopleView } from "@/components/views/PeopleView";
import { DirectoryHero } from "@/components/views/DirectoryHero";

/**
 * The peoples directory: a list, and nothing else.
 *
 * It used to hold a detail pane beside the list — the fiche on the left at
 * 70%, the list on the right at 30% — opened by a `?people=` query and filled
 * by the legacy client detail view. That made a second people surface, with no
 * globe, reachable from the main navigation while the atlas fiche sat one URL
 * away. Selecting a people is a navigation now, and
 * `src/app/[lang]/explorer/peuples/page.tsx` redirects the old query shape to the fiche.
 *
 * With the pane gone the two breakpoint branches rendered the same thing, so
 * the JS-measured fork went too: one tree, and any denser desktop layout is a
 * matter of CSS.
 */
// @req REQ-091
export function PeuplesPageContent() {
  const { language, setLanguage } = useLanguage();

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      sectionName="Peuples"
      hideHeader
    >
      <DirectoryHero entityType="people" title="Peuples">
        <PeopleView language={language} hideSearchAndAlphabet={false} />
      </DirectoryHero>
    </PageLayout>
  );
}
