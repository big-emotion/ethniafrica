"use client";

import { useLanguage } from "@/hooks/use-language";
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
 *
 * The page frame is the Explorer layout's now. `FacetHubShell` owns the
 * `PageLayout`, the section name and the globe the three facets share, so a
 * frame here would be the second one on the page.
 */
// @req REQ-091
export function PeuplesPageContent() {
  const { language } = useLanguage();

  return (
    <DirectoryHero entityType="people" title="Peuples">
      <PeopleView language={language} hideSearchAndAlphabet={false} />
    </DirectoryHero>
  );
}
