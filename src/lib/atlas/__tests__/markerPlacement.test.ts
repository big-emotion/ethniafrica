import { describe, expect, it } from "vitest";

import { IDLE_POSE, poseForTarget } from "../camera";
import { NO_BIAS, biasForPanel } from "../panelBias";
import {
  STAGE_ASPECT,
  basemapTransform,
  placeTargetOnBasemap,
  placeTargetOnSphere,
} from "../markerPlacement";
import type { AtlasTarget } from "../targets";

const target = (lon: number, lat: number): AtlasTarget => ({
  countryId: "TST",
  nameFr: "Pays d'essai",
  center: { lon, lat },
  angularSpanDeg: 12,
});

describe("placeTargetOnSphere (REQ-117 AC1)", () => {
  // @req REQ-117
  it("puts the chosen target at the centre of the stage when no panel is open", () => {
    const chosen = target(20, -10);
    const placement = placeTargetOnSphere(
      chosen,
      poseForTarget(chosen, NO_BIAS)
    );

    expect(placement.leftPercent).toBeCloseTo(50, 4);
    expect(placement.topPercent).toBeCloseTo(50, 4);
    expect(placement.facingReader).toBe(true);
  });

  // @req REQ-117
  it("lifts the chosen target above the middle of the stage when a bottom sheet is open", () => {
    const chosen = target(20, -10);
    const placement = placeTargetOnSphere(
      chosen,
      poseForTarget(chosen, biasForPanel("bottom"))
    );

    expect(placement.topPercent).toBeLessThan(50);
    expect(placement.leftPercent).toBeCloseTo(50, 4);
  });

  // @req REQ-117
  it("pushes the chosen target left of the middle of the stage when a side panel is open", () => {
    const chosen = target(20, -10);
    const placement = placeTargetOnSphere(
      chosen,
      poseForTarget(chosen, biasForPanel("side"))
    );

    expect(placement.leftPercent).toBeLessThan(50);
    expect(placement.topPercent).toBeCloseTo(50, 4);
  });

  // @req REQ-117
  it("reports a target on the far side of the sphere as not facing the reader, so it can be hidden", () => {
    const chosen = target(0, 0);
    const pose = poseForTarget(chosen, NO_BIAS);
    const antipode = target(180, 0);

    expect(placeTargetOnSphere(chosen, pose).facingReader).toBe(true);
    expect(placeTargetOnSphere(antipode, pose).facingReader).toBe(false);
  });

  // @req REQ-117
  it("compresses the horizontal axis by the stage aspect, matching what the shader draws", () => {
    const eastward = target(10, 0);
    const squareStage = placeTargetOnSphere(eastward, IDLE_POSE, 1);
    const wideStage = placeTargetOnSphere(eastward, IDLE_POSE, 2);

    // A wider stage pushes the same point closer to the centre horizontally.
    expect(Math.abs(wideStage.leftPercent - 50)).toBeLessThan(
      Math.abs(squareStage.leftPercent - 50)
    );
  });
});

describe("the non-WebGL fallback's geometry (REQ-117 AC5)", () => {
  // @req REQ-117
  it("leaves the basemap untransformed while nothing is chosen", () => {
    expect(basemapTransform(IDLE_POSE, null)).toBe("translate(0 0) scale(1)");
  });

  // @req REQ-117
  it("pans and scales so the chosen target lands exactly where the sphere would have put it", () => {
    const chosen = target(20, -10);
    const pose = poseForTarget(chosen, biasForPanel("bottom"));

    const onBasemap = placeTargetOnBasemap(chosen, pose, chosen.center);
    const onSphere = placeTargetOnSphere(chosen, pose);

    expect(onBasemap.leftPercent).toBeCloseTo(onSphere.leftPercent, 4);
    expect(onBasemap.topPercent).toBeCloseTo(onSphere.topPercent, 4);
  });

  // @req REQ-117
  it("obeys the side panel's bias too, so the fallback hides the subject no more than the globe does", () => {
    const chosen = target(20, -10);
    const pose = poseForTarget(chosen, biasForPanel("side"));

    expect(
      placeTargetOnBasemap(chosen, pose, chosen.center).leftPercent
    ).toBeLessThan(50);
  });

  // @req REQ-117
  it("moves the markers and the basemap under one and the same transform", () => {
    const chosen = target(20, -10);
    const neighbour = target(24, -12);
    const pose = poseForTarget(chosen, biasForPanel("side"));

    // The neighbour lies east and south of the subject; a shared transform
    // preserves that, whereas two drifting transforms would not.
    const subject = placeTargetOnBasemap(chosen, pose, chosen.center);
    const other = placeTargetOnBasemap(neighbour, pose, chosen.center);

    expect(other.leftPercent).toBeGreaterThan(subject.leftPercent);
    expect(other.topPercent).toBeGreaterThan(subject.topPercent);
  });

  // @req REQ-117
  it("treats every point of a flat map as facing the reader, since it has no far side", () => {
    expect(
      placeTargetOnBasemap(target(180, 0), IDLE_POSE, null).facingReader
    ).toBe(true);
  });
});

describe("STAGE_ASPECT", () => {
  // @req REQ-117
  it("matches the fixed aspect ratio the globe stage is laid out at", () => {
    expect(STAGE_ASPECT).toBeCloseTo(800 / 758, 6);
  });
});
