import type { CSSProperties, ReactNode } from "react";

/**
 * The night band a globe fiche opens on: the globe runs the full width of the
 * viewport, on the night ground, closed by a one-pixel ochre seam.
 *
 * The seam is the page's only separator between the band and the parchment
 * below it. Nothing else divides them — no shadow, no gap — so the reader
 * crosses from the map into the reading in one step.
 *
 * ── Why the band is bounded, and must stay bounded ────────────────────────
 * The home hero used to be night from edge to edge and full height, and that
 * made the theme control look broken on that route: the band filled the
 * viewport, so pressing light/dark changed nothing the reader could see
 * (see 8ee71004, which re-scoped DEC-022 to the dataviz itself). A fiche's
 * band does not have that problem — it is 470 or 520 px tall with the themed
 * parchment immediately below it, so a theme change is visible at once. That
 * is the whole reason this band may carry the nav when the home's may not, and
 * it stops being true the moment anyone gives this band a viewport height.
 */

/**
 * The globe's own heights are --afh-globe-stage-height (space.css), which
 * AtlasGlobe reads directly. They are not restated here: one band, one source.
 */

/** Container width, not viewport width — see the container query below. */
// @req REQ-116
export const FICHE_BAND_BREAKPOINT_PX = 760;

const BAND_STYLE: CSSProperties = {
  position: "relative",
  backgroundColor: "var(--afh-night-ground)",
  borderRadius: 0,
  // Escapes PageLayout's container so the band reaches both edges of the
  // viewport, the way the mockup's band does.
  width: "100vw",
  marginLeft: "calc(50% - 50vw)",
  marginRight: "calc(50% - 50vw)",
  // The globe's heights answer to the band's own width, so the same component
  // reads correctly inside a narrower shell than the viewport.
  containerType: "inline-size",
};

const SEAM_STYLE: CSSProperties = {
  height: 24,
  borderBottomStyle: "solid",
  borderBottomWidth: 1,
  borderBottomColor: "var(--afh-cat-ocre)",
};

// @req REQ-116
export function FicheHeroBand({ children }: { children: ReactNode }) {
  return (
    <div data-testid="fiche-hero-band" style={BAND_STYLE}>
      {children}
      <div
        data-testid="fiche-hero-seam"
        aria-hidden="true"
        style={SEAM_STYLE}
      />
    </div>
  );
}
