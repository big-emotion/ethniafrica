/**
 * The geometry half of the REQ-117 contract: the globe yields the share of the
 * stage the facts panel occupies, so the chosen subject settles in what the
 * panel leaves free instead of underneath it.
 *
 * Offsets are clip-space, matching the globe shaders: the stage spans -1..1 on
 * both axes, x grows right and y grows up. A panel covering the bottom 45% of
 * the stage leaves y ∈ [-0.1, 1] free, whose centre is +0.45 — which is exactly
 * the fraction, so the bias *is* the fraction. That identity is why these two
 * numbers can be read straight off the CSS the panel is sized with.
 */

/** Below this width the panel is a bottom sheet; at it and above, a side panel. */
// @req REQ-117
export const PANEL_SIDE_BREAKPOINT_PX = 760;

/** Share of the stage each anchoring covers — must match AtlasFactsPanel's own sizing. */
// @req REQ-117
export const BOTTOM_SHEET_VIEW_FRACTION = 0.45;
// @req REQ-117
export const SIDE_PANEL_VIEW_FRACTION = 0.38;

export type PanelAnchor = "bottom" | "side";

export interface CameraBias {
  offsetX: number;
  offsetY: number;
}

export interface FreeRegion {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** No panel open, so the globe keeps the whole stage. */
// @req REQ-117
export const NO_BIAS: CameraBias = { offsetX: 0, offsetY: 0 };

// @req REQ-117
export function resolvePanelAnchor(viewportWidth: number): PanelAnchor {
  return viewportWidth < PANEL_SIDE_BREAKPOINT_PX ? "bottom" : "side";
}

function viewFractionFor(anchor: PanelAnchor): number {
  return anchor === "bottom"
    ? BOTTOM_SHEET_VIEW_FRACTION
    : SIDE_PANEL_VIEW_FRACTION;
}

/** The part of the stage the open panel does not cover, in clip space. */
// @req REQ-117
export function panelFreeRegion(anchor: PanelAnchor | null): FreeRegion {
  const whole: FreeRegion = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
  if (!anchor) return whole;

  const covered = 2 * viewFractionFor(anchor);
  return anchor === "bottom"
    ? { ...whole, yMin: -1 + covered }
    : { ...whole, xMax: 1 - covered };
}

// @req REQ-117
export function biasForPanel(anchor: PanelAnchor | null): CameraBias {
  if (!anchor) return NO_BIAS;

  const fraction = viewFractionFor(anchor);
  return anchor === "bottom"
    ? { offsetX: 0, offsetY: fraction }
    : { offsetX: -fraction, offsetY: 0 };
}
