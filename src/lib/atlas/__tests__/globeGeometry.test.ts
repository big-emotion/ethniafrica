import { describe, expect, it } from "vitest";

import type { Ring } from "@/lib/atlas/overlays";

import {
  buildPointField,
  buildRingFan,
  buildRingLineLoop,
} from "../globeGeometry";
import { lonLatToFlat } from "@/lib/atlas/sphereMesh";

const square: Ring = [
  { lon: 0, lat: 0 },
  { lon: 2, lat: 0 },
  { lon: 2, lat: 2 },
  { lon: 0, lat: 2 },
];

describe("buildRingLineLoop", () => {
  // @req REQ-116
  it("emits one vertex per ring point and starts the arc fraction at zero", () => {
    const geometry = buildRingLineLoop(square);
    expect(geometry.vertexCount).toBe(square.length);
    expect(geometry.positions).toHaveLength(square.length * 3);
    expect(geometry.arcFractions[0]).toBe(0);
  });

  // @req REQ-116
  it("increases the arc fraction monotonically around the ring", () => {
    const { arcFractions } = buildRingLineLoop(square);
    for (let i = 1; i < arcFractions.length; i++) {
      expect(arcFractions[i]).toBeGreaterThan(arcFractions[i - 1]);
    }
    // Every fraction stays within the closed ring's [0, 1) range — the
    // closing segment back to the first vertex is not itself a vertex.
    arcFractions.forEach((fraction) => {
      expect(fraction).toBeGreaterThanOrEqual(0);
      expect(fraction).toBeLessThan(1);
    });
  });
});

describe("buildRingFan", () => {
  // @req REQ-116
  it("emits the centroid, every ring vertex, and repeats the first vertex to close the fan", () => {
    const geometry = buildRingFan(square);
    expect(geometry.vertexCount).toBe(square.length + 2);
    expect(geometry.positions).toHaveLength((square.length + 2) * 3);
  });
});

describe("buildPointField", () => {
  // @req REQ-116
  it("carries one weighted point per area, with no line-capable geometry at all", () => {
    const geometry = buildPointField([
      { countryId: "NGA", center: { lon: 8, lat: 9 }, populationShare: 1 },
      { countryId: "BEN", center: { lon: 2, lat: 9 }, populationShare: 0.3 },
    ]);
    expect(geometry.vertexCount).toBe(2);
    expect(geometry.weights[0]).toBeCloseTo(1);
    expect(geometry.weights[1]).toBeCloseTo(0.3);
    expect(geometry.positions).toHaveLength(6);
  });

  // The terrain morphs between sphere and Mercator; a halo that stayed on the
  // sphere projection while the ground flattened would be marking a country
  // that is no longer under it. Both states ship per point, from the very
  // formula buildSphereMesh lays the plane with.
  // @req REQ-116
  it("carries the Mercator position of each point, from the same formula as the terrain", () => {
    const geometry = buildPointField([
      { countryId: "NGA", center: { lon: 8, lat: 9 }, populationShare: 1 },
    ]);
    const expected = lonLatToFlat(8, 9);

    expect(geometry.flatPositions).toHaveLength(3);
    expect(geometry.flatPositions[0]).toBeCloseTo(expected.x);
    expect(geometry.flatPositions[1]).toBeCloseTo(expected.y);
    expect(geometry.flatPositions[2]).toBe(0);
  });

  // Painted largest first, so the smallest presence lands on top and stays
  // readable. The weight buffer has to follow the same order as the positions.
  // @req REQ-116
  it("emits points largest-share first, weights and positions in step", () => {
    const geometry = buildPointField([
      { countryId: "TGO", center: { lon: 1, lat: 8 }, populationShare: 0.05 },
      { countryId: "NGA", center: { lon: 8, lat: 9 }, populationShare: 1 },
    ]);

    expect(geometry.weights[0]).toBeCloseTo(1);
    expect(geometry.weights[1]).toBeCloseTo(0.05);
    expect(geometry.flatPositions[0]).toBeCloseTo(lonLatToFlat(8, 9).x);
  });
});

describe("flat positions on ring geometry (REQ-112)", () => {
  // @req REQ-112
  it("emits one flat position per sphere position, on both ring geometries", () => {
    // The morph interpolates between the two arrays vertex by vertex, so a
    // mismatch in length would slide the boundary off the ground it outlines.
    const loop = buildRingLineLoop(square);
    expect(loop.flatPositions.length).toBe(loop.positions.length);

    const fan = buildRingFan(square);
    expect(fan.flatPositions.length).toBe(fan.positions.length);
  });

  // @req REQ-112
  it("places a ring vertex exactly where the ground puts that lon/lat", () => {
    // The one property that matters: the trace and the terrain under it agree
    // about where a coordinate lands on the flat map.
    const loop = buildRingLineLoop(square);
    const expected = lonLatToFlat(square[0].lon, square[0].lat);

    expect(loop.flatPositions[0]).toBeCloseTo(expected.x, 6);
    expect(loop.flatPositions[1]).toBeCloseTo(expected.y, 6);
    expect(loop.flatPositions[2]).toBeCloseTo(expected.z, 6);
  });

  // @req REQ-112
  it("keeps the flat plane flat", () => {
    const loop = buildRingLineLoop(square);
    for (let i = 2; i < loop.flatPositions.length; i += 3) {
      expect(loop.flatPositions[i]).toBe(0);
    }
  });
});
