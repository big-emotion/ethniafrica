import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FacetPanelLoading } from "@/components/hubs/facets/FacetPanelLoading";
import FamillesLoading from "@/app/[lang]/explorer/familles/loading";
import PaysLoading from "@/app/[lang]/explorer/pays/loading";
import PeuplesLoading from "@/app/[lang]/explorer/peuples/loading";

/**
 * The wait of a facet reading, as opposed to the wait of a page.
 *
 * `ExplorerLayout` persists across the three facets, so a navigation inside
 * the hub — a filter, a letter, a page — only swaps the shell's `children`.
 * A fallback built on `PageLayout` therefore lands *inside* the shell and
 * paints a second site header, a second trail and a second title band under
 * the filters: the reader watches what looks like the home page load in the
 * middle of the atlas. What the slot owes is the parchment, and nothing
 * above it.
 */
describe("FacetPanelLoading", () => {
  // @req REQ-104
  it("announces which facet the reader is waiting for", () => {
    render(<FacetPanelLoading facet="peoples" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Chargement des peuples"
    );
  });

  // @req REQ-113
  it("spends the wait on a fact rather than on a bare indicator", () => {
    render(<FacetPanelLoading facet="families" />);

    expect(screen.getByText("Saviez-vous que")).toBeInTheDocument();
  });

  /**
   * The defect this component exists for: the shell above the slot already
   * carries the header, the trail and the h1, so anything the fallback draws
   * of its own is a duplicate of chrome the reader is still looking at.
   */
  // @req REQ-114
  it("draws no chrome of its own, since the hub shell above it stays mounted", () => {
    render(<FacetPanelLoading facet="countries" />);

    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.queryByRole("contentinfo")).toBeNull();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});

describe("the three facet waits", () => {
  /**
   * Route-level, because the defect was never in a component: it was in which
   * boundary the App Router reached for. One `loading.tsx` on the Explorer
   * axis covered routes that sit inside the shell and routes that do not, and
   * the ones inside got the outside one's page.
   */
  // @req REQ-114
  it("serves each facet route the parchment wait, not a second page", () => {
    for (const Loading of [PeuplesLoading, FamillesLoading, PaysLoading]) {
      const { unmount } = render(<Loading />);

      expect(screen.getByTestId("facet-panel-loading")).toBeInTheDocument();
      expect(screen.queryByTestId("site-header")).toBeNull();

      unmount();
    }
  });
});
