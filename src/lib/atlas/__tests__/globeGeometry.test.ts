import { describe, expect, it } from "vitest";

import type { Ring } from "@/lib/atlas/overlays";

import {
  buildPointField,
  buildRingFan,
  buildRingLineLoop,
} from "../globeGeometry";

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
});
