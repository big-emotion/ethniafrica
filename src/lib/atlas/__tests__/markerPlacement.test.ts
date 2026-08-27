import { describe, expect, it } from "vitest";

import { FLAT_MORPH, IDLE_POSE, SPHERE_MORPH, poseForTarget } from "../camera";
import { fitScale } from "../sphereLayer";
import {
  buildRotationMatrix,
  lonLatToSphere,
  rotateSpherePoint,
} from "../projection";
import { lonLatToFlat } from "../sphereMesh";
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

  /**
   * The stage is wider than it is tall — 1512x520 on a laptop — and every
   * assertion above it fixes the *chosen* target, whose rotated position is
   * (0, 0, 1). Nought divided by any aspect and scaled by any factor is still
   * nought, so those cases hold whatever arithmetic this function performs.
   * An unchosen target is what actually exercises it, and is what a people
   * fiche opens on: nothing is chosen, so its one marker is unchosen.
   */
  // @req REQ-117
  it("puts an unchosen target where the shader draws that ground, on the stage's real aspect", () => {
    const stageAspect = 1512 / 520;
    // Ethiopia's centroid, the single presence country of PPL_AARI.
    const ethiopia = target(39.6, 8.6);

    const placement = placeTargetOnSphere(ethiopia, IDLE_POSE, stageAspect);

    // Recomputed here the way the vertex shader does it, so the two cannot
    // drift apart silently: scale, then divide x by the aspect, then dolly
    // and offset.
    const rotated = rotateSpherePoint(
      buildRotationMatrix(IDLE_POSE.yaw, IDLE_POSE.pitch),
      lonLatToSphere(ethiopia.center.lon, ethiopia.center.lat)
    );
    const scale = fitScale(SPHERE_MORPH, stageAspect);
    const clipX =
      ((rotated.x * scale) / stageAspect) * IDLE_POSE.zoom + IDLE_POSE.offsetX;
    const clipY = rotated.y * scale * IDLE_POSE.zoom + IDLE_POSE.offsetY;

    expect(placement.leftPercent).toBeCloseTo((clipX + 1) * 50, 6);
    expect(placement.topPercent).toBeCloseTo((1 - clipY) * 50, 6);
  });

  /**
   * The sphere occupies the middle |x| <= 1/aspect of a wide stage, because
   * the shader divides x by the aspect. A marker outside that band is drawn
   * in the void beside the globe, naming ground the reader cannot see under
   * it — which is the state PPL_AARI shipped in.
   */
  // @req REQ-117
  it("keeps an unchosen target inside the disc the sphere occupies on a wide stage", () => {
    const stageAspect = 1512 / 520;
    const halfDiscPercent = (1 / stageAspect) * 50;

    for (const country of [
      target(39.6, 8.6),
      target(-15, 14),
      target(30, -25),
    ]) {
      const { leftPercent } = placeTargetOnSphere(
        country,
        IDLE_POSE,
        stageAspect
      );
      expect(Math.abs(leftPercent - 50)).toBeLessThanOrEqual(halfDiscPercent);
    }
  });

  /**
   * "Ce que la carte plate en fait" morphs the surface to the Mercator plane.
   * The markers ride the same morph or they hang over the sphere the reader
   * just left.
   */
  // @req REQ-117
  it("follows the surface through the morph, so a flattened map keeps its markers", () => {
    const stageAspect = 1512 / 520;
    const ethiopia = target(39.6, 8.6);
    const flatPose = { ...IDLE_POSE, morph: FLAT_MORPH };

    const placement = placeTargetOnSphere(ethiopia, flatPose, stageAspect);

    const flat = lonLatToFlat(ethiopia.center.lon, ethiopia.center.lat);
    const scale = fitScale(FLAT_MORPH, stageAspect);
    const clipX =
      ((flat.x * scale) / stageAspect) * flatPose.zoom + flatPose.offsetX;
    const clipY = flat.y * scale * flatPose.zoom + flatPose.offsetY;

    expect(placement.leftPercent).toBeCloseTo((clipX + 1) * 50, 6);
    expect(placement.topPercent).toBeCloseTo((1 - clipY) * 50, 6);
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
  /**
   * It is the basemap's ratio, and it is only a fall-back for the render
   * before the stage has been measured. The stage itself is full-width over a
   * fixed height, so its real ratio is a runtime fact and callers pass it in.
   */
  // @req REQ-117
  it("falls back to the basemap's own ratio until the stage has been measured", () => {
    expect(STAGE_ASPECT).toBeCloseTo(800 / 758, 6);
  });
});
