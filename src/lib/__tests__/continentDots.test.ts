import { describe, expect, it } from "vitest";

import {
  AFRICA,
  CONTINENT_GRID_STEP,
  MADA,
  africaDots,
  inPoly,
} from "@/lib/continentDots";
import type { Point } from "@/lib/continentDots";

describe("continent dots", () => {
  // @req REQ-091
  it("samples a stable number of dots from the validated polygons", () => {
    const dots = africaDots(CONTINENT_GRID_STEP, () => 0.5);

    expect(AFRICA).toEqual([
      [0.38, 0.045],
      [0.46, 0.02],
      [0.52, 0.03],
      [0.6, 0.045],
      [0.68, 0.07],
      [0.735, 0.105],
      [0.76, 0.14],
      [0.79, 0.19],
      [0.83, 0.235],
      [0.885, 0.265],
      [0.95, 0.3],
      [0.9, 0.36],
      [0.82, 0.42],
      [0.735, 0.475],
      [0.705, 0.525],
      [0.68, 0.585],
      [0.665, 0.645],
      [0.63, 0.72],
      [0.585, 0.79],
      [0.545, 0.845],
      [0.475, 0.895],
      [0.435, 0.885],
      [0.4, 0.83],
      [0.385, 0.755],
      [0.395, 0.685],
      [0.41, 0.615],
      [0.425, 0.545],
      [0.43, 0.49],
      [0.4, 0.455],
      [0.355, 0.445],
      [0.3, 0.445],
      [0.245, 0.425],
      [0.185, 0.4],
      [0.13, 0.345],
      [0.085, 0.29],
      [0.09, 0.235],
      [0.115, 0.195],
      [0.155, 0.15],
      [0.2, 0.115],
      [0.27, 0.08],
      [0.33, 0.06],
    ]);
    expect(MADA).toEqual([
      [0.8, 0.615],
      [0.845, 0.6],
      [0.86, 0.65],
      [0.835, 0.735],
      [0.795, 0.72],
      [0.79, 0.665],
    ]);
    expect(dots).toHaveLength(1466);
    expect(dots.every(([, , phase]) => phase === Math.PI)).toBe(true);
  });

  // @req REQ-091
  it("keeps every sampled dot inside the mainland or Madagascar", () => {
    const dots = africaDots(CONTINENT_GRID_STEP, () => 0);

    expect(
      dots.every(([x, y]) => inPoly([x, y], AFRICA) || inPoly([x, y], MADA))
    ).toBe(true);
  });

  // @req REQ-091
  it("excludes a known outside point", () => {
    const outsidePoint: Point = [0, 0];
    const dots = africaDots(CONTINENT_GRID_STEP, () => 0);

    expect(inPoly(outsidePoint, AFRICA)).toBe(false);
    expect(inPoly(outsidePoint, MADA)).toBe(false);
    expect(
      dots.some(([x, y]) => x === outsidePoint[0] && y === outsidePoint[1])
    ).toBe(false);
  });
});
