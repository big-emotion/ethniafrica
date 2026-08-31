import { describe, expect, it } from "vitest";

import { FLAT_MORPH, IDLE_POSE, SPHERE_MORPH, poseForTarget } from "../camera";
import { fitScale } from "../sphereLayer";
import {
  AFRICA_GEO_BOUNDS,
  buildRotationMatrix,
  lonLatToSphere,
  rotateSpherePoint,
} from "../projection";
import { lonLatToFlat } from "../sphereMesh";
import { NO_BIAS, biasForPanel } from "../panelBias";
import {
  STAGE_ASPECT,
  basemapTransform,
  nearestFacingTarget,
  placeTargetOnBasemap,
  placeTargetOnSphere,
  spaceOutMarks,
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

  /**
   * The continent scene never flies, so its focus is null forever — and the
   * unfocused branch used to be a flat identity, which discarded the dolly
   * along with the pan. The reader could press the zoom control all they
   * liked: the map, and every marker on it, stayed exactly where it was.
   */
  // @req REQ-117
  it("magnifies an unchosen map about its own centre rather than ignoring the dolly", () => {
    const dollied = { ...IDLE_POSE, zoom: 2 };

    expect(basemapTransform(dollied, null)).not.toBe(
      basemapTransform(IDLE_POSE, null)
    );
    expect(basemapTransform(dollied, null)).toContain("scale(2)");
  });

  // @req REQ-117
  it("carries the unchosen markers with the map they stand on", () => {
    const eastern = target(30, 0);
    const dollied = { ...IDLE_POSE, zoom: 2 };

    const atRest = placeTargetOnBasemap(eastern, IDLE_POSE, null);
    const magnified = placeTargetOnBasemap(eastern, dollied, null);

    // East of the map's centre, so magnifying about that centre sends it
    // further right — the same way the shapes under it move.
    expect(atRest.leftPercent).toBeGreaterThan(50);
    expect(magnified.leftPercent).toBeGreaterThan(atRest.leftPercent);
  });
});

