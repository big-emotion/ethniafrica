import type { CSSProperties, ReactNode } from "react";

/**
 * The night band a globe fiche opens on: the globe runs the full width of the
 * viewport, on the night ground, closed by a one-pixel ochre seam.
 *
 * The seam is the page's only separator between the band and the parchment
 * below it. Nothing else divides them — no shadow, no gap — so the reader
 * crosses from the map into the reading in one step.
 *
 * ── The band starts below the nav, on purpose ─────────────────────────────
 * The mockup runs the night up behind the nav so the two read as one block.
 * Twice now that has cost more than it bought. `navOnNight` was removed in
 * 8ee71004 because a night band behind the nav made the theme control look
 * broken on the home; restoring it here for the family fiche then produced a
 * SERIOUS colour-contrast violation, because DesktopNavBar paints its active
 * link `bg-primary` and `.afh-on-night` has no readable night value for that
 * pair.
 *
 * So the nav follows the reader's theme like every other route, and the band
 * begins under it. Putting the nav back on night is not a prop away — it needs
 * the nav's own night palette resolved first, which is its own piece of work.
 *
 * The band must also stay bounded: give it a viewport height and the theme
 * control goes back to looking broken for the same reason it did on the home.
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
