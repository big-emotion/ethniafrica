import { describe, expect, it } from "vitest";

import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";
import type { LonLat, Ring } from "@/lib/atlas/overlays";
import { triangulateRing } from "../ringTriangulation";

/**
 * An arrow-head: the notch at the top makes the ring concave, which is the
 * shape a centroid fan cannot tile — its triangles fold back over the interior
 * and paint it twice.
 */
const arrow: Ring = [
  { lon: 0, lat: 0 },
  { lon: 4, lat: 0 },
  { lon: 4, lat: 4 },
  { lon: 2, lat: 1 },
  { lon: 0, lat: 4 },
];

function signedArea(points: LonLat[]): number {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    total += a.lon * b.lat - b.lon * a.lat;
  }
  return total / 2;
}

function cross(origin: LonLat, a: LonLat, b: LonLat): number {
  return (
    (a.lon - origin.lon) * (b.lat - origin.lat) -
    (a.lat - origin.lat) * (b.lon - origin.lon)
  );
}

function triangleAreas(vertices: LonLat[]): number[] {
  const areas: number[] = [];
  for (let i = 0; i < vertices.length; i += 3) {
    areas.push(signedArea(vertices.slice(i, i + 3)));
  }
  return areas;
}

describe("triangulateRing", () => {
  // @req REQ-116
  it("emits whole triangles", () => {
    expect(triangulateRing(arrow).length % 3).toBe(0);
  });

  // A fan over a concave ring emits triangles of both windings: the reversed
  // ones lie on top of the polygon rather than beside it, so the fill is drawn
  // twice there and, at the overlay's partial opacity, reads as bright slivers.
  // @req REQ-116
  it("winds every triangle the same way as the ring itself", () => {
    const areas = triangleAreas(triangulateRing(arrow));
    expect(areas.length).toBeGreaterThan(0);
    expect(areas.every((area) => area > 0)).toBe(true);
  });

  // The property the eye actually checks: the triangles tile the ring — they
  // cover all of it, none of it twice, and nothing outside it.
  // @req REQ-116
  it("covers the ring exactly once", () => {
    const covered = triangleAreas(triangulateRing(arrow)).reduce(
      (sum, area) => sum + area,
      0
    );
    expect(covered).toBeCloseTo(Math.abs(signedArea(arrow)), 9);
  });

  // @req REQ-116
  it("tiles a clockwise ring exactly once too", () => {
    const reversed = [...arrow].reverse();
    const areas = triangleAreas(triangulateRing(reversed));
    expect(areas.every((area) => area < 0)).toBe(true);
    const covered = areas.reduce((sum, area) => sum + Math.abs(area), 0);
    expect(covered).toBeCloseTo(Math.abs(signedArea(reversed)), 9);
  });

  // @req REQ-116
  it("refuses to emit a triangle for a degenerate ring", () => {
    expect(
      triangulateRing([
        { lon: 0, lat: 0 },
        { lon: 1, lat: 1 },
      ])
    ).toEqual([]);
  });

  /**
   * Sudan's committed outline crosses itself once, near the Chad/CAR corner,
   * where the simplification that produced the asset folded two segments over
   * each other. A self-crossing ring has no unambiguous interior, so no tiling
   * of it can be exact — the triangles still must not overlap, which is the
   * property that shows on screen.
   */
  const selfIntersectingRings = new Set(["SDN#0"]);

  function everyCommittedRing(): { id: string; ring: Ring }[] {
    return Object.entries(AFRICA_ADMIN0).flatMap(([countryId, country]) =>
      country.rings.map((coordinates, index) => ({
        id: `${countryId}#${index}`,
        ring: coordinates.map(([lon, lat]) => ({ lon, lat })),
      }))
    );
  }

  // The regression that started this: every real African outline is concave
  // somewhere, so every one of them was being double-painted by the fan.
  // @req REQ-116
  it("never reverses a triangle on any committed African outline", () => {
    const offenders = everyCommittedRing()
      .filter(({ ring }) => signedArea(ring) !== 0)
      .filter(({ ring }) => {
        const windings = triangleAreas(triangulateRing(ring)).map(Math.sign);
        return new Set(windings).size !== 1;
      })
      .map(({ id }) => id);

    expect(offenders).toEqual([]);
  });

  // @req REQ-116
  it("covers every committed African outline exactly once", () => {
    const offenders = everyCommittedRing()
      .filter(({ id }) => !selfIntersectingRings.has(id))
      .filter(({ ring }) => signedArea(ring) !== 0)
      .filter(({ ring }) => {
        const expected = Math.abs(signedArea(ring));
        const covered = triangleAreas(triangulateRing(ring)).reduce(
          (sum, area) => sum + Math.abs(area),
          0
        );
        return Math.abs(covered - expected) > expected * 1e-6;
      })
      .map(({ id }) => id);

    expect(offenders).toEqual([]);
  });

  /**
   * How many triangles cover the most-covered point of the ring, sampled on a
   * grid. This is the defect as the eye meets it: a point under two triangles
   * is blended twice, and at the overlay's fill opacity that reads as a bright
   * streak. Points landing on a shared edge count for neither triangle, so a
   * clean tiling scores exactly 1.
   */
  function deepestCoverage(ring: Ring, samplesPerAxis = 120): number {
    const vertices = triangulateRing(ring);
    const lons = ring.map((p) => p.lon);
    const lats = ring.map((p) => p.lat);
    const minLon = Math.min(...lons);
    const minLat = Math.min(...lats);
    const stepLon = (Math.max(...lons) - minLon) / samplesPerAxis;
    const stepLat = (Math.max(...lats) - minLat) / samplesPerAxis;

    let deepest = 0;
    for (let x = 0; x <= samplesPerAxis; x++) {
      for (let y = 0; y <= samplesPerAxis; y++) {
        // Half-step offset keeps the grid off the round lon/lat values the
        // outlines themselves sit on, where edge ties would mask an overlap.
        const point = {
          lon: minLon + (x + 0.5) * stepLon,
          lat: minLat + (y + 0.5) * stepLat,
        };

        let depth = 0;
        for (let i = 0; i < vertices.length; i += 3) {
          const [a, b, c] = vertices.slice(i, i + 3);
          const ab = cross(a, b, point);
          const bc = cross(b, c, point);
          const ca = cross(c, a, point);
          if ((ab > 0 && bc > 0 && ca > 0) || (ab < 0 && bc < 0 && ca < 0)) {
            depth++;
          }
        }
        deepest = Math.max(deepest, depth);
      }
    }
    return deepest;
  }

  // ZAF is the outline the bright streaks were first seen on.
  // @req REQ-116
  it("never paints a point of ZAF twice", () => {
    const ring: Ring = AFRICA_ADMIN0.ZAF.rings[0].map(([lon, lat]) => ({
      lon,
      lat,
    }));
    expect(deepestCoverage(ring)).toBe(1);
  });

  // Even where the committed geometry crosses itself, the triangles must not
  // stack — the crossing may cost a scrap of area, never a doubled sliver.
  // @req REQ-116
  it("never paints a point of the self-crossing outline twice", () => {
    const ring: Ring = AFRICA_ADMIN0.SDN.rings[0].map(([lon, lat]) => ({
      lon,
      lat,
    }));
    expect(deepestCoverage(ring)).toBe(1);
  });
});
