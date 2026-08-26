import { describe, expect, it } from "vitest";

import {
  IDLE_POSE,
  MAX_ZOOM,
  MIN_ZOOM,
  advanceYaw,
  interpolatePose,
  poseForTarget,
  shortestYawDelta,
  zoomForAngularSpan,
} from "../camera";
import {
  buildRotationMatrix,
  lonLatToSphere,
  rotateSpherePoint,
} from "../projection";
import type { AtlasTarget } from "../targets";

const target = (
  lon: number,
  lat: number,
  angularSpanDeg = 12
): AtlasTarget => ({
  countryId: "TST",
  nameFr: "Pays d'essai",
  center: { lon, lat },
  angularSpanDeg,
});

/** Where the target actually lands on screen once the pose is applied, in clip space. */
function renderTarget(
  pose: ReturnType<typeof poseForTarget>,
  lon: number,
  lat: number
) {
  const rotated = rotateSpherePoint(
    buildRotationMatrix(pose.yaw, pose.pitch),
    lonLatToSphere(lon, lat)
  );
  return {
    x: rotated.x * pose.zoom + pose.offsetX,
    y: rotated.y * pose.zoom + pose.offsetY,
    z: rotated.z,
  };
}

describe("poseForTarget (REQ-117 AC1)", () => {
  // @req REQ-117
  it("turns the globe so the chosen target faces the reader", () => {
    const rendered = renderTarget(
      poseForTarget(target(25, -18), { offsetX: 0, offsetY: 0 }),
      25,
      -18
    );

    expect(rendered.x).toBeCloseTo(0, 5);
    expect(rendered.y).toBeCloseTo(0, 5);
    // Facing the reader means the near side of the sphere, never the far one.
    expect(rendered.z).toBeCloseTo(1, 5);
  });

  // @req REQ-117
  it("faces a target on the far side of the sphere just as squarely", () => {
    const rendered = renderTarget(
      poseForTarget(target(-170, 40), { offsetX: 0, offsetY: 0 }),
      -170,
      40
    );

    expect(rendered.x).toBeCloseTo(0, 5);
    expect(rendered.y).toBeCloseTo(0, 5);
    expect(rendered.z).toBeCloseTo(1, 5);
  });

  // @req REQ-117
  it("carries the panel bias into the pose, so the subject settles off-centre by exactly that much", () => {
    const rendered = renderTarget(
      poseForTarget(target(10, 5), { offsetX: -0.38, offsetY: 0 }),
      10,
      5
    );

    expect(rendered.x).toBeCloseTo(-0.38, 5);
    expect(rendered.y).toBeCloseTo(0, 5);
  });
});

describe("zoomForAngularSpan (REQ-117 AC1)", () => {
  // @req REQ-117
  it("dollies in further for a small country than for a wide one", () => {
    expect(zoomForAngularSpan(4)).toBeGreaterThan(zoomForAngularSpan(40));
  });

  // @req REQ-117
  it("never dollies past the bounds that keep the surrounding continent readable", () => {
    expect(zoomForAngularSpan(0.01)).toBeLessThanOrEqual(MAX_ZOOM);
    expect(zoomForAngularSpan(180)).toBeGreaterThanOrEqual(MIN_ZOOM);
  });

  // @req REQ-117
  it("treats a degenerate span as a bounded dolly rather than an infinite one", () => {
    expect(Number.isFinite(zoomForAngularSpan(0))).toBe(true);
    expect(zoomForAngularSpan(0)).toBeLessThanOrEqual(MAX_ZOOM);
  });
});

describe("shortestYawDelta (REQ-117 AC1)", () => {
  // @req REQ-117
  it("takes the short way round rather than crossing the whole globe", () => {
    const nearlyFullTurn = 1.9 * Math.PI;
    expect(shortestYawDelta(0, nearlyFullTurn)).toBeCloseTo(-0.1 * Math.PI, 5);
  });

  // @req REQ-117
  it("leaves a delta that is already the short way round untouched", () => {
    expect(shortestYawDelta(0, 0.4)).toBeCloseTo(0.4, 5);
  });

  // @req REQ-117
  it("never returns a traversal longer than half a turn", () => {
    for (const to of [-9, -3, -1, 0, 1, 3, 9]) {
      expect(Math.abs(shortestYawDelta(0.7, to))).toBeLessThanOrEqual(
        Math.PI + 1e-9
      );
    }
  });
});

describe("interpolatePose (REQ-117 AC4)", () => {
  const from = IDLE_POSE;
  const to = poseForTarget(target(30, -10), { offsetX: 0, offsetY: 0.45 });

  // @req REQ-117
  it("starts on the departure pose and ends on the destination pose", () => {
    expect(interpolatePose(from, to, 0)).toEqual(from);
    expect(interpolatePose(from, to, 1)).toEqual(to);
  });

  // @req REQ-117
  it("clamps beyond the ends instead of overshooting the destination", () => {
    expect(interpolatePose(from, to, 1.4)).toEqual(to);
    expect(interpolatePose(from, to, -0.4)).toEqual(from);
  });

  // @req REQ-117
  it("travels in yaw along the shorter path, never the long way round", () => {
    const eastward = { ...IDLE_POSE, yaw: 0 };
    const westward = { ...IDLE_POSE, yaw: 1.9 * Math.PI };
    // Halfway along the short path is a small negative yaw, not ~3 radians.
    expect(interpolatePose(eastward, westward, 0.5).yaw).toBeCloseTo(
      -0.05 * Math.PI,
      5
    );
  });
});

describe("advanceYaw (REQ-117 AC1)", () => {
  // @req REQ-117
  it("keeps the idle rotation inside one turn so a long-lived globe never accumulates an unbounded yaw", () => {
    expect(advanceYaw(2 * Math.PI - 0.05, 0.1)).toBeCloseTo(0.05, 5);
    expect(Math.abs(advanceYaw(1_000, 0))).toBeLessThanOrEqual(2 * Math.PI);
  });
});
