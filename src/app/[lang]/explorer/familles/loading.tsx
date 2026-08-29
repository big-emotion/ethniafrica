import { FacetPanelLoading } from "@/components/hubs/facets/FacetPanelLoading";

/**
 * The wait for the linguistic families facet. See the peoples facet's own
 * boundary for why the three of them cannot share the Explorer axis's one.
 */
// @req REQ-104
// @req REQ-114
export default function FamillesFacetLoading() {
  return <FacetPanelLoading facet="families" />;
}
