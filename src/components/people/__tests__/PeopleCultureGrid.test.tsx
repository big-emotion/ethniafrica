import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PeopleCultureGrid } from "../PeopleCultureGrid";

describe("PeopleCultureGrid", () => {
  afterEach(cleanup);

  // @req REQ-003
  it("returns nothing when the fiche declares no culture", () => {
    const { container } = render(<PeopleCultureGrid data={{}} />);
    expect(container.firstChild).toBeNull();
  });

  // @req REQ-003
  it("lays the four declared fields out as a two-column grid of tiles", () => {
    const { container } = render(
      <PeopleCultureGrid
        language="fr"
        data={{
          majorRites: "Rites de passage.",
          symbols: "Un symbole tissé.",
          artsAndMusic: "Des tambours.",
          spiritualities: "Un culte ancestral.",
        }}
      />
    );

    // The column count belongs to FicheTiles and its stylesheet rule, so every
    // chapter lays its tiles out on the same grid.
    const grid = container.firstElementChild;
    expect(grid).toHaveClass("afh-tiles");

    const tiles = container.querySelectorAll("[data-fiche-tile]");
    expect(tiles).toHaveLength(4);
    expect(screen.getByText("Rites majeurs")).toBeVisible();
    expect(screen.getByText("Rites de passage.")).toBeVisible();
  });

  // Each tile's closed state must carry a datum, not the rubric name — the
  // FicheTile charter this reuses (REQ-153).
  // @req REQ-153
  it("gives each tile's closed state a fact rather than its own title", () => {
    render(
      <PeopleCultureGrid
        language="fr"
        data={{ majorRites: "Rites de passage." }}
      />
    );

    const tile = screen.getByText("Rites majeurs").closest("[data-fiche-tile]");
    expect(tile?.querySelector("[data-closed-fact]")).not.toHaveTextContent(
      "Rites majeurs"
    );
    expect(tile?.querySelector("[data-closed-fact]")).toHaveTextContent(
      "Rites de passage."
    );
  });

  // @req REQ-153
  it("reaches its detail with no transform animation", () => {
    const { container } = render(
      <PeopleCultureGrid
        language="fr"
        data={{
          majorRites:
            "Un rite central structure l'année. Des variantes locales existent selon les villages.",
        }}
      />
    );

    const tile = container.querySelector("[data-fiche-tile]")!;
    expect(tile.outerHTML).not.toMatch(
      /transition-transform|animate-|rotate-|motion-safe:/
    );
  });
});
