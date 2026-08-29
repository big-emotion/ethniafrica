import { describe, expect, it } from "vitest";

import { getAdmin0Rings, getWorldCompareRings } from "@/lib/atlas/overlays";
import { ringArea } from "@/lib/games/sphericalArea";
import {
  planarRingArea,
  projectEqualArea,
} from "@/lib/atlas/equalAreaProjection";
import type { Ring } from "@/lib/atlas/overlays";

/**
 * A cell far north, where a conformal projection is already visibly wrong,
 * and one on the equator, where it is not. Both are checked because a
 * projection that only holds near its centre would pass on the second alone.
 */
const NORTHERN_CELL: Ring = [
  { lon: -50, lat: 70 },
  { lon: -40, lat: 70 },
  { lon: -40, lat: 75 },
  { lon: -50, lat: 75 },
];

const EQUATORIAL_CELL: Ring = [
  { lon: 20, lat: -2 },
  { lon: 30, lat: -2 },
  { lon: 30, lat: 3 },
  { lon: 20, lat: 3 },
];

function projectedArea(ring: Ring): number {
  return planarRingArea(projectEqualArea(ring));
}

describe("projectEqualArea — silhouettes drawn at their real size (REQ-120)", () => {
  // The scene this feeds asserts that Mercator lies about area, so the
  // drawing carrying the assertion may not itself be drawn in a projection
  // that distorts area. This property is what makes the illustration a proof
  // rather than a picture.
  // @req REQ-120
  it("keeps a projected ring's area within 1% of its true spherical area", () => {
    for (const ring of [NORTHERN_CELL, EQUATORIAL_CELL]) {
      const ratio = projectedArea(ring) / ringArea(ring);
      expect(ratio).toBeGreaterThan(0.99);
      expect(ratio).toBeLessThan(1.01);
    }
  });

  // What the reader actually judges is the two silhouettes side by side, so
  // what has to survive projection is the ratio between them — the very
  // quantity Mercator gets wrong by a factor of eleven on this pair.
  // @req REQ-120
  it("preserves the area ratio between two shapes at different latitudes", () => {
    const greenland = getWorldCompareRings("GRL");
    const congo = getAdmin0Rings("COD");
    expect(greenland).toBeDefined();
    expect(congo).toBeDefined();

    const sum = (rings: Ring[], measure: (ring: Ring) => number) =>
      rings.reduce((total, ring) => total + measure(ring), 0);

    const trueRatio = sum(congo, ringArea) / sum(greenland, ringArea);
    const drawnRatio =
      sum(congo, projectedArea) / sum(greenland, projectedArea);

    expect(drawnRatio / trueRatio).toBeGreaterThan(0.98);
    expect(drawnRatio / trueRatio).toBeLessThan(1.02);
  });

  // Each shape is projected about its own centroid, so none is pushed out to
  // where a straight edge stops approximating the geodesic it stands for.
  // The tolerance is a fraction of the shape's own extent, not a distance:
  // what matters is "small compared to this country", not "small in km".
  // @req REQ-120
  it("centres each shape on itself rather than on a shared origin", () => {
    for (const ring of [NORTHERN_CELL, EQUATORIAL_CELL]) {
      const points = projectEqualArea(ring);
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);

      const offsetX = (Math.max(...xs) + Math.min(...xs)) / 2;
      const offsetY = (Math.max(...ys) + Math.min(...ys)) / 2;

      expect(Math.abs(offsetX)).toBeLessThan(
        (Math.max(...xs) - Math.min(...xs)) * 0.05
      );
      expect(Math.abs(offsetY)).toBeLessThan(
        (Math.max(...ys) - Math.min(...ys)) * 0.05
      );
    }
  });

  // @req REQ-120
  it("reports no area for a degenerate ring instead of dividing by zero", () => {
    expect(planarRingArea(projectEqualArea([]))).toBe(0);
    expect(planarRingArea(projectEqualArea([{ lon: 0, lat: 0 }]))).toBe(0);
  });
});
