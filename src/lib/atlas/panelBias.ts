/**
 * The geometry half of the REQ-117 contract: the globe yields the share of the
 * stage the facts panel occupies, so the chosen subject settles in what the
 * panel leaves free instead of underneath it.
 *
 * Offsets are clip-space, matching the globe shaders: the stage spans -1..1 on
 * both axes, x grows right and y grows up.
 *
 * ── The bias is no longer the covered fraction ────────────────────────────
 * It used to be: a panel covering the bottom 45% leaves y ∈ [-0.1, 1] free,
 * whose centre is +0.45, so the two numbers were the same and could be read off
 * one another. That identity broke the moment the sheet grew to 54% of the
 * stage. Biasing by 0.54 would shove the chosen country off the top of the
 * globe entirely — clear of the panel, and clear of the view with it.
 *
 * So the two are now separate numbers with separate jobs. The view fraction
 * says how much of the stage the panel covers, and sizes it. The bias says how
 * far to move the subject, and is chosen so the subject lands inside what the
 * panel leaves free while staying comfortably on screen. The property that
 * matters — the chosen country is visible beside the panel, not under it and
 * not off the edge — is asserted directly in panelBias.test.ts, because it is
 * the thing that must hold; the old equality was only ever one way of getting
 * there.
 */

/** Below this width the panel is a bottom sheet; at it and above, a side panel. */
// @req REQ-117
export const PANEL_SIDE_BREAKPOINT_PX = 760;

/** Share of the stage each anchoring covers — must match AtlasFactsPanel's own sizing. */
// @req REQ-117
export const BOTTOM_SHEET_VIEW_FRACTION = 0.54;

/** The side panel is a fixed width, not a share: a column of facts has a readable width. */
// @req REQ-117
export const SIDE_PANEL_WIDTH_PX = 336;

/**
 * The share that fixed width covers at the narrowest stage that ever uses the
 * side anchoring (PANEL_SIDE_BREAKPOINT_PX). Wider stages cover proportionally
 * less, so a free region computed from this is conservative at every width
 * above the breakpoint — it can only ever under-claim the space available.
 */
// @req REQ-117
export const SIDE_PANEL_VIEW_FRACTION =
  SIDE_PANEL_WIDTH_PX / PANEL_SIDE_BREAKPOINT_PX;

/**
 * How far the subject moves when a panel opens. Deliberately smaller than the
 * covered fraction — see the note at the top of this file.
 */
// @req REQ-117
export const BOTTOM_SHEET_BIAS = 0.17;
// @req REQ-117
export const SIDE_PANEL_BIAS = 0.15;

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

  return anchor === "bottom"
    ? { offsetX: 0, offsetY: BOTTOM_SHEET_BIAS }
    : { offsetX: -SIDE_PANEL_BIAS, offsetY: 0 };
}
