export type Point = readonly [x: number, y: number];
export type ContinentDot = readonly [x: number, y: number, phase: number];

// @req REQ-091
export const AFRICA: readonly Point[] = [
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
];

// @req REQ-091
export const MADA: readonly Point[] = [
  [0.8, 0.615],
  [0.845, 0.6],
  [0.86, 0.65],
  [0.835, 0.735],
  [0.795, 0.72],
  [0.79, 0.665],
];

// @req REQ-091
export const CONTINENT_GRID_STEP = 0.016;

// @req REQ-091
export function inPoly(p: Point, poly: readonly Point[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j];
    if (
      yi > p[1] !== yj > p[1] &&
      p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi
    )
      c = !c;
  }
  return c;
}

// @req REQ-091
export function africaDots(
  step = CONTINENT_GRID_STEP,
  random: () => number = Math.random
): ContinentDot[] {
  const dots: ContinentDot[] = [];
  for (let y = 0; y <= 1; y += step)
    for (let x = 0; x <= 1; x += step) {
      if (inPoly([x, y], AFRICA) || inPoly([x, y], MADA))
        dots.push([x, y, random() * Math.PI * 2]);
    }
  return dots;
}
