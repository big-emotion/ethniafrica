import { describe, expect, it } from "vitest";

import {
  BOTTOM_SHEET_BIAS,
  BOTTOM_SHEET_VIEW_FRACTION,
  SIDE_PANEL_BIAS,
  NO_BIAS,
  PANEL_SIDE_BREAKPOINT_PX,
  SIDE_PANEL_VIEW_FRACTION,
  biasForPanel,
  panelFreeRegion,
  resolvePanelAnchor,
} from "../panelBias";

describe("resolvePanelAnchor (REQ-117 AC2, AC3)", () => {
  // @req REQ-117
  it("anchors the panel to the bottom below the breakpoint", () => {
    expect(resolvePanelAnchor(430)).toBe("bottom");
    expect(resolvePanelAnchor(PANEL_SIDE_BREAKPOINT_PX - 1)).toBe("bottom");
  });

  // @req REQ-117
  it("anchors the panel to the side at the breakpoint and above", () => {
    expect(resolvePanelAnchor(PANEL_SIDE_BREAKPOINT_PX)).toBe("side");
    expect(resolvePanelAnchor(1200)).toBe("side");
  });
});

describe("biasForPanel (REQ-117 AC2, AC3)", () => {
  // @req REQ-117
  it("lifts the subject clear of a bottom sheet", () => {
    const bias = biasForPanel("bottom");

    expect(bias.offsetY).toBeCloseTo(BOTTOM_SHEET_BIAS, 5);
    expect(bias.offsetX).toBe(0);
  });

  // @req REQ-117
  it("pushes the subject clear of a side panel, which this layout anchors to the right", () => {
    const bias = biasForPanel("side");

    expect(bias.offsetX).toBeCloseTo(-SIDE_PANEL_BIAS, 5);
    expect(bias.offsetY).toBe(0);
  });

  // @req REQ-117
  it("moves the subject less far than the panel covers", () => {
    // The two used to be the same number. A sheet covering 54% of the stage
    // would, under that rule, bias by 0.54 and push the chosen country off the
    // top of the globe — clear of the panel and clear of the view with it.
    expect(BOTTOM_SHEET_BIAS).toBeLessThan(BOTTOM_SHEET_VIEW_FRACTION);
    expect(SIDE_PANEL_BIAS).toBeLessThan(SIDE_PANEL_VIEW_FRACTION);
  });

  // @req REQ-117
  it("leaves the globe centred when no panel is open", () => {
    expect(biasForPanel(null)).toEqual(NO_BIAS);
  });

  // @req REQ-117
  it("settles the subject inside the region the panel leaves free, at both anchorings", () => {
    for (const anchor of ["bottom", "side"] as const) {
      const bias = biasForPanel(anchor);
      const free = panelFreeRegion(anchor);

      expect(bias.offsetX).toBeGreaterThan(free.xMin);
      expect(bias.offsetX).toBeLessThan(free.xMax);
      expect(bias.offsetY).toBeGreaterThan(free.yMin);
      expect(bias.offsetY).toBeLessThan(free.yMax);
    }
  });

  // @req REQ-117
  it("never biases the subject so far that it leaves the stage altogether", () => {
    for (const anchor of ["bottom", "side"] as const) {
      const bias = biasForPanel(anchor);
      expect(Math.abs(bias.offsetX)).toBeLessThan(1);
      expect(Math.abs(bias.offsetY)).toBeLessThan(1);
    }
  });
});
