import { FacetPanelLoading } from "@/components/hubs/facets/FacetPanelLoading";

/**
 * The wait for the peoples facet.
 *
 * It exists to stand between this route and `explorer/loading.tsx`. That one
 * covers the whole Explorer axis, and the axis holds two kinds of route: the
 * hub and `recherche`, which pass through `FacetHubShell` untouched and are
 * whole pages, and the three facets, which are the shell's `children`. Its
 * `PageLoadingScreen` is right for the first kind and wrong for the second —
 * inside the shell it paints a second header, trail and title band under the
 * globe, so changing a filter looks like the home page loading in the middle
 * of the atlas.
 *
 * `[slug]` declares a nearer boundary still, so a fiche keeps streaming
 * through its own and can still answer 404 before its shell is flushed.
 */
// @req REQ-104
// @req REQ-114
export default function PeuplesFacetLoading() {
  return <FacetPanelLoading facet="peoples" />;
}
