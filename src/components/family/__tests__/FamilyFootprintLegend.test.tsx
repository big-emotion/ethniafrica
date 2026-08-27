import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FamilyFootprintLegend } from "@/components/family/FamilyFootprintLegend";

describe("FamilyFootprintLegend", () => {
  // @req REQ-116
  it("says the area was reconstructed, never that the fiche declared it", () => {
    render(<FamilyFootprintLegend />);

    expect(screen.getByText(/reconstruite/i)).toBeInTheDocument();
    expect(screen.getByText(/pas déclarée/i)).toBeInTheDocument();
  });

  /**
   * On a macro-family the area comes from the peoples the fiche itself names,
   * so "depuis les peuples" alone would let a reader believe the atlas walked
   * the classification down to its leaves.
   */
  // @req REQ-116
  it("credits the fiche's own naming when the footprint came from its declaration", () => {
    render(<FamilyFootprintLegend provenance="declared-associated-peoples" />);

    expect(screen.getByText(/que la fiche nomme/i)).toBeInTheDocument();
  });
});
