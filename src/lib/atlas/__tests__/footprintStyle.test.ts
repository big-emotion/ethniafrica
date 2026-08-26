import { describe, expect, it } from "vitest";
import {
  FOOTPRINT_DASH_ARRAY,
  FOOTPRINT_FILL_OPACITY_DIMMED,
  FOOTPRINT_FILL_OPACITY_MIN,
  FOOTPRINT_STROKE_OPACITY,
  FOOTPRINT_STROKE_OPACITY_DIMMED,
  footprintDashRepeats,
  footprintFillOpacity,
  footprintRevealEase,
  footprintStrokeOpacity,
  ringPerimeterDeg,
} from "@/lib/atlas/footprintStyle";
import { getAdmin0Rings, type Ring } from "@/lib/atlas/overlays";

const square: Ring = [
  { lon: 0, lat: 0 },
  { lon: 2, lat: 0 },
  { lon: 2, lat: 2 },
  { lon: 0, lat: 2 },
];

describe("footprintFillOpacity", () => {
  // @req REQ-116
  it("ramps from the floor to the ceiling across the weight range", () => {
    expect(footprintFillOpacity({ weight: 0, dimmed: false })).toBeCloseTo(
      0.16
    );
    expect(footprintFillOpacity({ weight: 1, dimmed: false })).toBeCloseTo(
      0.62
    );
    expect(footprintFillOpacity({ weight: 0.5, dimmed: false })).toBeCloseTo(
      0.39
    );
  });

  // @req REQ-116
  it("never lets a country of the footprint reach zero", () => {
    // A country with one member people is still a country the family reaches.
    // Fading it out entirely would delete the claim the footprint exists to
    // make.
    expect(
      footprintFillOpacity({ weight: 0, dimmed: false })
    ).toBeGreaterThanOrEqual(FOOTPRINT_FILL_OPACITY_MIN);
    expect(
      footprintFillOpacity({ weight: 0, dimmed: true })
    ).toBeGreaterThanOrEqual(FOOTPRINT_FILL_OPACITY_DIMMED);
  });

  // @req REQ-116
  it("clamps a weight outside 0..1 instead of extrapolating", () => {
    expect(footprintFillOpacity({ weight: 4, dimmed: false })).toBeCloseTo(
      0.62
    );
    expect(footprintFillOpacity({ weight: -1, dimmed: false })).toBeCloseTo(
      0.16
    );
  });

  // @req REQ-116
  it("drops a dimmed country below the floor of an undimmed one", () => {
    // Dimming has to be legible as a state change at every weight, including
    // the lightest, or focusing a country would leave the map looking the same.
    expect(FOOTPRINT_FILL_OPACITY_DIMMED).toBeLessThan(
      FOOTPRINT_FILL_OPACITY_MIN
    );
  });
});

describe("footprintStrokeOpacity", () => {
  // @req REQ-116
  it("recedes when another country holds the focus", () => {
    expect(footprintStrokeOpacity(false)).toBe(FOOTPRINT_STROKE_OPACITY);
    expect(footprintStrokeOpacity(true)).toBe(FOOTPRINT_STROKE_OPACITY_DIMMED);
    expect(footprintStrokeOpacity(true)).toBeLessThan(
      footprintStrokeOpacity(false)
    );
  });
});

describe("footprintRevealEase", () => {
  // @req REQ-116
  it("starts at nothing, ends complete, and decelerates", () => {
    expect(footprintRevealEase(0)).toBe(0);
    expect(footprintRevealEase(1)).toBe(1);
    // Past the halfway point in time, well past it in distance — that is what
    // makes the trace read as drawn rather than wiped.
    expect(footprintRevealEase(0.5)).toBeGreaterThan(0.5);
  });

  // @req REQ-116
  it("clamps rather than overshooting", () => {
    expect(footprintRevealEase(-1)).toBe(0);
    expect(footprintRevealEase(2)).toBe(1);
  });
});

describe("footprintDashRepeats", () => {
  // @req REQ-116
  it("measures a ring's perimeter with longitude scaled by latitude", () => {
    // A 2°×2° box on the equator is very nearly 8° around; the same box at 60°
    // north is narrower on the ground, so its perimeter must come out smaller.
    expect(ringPerimeterDeg(square)).toBeCloseTo(8, 1);
    const northern = square.map((p) => ({ lon: p.lon, lat: p.lat + 58 }));
    expect(ringPerimeterDeg(northern)).toBeLessThan(ringPerimeterDeg(square));
  });

  // @req REQ-116
  it("gives a longer boundary more dashes, so the dash reads the same size everywhere", () => {
    // The shader dashes by repeats-per-ring. A constant would make one dash on
    // a small country cover as much of its outline as several do on a large
    // one, and the two would stop reading as the same encoding.
    const nigeria = getAdmin0Rings("NGA")![0];
    const togo = getAdmin0Rings("TGO")![0];
    expect(ringPerimeterDeg(nigeria)).toBeGreaterThan(ringPerimeterDeg(togo));
    expect(footprintDashRepeats(nigeria)).toBeGreaterThan(
      footprintDashRepeats(togo)
    );
  });

  // @req REQ-116
  it("keeps the dash cycle a near-constant length whatever the country", () => {
    const perRepeat = (iso: string) => {
      const ring = getAdmin0Rings(iso)![0];
      return ringPerimeterDeg(ring) / footprintDashRepeats(ring);
    };
    // Not exactly equal: repeats are whole, so rounding costs up to half a
    // cycle, and half a cycle is a larger share of a small country's few
    // repeats. Within 15% of each other is the property that matters — the
    // dash reads as one encoding across the footprint rather than as a
    // different texture per country.
    const ratio = perRepeat("NGA") / perRepeat("TGO");
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(1.15);
  });

  // @req REQ-116
  it("never returns zero repeats, which would draw a solid boundary", () => {
    // A solid line would say "declared border" — the one thing the footprint
    // must never claim.
    expect(footprintDashRepeats([])).toBeGreaterThanOrEqual(1);
    expect(
      footprintDashRepeats([
        { lon: 0, lat: 0 },
        { lon: 0.001, lat: 0 },
      ])
    ).toBeGreaterThanOrEqual(1);
  });

  // @req REQ-116
  it("states the fallback dash in the basemap's own frame", () => {
    expect(FOOTPRINT_DASH_ARRAY).toBe("9 7");
  });
});
