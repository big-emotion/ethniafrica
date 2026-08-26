import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  FICHE_BAND_BREAKPOINT_PX,
  FICHE_GLOBE_HEIGHT_COMPACT_PX,
  FICHE_GLOBE_HEIGHT_WIDE_PX,
  FicheHeroBand,
} from "@/components/fiche/FicheHeroBand";

describe("FicheHeroBand", () => {
  // @req REQ-116
  it("stands the globe on the night ground", () => {
    render(
      <FicheHeroBand>
        <div data-testid="globe" />
      </FicheHeroBand>
    );

    const band = screen.getByTestId("fiche-hero-band");
    expect(band.style.backgroundColor).toBe("var(--afh-night-ground)");
    expect(screen.getByTestId("globe")).toBeInTheDocument();
  });

  // @req REQ-116
  it("runs edge to edge, with no radius to make it read as a card in the flow", () => {
    render(
      <FicheHeroBand>
        <div />
      </FicheHeroBand>
    );

    const band = screen.getByTestId("fiche-hero-band");
    // The globe is the top of the page, not an illustration placed on it.
    expect(band.style.width).toBe("100vw");
    expect(band.style.borderRadius).toBe("0px");
  });

  // @req REQ-116
  it("closes with an ochre seam, the page's only separator between night and parchment", () => {
    render(
      <FicheHeroBand>
        <div />
      </FicheHeroBand>
    );

    const seam = screen.getByTestId("fiche-hero-seam");
    expect(seam.style.borderBottomColor).toBe("var(--afh-cat-ocre)");
    expect(seam.style.borderBottomWidth).toBe("1px");
    expect(seam).toHaveAttribute("aria-hidden", "true");
  });

  // @req REQ-116
  it("carries the container the globe's heights are measured against", () => {
    // The mockup sizes itself with a container query, not a media query: the
    // globe answers to the width of the band, so the same component reads
    // correctly inside a narrower shell.
    render(
      <FicheHeroBand>
        <div />
      </FicheHeroBand>
    );

    expect(screen.getByTestId("fiche-hero-band").style.containerType).toBe(
      "inline-size"
    );
  });

  // @req REQ-116
  it("states the two globe heights and the width that switches between them", () => {
    expect(FICHE_GLOBE_HEIGHT_COMPACT_PX).toBe(470);
    expect(FICHE_GLOBE_HEIGHT_WIDE_PX).toBe(520);
    expect(FICHE_BAND_BREAKPOINT_PX).toBe(760);
    // Mobile first: the smaller height is the one that applies by default.
    expect(FICHE_GLOBE_HEIGHT_COMPACT_PX).toBeLessThan(
      FICHE_GLOBE_HEIGHT_WIDE_PX
    );
  });
});
