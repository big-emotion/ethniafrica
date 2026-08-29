import { describe, expect, it } from "vitest";

import {
  EQUAL_AREA_BLEND,
  MERCATOR_BLEND,
  TISSOT_RADIUS_DEG,
  areaInflationAt,
  projectMorph,
  ringToPath,
  tissotIndicatrices,
  worldLandmassRings,
} from "@/lib/atlas/projectionMorph";
import { planarRingArea } from "@/lib/atlas/equalAreaProjection";
import { getAfricaAdmin0Rings } from "@/lib/atlas/overlays";

/** Area a ring encloses once projected at the given blend. */
function projectedArea(
  ring: { lon: number; lat: number }[],
  blend: number
): number {
  return planarRingArea(
    ring.map((point) => projectMorph(point.lon, point.lat, blend))
  );
}

describe("projectMorph — what flattening costs (REQ-120)", () => {
  // Mercator is truthful on the equator and nowhere else. Both ends of the
  // slider agree there, which is why the morph reads as the north pulling
  // away rather than as the whole map sliding.
  // @req REQ-120
  it("agrees with the equal-area projection at the equator", () => {
    const flat = projectMorph(30, 0, EQUAL_AREA_BLEND);
    const mercator = projectMorph(30, 0, MERCATOR_BLEND);

    expect(mercator.x).toBeCloseTo(flat.x, 6);
    expect(mercator.y).toBeCloseTo(flat.y, 6);
  });

  // @req REQ-120
  it("keeps longitude untouched, so only north–south spacing moves", () => {
    for (const blend of [0, 0.5, 1]) {
      expect(projectMorph(-140, 55, blend).x).toBeCloseTo(-140, 6);
    }
  });

  // @req REQ-120
  it("pushes the far north further out the more Mercator it gets", () => {
    const northAt = (blend: number) => Math.abs(projectMorph(0, 70, blend).y);

    expect(northAt(0.5)).toBeGreaterThan(northAt(EQUAL_AREA_BLEND));
    expect(northAt(MERCATOR_BLEND)).toBeGreaterThan(northAt(0.5));
  });
});

describe("areaInflationAt — the readout under the slider (REQ-120)", () => {
  // The closed form has to agree with the indicatrices drawn beside it, or
  // the page states one number and shows another.
  // @req REQ-120
  it("matches the ballooning the indicatrices actually show", () => {
    const circles = tissotIndicatrices();
    const equator = circles.find((circle) => circle.centreLat === 0);
    const north = circles.find((circle) => circle.centreLat === 60);

    const drawnRatio =
      projectedArea(north.ring, MERCATOR_BLEND) /
      projectedArea(equator.ring, MERCATOR_BLEND);

    expect(areaInflationAt(60, MERCATOR_BLEND)).toBeCloseTo(drawnRatio, 0);
  });

  // @req REQ-120
  it("reports no distortion anywhere on the equal-area end", () => {
    for (const latitude of [0, 30, 60, 80]) {
      expect(areaInflationAt(latitude, EQUAL_AREA_BLEND)).toBeCloseTo(1, 6);
    }
  });

  // @req REQ-120
  it("grows with latitude and with the blend, and never below true size", () => {
    expect(areaInflationAt(60, MERCATOR_BLEND)).toBeGreaterThan(
      areaInflationAt(30, MERCATOR_BLEND)
    );
    expect(areaInflationAt(60, MERCATOR_BLEND)).toBeGreaterThan(
      areaInflationAt(60, 0.5)
    );
    expect(areaInflationAt(0, MERCATOR_BLEND)).toBeCloseTo(1, 6);
  });
});

describe("tissotIndicatrices — the lie, measured (REQ-120)", () => {
  // Every indicatrix covers the same ground. That is the whole device: they
  // are equal on the sphere, so any difference the reader sees on the map is
  // the projection's, not the world's.
  // @req REQ-120
  it("draws circles that all cover the same area on the equal-area map", () => {
    const areas = tissotIndicatrices().map((circle) =>
      projectedArea(circle.ring, EQUAL_AREA_BLEND)
    );

    const smallest = Math.min(...areas);
    const largest = Math.max(...areas);
    expect(largest / smallest).toBeLessThan(1.05);
  });

  // The same circles on Mercator: the northern ones balloon, which is the
  // sentence the page is making, expressed as geometry rather than as copy.
  // @req REQ-120
  it("balloons the same circles toward the poles on Mercator", () => {
    const circles = tissotIndicatrices();
    const atEquator = circles.filter((circle) => circle.centreLat === 0);
    const farNorth = circles.filter((circle) => circle.centreLat === 60);

    expect(atEquator.length).toBeGreaterThan(0);
    expect(farNorth.length).toBeGreaterThan(0);

    const equatorArea = projectedArea(atEquator[0].ring, MERCATOR_BLEND);
    const northArea = projectedArea(farNorth[0].ring, MERCATOR_BLEND);

    // sec²(60°) = 4. Anything near 1 would mean the indicatrices are drawn
    // in the projection rather than on the sphere, which teaches nothing.
    expect(northArea / equatorArea).toBeGreaterThan(3.5);
    expect(northArea / equatorArea).toBeLessThan(4.5);
  });

  // @req REQ-120
  it("spaces the indicatrices over both hemispheres", () => {
    const lats = new Set(tissotIndicatrices().map((c) => c.centreLat));

    expect(Math.min(...lats)).toBeLessThan(0);
    expect(Math.max(...lats)).toBeGreaterThan(0);
    expect(TISSOT_RADIUS_DEG).toBeGreaterThan(0);
  });
});

describe("worldLandmassRings — the committed silhouette, back in lon/lat (REQ-120)", () => {
  // The asset is stored in equirectangular texture pixels because that is
  // what paints the globe. The slider needs geography, so it is read back
  // rather than a second world outline being committed beside it.
  // @req REQ-120
  it("reads the committed world path back into plausible coordinates", () => {
    const rings = worldLandmassRings();

    expect(rings.length).toBeGreaterThan(10);

    const points = rings.flat();
    expect(Math.min(...points.map((p) => p.lon))).toBeGreaterThanOrEqual(-180);
    expect(Math.max(...points.map((p) => p.lon))).toBeLessThanOrEqual(180);
    expect(Math.min(...points.map((p) => p.lat))).toBeGreaterThanOrEqual(-90);
    expect(Math.max(...points.map((p) => p.lat))).toBeLessThanOrEqual(90);
  });

  // The world path deliberately excludes Africa, so the two assets together
  // are one planet. Drawing only the first would leave a hole where the
  // continent this atlas is about should be.
  // @req REQ-116
  it("completes the planet with the African rings the world path omits", () => {
    const africa = getAfricaAdmin0Rings();

    expect(africa.length).toBeGreaterThan(50);

    const points = africa.flat();
    expect(Math.min(...points.map((p) => p.lat))).toBeLessThan(-30);
    expect(Math.max(...points.map((p) => p.lat))).toBeGreaterThan(35);
  });

  // @req REQ-120
  it("emits a closed path a browser can draw", () => {
    const path = ringToPath(
      [
        { lon: 0, lat: 0 },
        { lon: 10, lat: 0 },
        { lon: 10, lat: 10 },
      ],
      MERCATOR_BLEND
    );

    expect(path.startsWith("M")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path).toContain("L");
  });
});