describe("placeTargetOnBasemap — the band the map is letterboxed into", () => {
  /**
   * The stage is a fixed band: 1512x520 on a laptop, a ratio of 2.9 against
   * the basemap's 1.06. The map is centred inside it and leaves night ground
   * on either side, so a marker positioned as a percentage *of the stage* has
   * to walk that same letterbox — otherwise it lands where the map is not.
   */
  const LAPTOP_STAGE_ASPECT = 1512 / 520;

  // @req REQ-117
  it("holds the middle of the map at the middle of the band, at every ratio", () => {
    /** The lon/lat the committed asset draws at the middle of its viewBox. */
    const middle = target(
      (AFRICA_GEO_BOUNDS.lonMin + AFRICA_GEO_BOUNDS.lonMax) / 2,
      (AFRICA_GEO_BOUNDS.latMin + AFRICA_GEO_BOUNDS.latMax) / 2
    );

    for (const aspect of [LAPTOP_STAGE_ASPECT, 1, 0.5, STAGE_ASPECT]) {
      const placed = placeTargetOnBasemap(middle, IDLE_POSE, null, aspect);

      expect(placed.leftPercent).toBeCloseTo(50, 6);
      expect(placed.topPercent).toBeCloseTo(50, 6);
    }
  });

  // @req REQ-117
  it("pulls markers inward on a band wider than the map, and never past its edges", () => {
    const west = target(-17, 14);

    const onBand = placeTargetOnBasemap(
      west,
      IDLE_POSE,
      null,
      LAPTOP_STAGE_ASPECT
    );
    const onSquare = placeTargetOnBasemap(west, IDLE_POSE, null, STAGE_ASPECT);

    // The map covers 1.06/2.9 = 36% of a laptop band's width, so a point left
    // of centre sits much closer to the middle than it does on the map itself.
    expect(onBand.leftPercent).toBeGreaterThan(onSquare.leftPercent);
    expect(onBand.leftPercent).toBeGreaterThan(0);
    expect(onBand.leftPercent).toBeLessThan(100);

    // A wide band is height-limited, so the vertical mapping is untouched.
    expect(onBand.topPercent).toBeCloseTo(onSquare.topPercent, 6);
  });

  // @req REQ-117
  it("mirrors the slack onto the vertical axis when the band is taller than the map", () => {
    const north = target(10, 30);

    const onTallBand = placeTargetOnBasemap(north, IDLE_POSE, null, 0.5);
    const onSquare = placeTargetOnBasemap(north, IDLE_POSE, null, STAGE_ASPECT);

    expect(onTallBand.leftPercent).toBeCloseTo(onSquare.leftPercent, 6);
    expect(onTallBand.topPercent).toBeGreaterThan(onSquare.topPercent);
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

/**
 * The continent scene draws a radial field for twelve countries and offers all
 * fifty-four. Fifty-four pastilles at 430px overlap into noise and the small
 * ones stop being hittable, which is the density rule the charter states — so
 * the stage itself carries the other forty-two: a tap picks the country whose
 * centre it lands nearest.
 */
describe("nearestFacingTarget (REQ-117)", () => {
  const placed = (
    countryId: string,
    leftPercent: number,
    topPercent: number,
    facingReader = true
  ) => ({ countryId, placement: { leftPercent, topPercent, facingReader } });

  // @req REQ-117
  it("picks the country whose centre the tap lands nearest", () => {
    const chosen = nearestFacingTarget(
      [placed("GHA", 30, 50), placed("KEN", 70, 50)],
      34,
      50,
      1
    );

    expect(chosen).toBe("GHA");
  });

  // A country with no radial field of its own is reachable by exactly the same
  // tap as one that has one — that is the whole point of hit-testing the stage
  // rather than the pastilles.
  // @req REQ-117
  it("reaches a country that carries no marker", () => {
    const chosen = nearestFacingTarget([placed("LSO", 55, 80)], 56, 81, 1);

    expect(chosen).toBe("LSO");
  });

  // The far side of a turned globe is behind the sphere. Letting it win a tap
  // would select a country the reader cannot see.
  // @req REQ-117
  it("ignores a country facing away from the reader", () => {
    const chosen = nearestFacingTarget(
      [placed("BRA", 40, 50, false), placed("KEN", 48, 50)],
      41,
      50,
      1
    );

    expect(chosen).toBe("KEN");
  });

  // @req REQ-117
  it("declines a tap that lands near nothing rather than selecting the least far", () => {
    expect(nearestFacingTarget([placed("GHA", 10, 10)], 90, 90, 1)).toBeNull();
  });

  // The stage is far wider than it is tall, so a percentage point down covers
  // less ground than one across. On a stage four times wider than tall, the
  // country four points above a tap is nearer than the one three points beside
  // it — read as raw percentages the ranking inverts, and the tap resolves to
  // the country the reader did not aim at.
  // @req REQ-117
  it("measures distance on the stage's real proportions", () => {
    const candidates = [placed("NORTH", 50, 46), placed("EAST", 53, 50)];

    expect(nearestFacingTarget(candidates, 50, 50, 4)).toBe("NORTH");
    // Square stage: the same two countries, and now the raw percentages hold.
    expect(nearestFacingTarget(candidates, 50, 50, 1)).toBe("EAST");
  });
});

describe("spaceOutMarks (REQ-117 AC4)", () => {
  const mark = (
    countryId: string,
    leftPercent: number,
    topPercent: number,
    facingReader = true
  ) => ({ countryId, placement: { leftPercent, topPercent, facingReader } });

  const idsOf = (marks: { countryId: string }[]) =>
    marks.map((kept) => kept.countryId);

  // Every documented country is choosable, so every one of them earns a mark
  // the moment the stage has room for it. Nothing here caps the count.
  // @req REQ-117
  it("keeps every mark the stage has room for", () => {
    const marks = [
      mark("NGA", 20, 50),
      mark("KEN", 60, 50),
      mark("ZAF", 50, 85),
    ];

    expect(idsOf(spaceOutMarks(marks, 2, 1))).toEqual(["NGA", "KEN", "ZAF"]);
  });

  // Two marks closer than their own diameter read as one smudge, and the
  // smaller country loses its name to its neighbour's.
  // @req REQ-117
  it("drops a mark that would land on one already kept", () => {
    const marks = [mark("GHA", 30, 50), mark("TGO", 30.5, 50)];

    expect(idsOf(spaceOutMarks(marks, 2, 1))).toEqual(["GHA"]);
  });

  // The caller hands the marks in the order it wants collisions resolved, so a
  // collision costs the later country, never the earlier one.
  // @req REQ-117
  it("resolves a collision in favour of the mark handed in first", () => {
    const marks = [mark("TGO", 30.5, 50), mark("GHA", 30, 50)];

    expect(idsOf(spaceOutMarks(marks, 2, 1))).toEqual(["TGO"]);
  });

  // A mark behind the sphere names ground the reader cannot see. It is dropped
  // rather than dimmed: unlike a target marker it is inert, so nothing reaches
  // it by keyboard and dimming would only add noise over the far limb.
  // @req REQ-117
  it("drops a mark on the far side of the sphere", () => {
    const marks = [mark("BRA", 20, 50, false), mark("KEN", 60, 50)];

    expect(idsOf(spaceOutMarks(marks, 2, 1))).toEqual(["KEN"]);
  });

  // Same footing as the hit-test: on a stage four times wider than tall, four
  // points down cover the ground one point across does. Read as raw
  // percentages, a vertical pair reads as a collision it is not.
  // @req REQ-117
  it("measures separation on the stage's real proportions", () => {
    const stacked = [mark("NORTH", 50, 48), mark("SOUTH", 50, 52)];

    expect(idsOf(spaceOutMarks(stacked, 2, 4))).toEqual(["NORTH"]);
    expect(idsOf(spaceOutMarks(stacked, 2, 1))).toEqual(["NORTH", "SOUTH"]);
  });
});
