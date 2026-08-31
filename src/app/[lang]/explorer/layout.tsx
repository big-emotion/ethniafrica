import type { ReactNode } from "react";

import { FacetHubShell } from "@/components/hubs/facets/FacetHubShell";
import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";
import { getCountryIndex } from "@/api/v2/services/countryService";

/**
 * The Explorer subtree's layout, which exists for one reason: to hold the
 * atlas globe still while the reader changes facet.
 *
 * The three facets are three static sibling routes, so without a shared layout
 * each switch would unmount the map and build a new WebGL context to draw the
 * same continent. A layout persists across sibling navigations, so the globe is
 * mounted once here and the facet below it is what repaints.
 *
 * It wraps the whole subtree — hub, search and the three fiche routes included
 * — because a route group holding only the directories would hold their
 * `[slug]` fiches too. `FacetHubShell` decides from the address which routes
 * actually get the shell; everything else passes through unchanged.
 *
 * Both reads are the same for all three facets and both are cached, so the
 * routes that pass through pay nothing for them. The counts shade the field;
 * the country list is what the reader may *choose*, which is a wider set than
 * what gets drawn — see `FacetGlobeIsland`.
 */
// @req REQ-114
export default async function ExplorerLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Neither read is allowed to cost the way in: a failed count costs the
  // radial field, and a failed index costs the picker, but the facet below
  // still renders its own list.
  const [peopleCounts, countries] = await Promise.all([
    getContinentPeopleCounts().catch(() => undefined),
    getCountryIndex().catch(() => []),
  ]);

  return (
    <FacetHubShell
      peopleCountsByCountry={peopleCounts}
      countryIds={countries.map((country) => country.id)}
    >
      {children}
    </FacetHubShell>
  );
}
