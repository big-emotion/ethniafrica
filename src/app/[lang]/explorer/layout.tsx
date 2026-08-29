import type { ReactNode } from "react";

import { FacetHubShell } from "@/components/hubs/facets/FacetHubShell";
import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";

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
 * The counts are fetched here rather than per facet. They are the same figures
 * for all three, and `getContinentPeopleCounts` is cached for an hour, so the
 * routes that pass through pay nothing for them.
 */
// @req REQ-114
export default async function ExplorerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const peopleCounts = await getContinentPeopleCounts().catch(() => undefined);

  return (
    <FacetHubShell peopleCountsByCountry={peopleCounts}>
      {children}
    </FacetHubShell>
  );
}
