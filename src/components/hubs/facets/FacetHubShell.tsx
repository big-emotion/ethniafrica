"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PageLayout } from "@/components/layout/PageLayout";
import { FacetCountryIndexProvider } from "@/components/hubs/facets/FacetCountryIndex";
import { FacetGlobeIsland } from "@/components/hubs/facets/FacetGlobeIsland";
import { FacetSwitcher } from "@/components/hubs/facets/FacetSwitcher";
import { DIRECTORY_ACCENT_CLASS } from "@/components/views/DirectoryHero";
import { getFacet, getFacetFromRoute } from "@/lib/hubs/facets";

export interface FacetHubShellProps {
  peopleCountsByCountry: Record<string, number> | undefined;
  children: ReactNode;
}

/**
 * The unified hub: one map, one switch, and whichever facet is being read.
 *
 * It hangs off the whole Explorer subtree rather than a route group holding
 * only the three facets, because a group would take the fiches with it —
 * `explorer/peuples/[slug]` sits under `explorer/peuples`, so any layout that
 * wraps the directory wraps the fiche too, and every fiche would grow a second
 * globe and a facet switcher it has no business showing. So the subtree gets
 * the layout and this decides, from the address, whether the current route is
 * one of the three facets. Everything else — the Explorer hub itself,
 * `recherche`, all three fiche routes — passes through untouched.
 *
 * That decision is an *exact* path match, not a prefix: `getPageFromRoute`
 * answers "peoples" for a fiche as well, and a prefix test here is precisely
 * how the fiches would inherit the shell.
 */
// @req REQ-114
export function FacetHubShell({
  peopleCountsByCountry,
  children,
}: FacetHubShellProps) {
  const pathname = usePathname();
  const active = getFacetFromRoute(pathname ?? "");

  if (!active) return <>{children}</>;

  const facet = getFacet(active);

  return (
    <PageLayout
      language="fr"
      sectionName={facet.sectionName}
      hideHeader
      flushTop
    >
      <div
        className={DIRECTORY_ACCENT_CLASS[facet.entityType]}
        data-testid="facet-hub"
        data-facet={facet.key}
      >
        <FacetCountryIndexProvider>
          <FacetGlobeIsland
            peopleCountsByCountry={peopleCountsByCountry}
            missingMessage="Le corpus ne renseigne encore aucun peuple par pays."
          />
          <FacetSwitcher active={facet.key} className="my-6" />
          {children}
        </FacetCountryIndexProvider>
      </div>
    </PageLayout>
  );
}

export default FacetHubShell;
