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
      flushTop
      heroHead={
        /* The head goes into the shell's plate rather than into the page.
           It has to sit above the globe — that is some 520px of full-bleed
           night, so a title below it is past the fold on every screen — and
           the plate is the only box above it. It used to be raised here, in
           the page body, which meant the facet gave up the band entirely
           (`hideHeader`) and left the trail floating in a container of its
           own above a bare title.

           It carries the h1 for all three facets, which is why none of the
           facet pages carries one of its own. */
        <header
          data-testid="facet-hub-head"
          className={`${DIRECTORY_ACCENT_CLASS[facet.entityType]} afh-parchment-head`}
        >
          {/* The facet eyebrows are written in running case in the registry
              and set in caps here, so the string stays readable at the one
              place an editor changes it. */}
          <p className="afh-parchment-eyebrow uppercase">{facet.eyebrow}</p>
          <h1>{facet.title}</h1>
        </header>
      }
    >
      <div
        className={DIRECTORY_ACCENT_CLASS[facet.entityType]}
        data-testid="facet-hub"
        data-facet={facet.key}
      >
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
                subject from narrowing one.

                No measure of its own. It sat in a hand-set 62ch box while the
                switcher above and the filter bar below both filled the
                container, so a caption describing two full-width controls
                stopped at two-fifths of them. The typography charter gives
                running prose no measure at all now, and a label between two
                widgets belongs with the widgets either way. */}
            <p
              data-testid="facet-filter-hint"
              className="text-afh-small text-afh-text-soft"
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
