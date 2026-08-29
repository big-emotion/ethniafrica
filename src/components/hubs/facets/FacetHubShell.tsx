"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PageLayout } from "@/components/layout/PageLayout";
import { FacetCountryIndexProvider } from "@/components/hubs/facets/FacetCountryIndex";
import { FacetGlobeIsland } from "@/components/hubs/facets/FacetGlobeIsland";
import { FacetSwitcher } from "@/components/hubs/facets/FacetSwitcher";
import { DIRECTORY_ACCENT_CLASS } from "@/lib/hubs/directoryAccent";
import { getFacet, getFacetFromRoute } from "@/lib/hubs/facets";

export interface FacetHubShellProps {
  peopleCountsByCountry: Record<string, number> | undefined;
  /** Every country the corpus documents — the map's choosable set, not its drawn one. */
  countryIds: readonly string[];
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
  countryIds,
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
        {/* The head comes before the band, not inside the parchment under it:
            the globe is some 520px of full-bleed night, so a title below it is
            past the fold on every screen and the trail was the only thing
            naming the page. It carries the h1 for all three facets, which is
            why none of the facet pages carries one of its own. */}
        <header
          data-testid="facet-hub-head"
          className="px-3 md:px-4 xl:px-5 pt-afh-base pb-afh-base flex flex-col gap-afh-xs"
        >
          <p className="font-[family-name:var(--afh-font-mono)] text-afh-caption uppercase tracking-[0.1em] text-afh-text-soft">
            {facet.eyebrow}
          </p>
          <h1 className="font-display font-black text-afh-h1 leading-[1.1] tracking-[-0.015em]">
            {facet.title}
          </h1>
        </header>

        <FacetCountryIndexProvider>
          <FacetGlobeIsland
            peopleCountsByCountry={peopleCountsByCountry}
            countryIds={countryIds}
            missingMessage="Le corpus ne renseigne encore aucun peuple par pays."
          />
          <div className="mt-6 mb-4 flex flex-col gap-2">
            <FacetSwitcher active={facet.key} />
            {/* Says what the switch above and the filters below each do,
                because they collide in the reader's own language: "pays" is a
                facet and also a filter, and nothing distinguished choosing a
                subject from narrowing one. */}
            <p
              data-testid="facet-filter-hint"
              className="max-w-[62ch] text-afh-small text-afh-text-soft"
            >
              {facet.filterHint}
            </p>
          </div>
          {children}
        </FacetCountryIndexProvider>
      </div>
    </PageLayout>
  );
}

export default FacetHubShell;
