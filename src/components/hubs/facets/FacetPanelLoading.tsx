import { DidYouKnowLoader } from "@/components/system/DidYouKnowLoader";
import { getFacet, type FacetKey } from "@/lib/hubs/facets";
import { pickDidYouKnowFact } from "@/lib/home/didYouKnowFacts";

export interface FacetPanelLoadingProps {
  /** Which of the three readings is being waited for. */
  facet: FacetKey;
}

/**
 * The wait of a facet reading (REQ-104, REQ-114).
 *
 * `PageLoadingScreen` cannot serve this slot, and the difference is not
 * cosmetic. `ExplorerLayout` persists across the three facets, so changing a
 * filter, a letter or a page swaps only `FacetHubShell`'s `children`. A
 * fallback that opens on `PageLayout` therefore renders a whole second page
 * *inside* the shell — site header, trail, title band and footer, under the
 * globe and the filters the reader is still looking at — and the wait reads
 * as the home page loading in the middle of the atlas.
 *
 * What the slot owes is the parchment the facet page itself renders, so the
 * surface the reader watches keeps its shape and only its contents are
 * pending.
 *
 * No accent scope is declared here, deliberately. The shell wraps `children`
 * in the facet's own `DIRECTORY_ACCENT_CLASS`, so the fact's chips and the
 * inked continent read the hue of the facet being waited for; a fixed scope
 * here would repaint the wait in a colour the surrounding page does not use.
 */
// @req REQ-104
// @req REQ-113
// @req REQ-114
export function FacetPanelLoading({ facet }: FacetPanelLoadingProps) {
  // The facet table is the one place the three readings are named; a label
  // spelled out per route is a fourth spelling waiting to drift from it.
  const label = `Chargement des ${getFacet(facet).label.toLowerCase()}`;

  return (
    <div className="afh-parchment" data-testid="facet-panel-loading">
      <DidYouKnowLoader fact={pickDidYouKnowFact()} label={label} />
    </div>
  );
}

export default FacetPanelLoading;
