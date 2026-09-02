import { FacetPanelLoading } from "@/components/hubs/facets/FacetPanelLoading";

/**
 * The wait for the name facet.
 *
 * It has to change in the same commit as the registry entry. The moment
 * `getFacetFromRoute` recognises `/fr/atlas/noms`, this route becomes the
 * shell's `children`, and a `PageLoadingScreen` there paints a second header,
 * trail and title band *under* the globe — changing a filter would look like
 * the home page loading in the middle of the atlas. `peuples/loading.tsx`
 * documents the same failure; this is the same answer.
 */
// @req REQ-139
// @req REQ-114
export default function NomsFacetLoading() {
  return <FacetPanelLoading facet="patronymes" />;
}
