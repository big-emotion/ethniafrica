import { describe, expect, it } from "vitest";
import { getAdmin0Rings } from "@/lib/atlas/overlays";
import type { Ring } from "@/lib/atlas/overlays";
import { greatCircleKm, mercatorInflation, ringArea } from "../sphericalArea";

/** Largest ring of a country's admin-0 outline — the mainland, not its islands. */
function mainlandRing(countryId: string): Ring {
  const rings = getAdmin0Rings(countryId);
  expect(rings.length).toBeGreaterThan(0);
  return rings.reduce((largest, ring) =>
    ring.length > largest.length ? ring : largest
  );
}

/**
 * Reference areas in km², from the UN Statistics Division country profiles.
 * The admin-0 outlines are simplified for display, so a 15 % band is the
 * honest tolerance here — the game compares magnitudes, it does not survey.
 */
const REFERENCE_AREA_KM2: Record<string, number> = {
  DZA: 2_381_741,
  COD: 2_344_858,
  SDN: 1_861_484,
  LBY: 1_759_540,
  TCD: 1_284_000,
};

describe("ringArea", () => {
  // @req REQ-120
  it("returns zero for a degenerate ring", () => {
    expect(ringArea([])).toBe(0);
    expect(
      ringArea([
        { lon: 0, lat: 0 },
        { lon: 1, lat: 0 },
      ])
    ).toBe(0);
  });

  // @req REQ-120
  it("is sign-independent: a ring wound the other way has the same area", () => {
    const ring = mainlandRing("TCD");
    const reversed = [...ring].reverse();
    expect(ringArea(reversed)).toBeCloseTo(ringArea(ring), 0);
  });

  // @req REQ-120
  it.each(Object.entries(REFERENCE_AREA_KM2))(
    "matches the published area of %s within 15 percent",
    (countryId, referenceKm2) => {
      const measured = ringArea(mainlandRing(countryId));
      expect(measured / referenceKm2).toBeGreaterThan(0.85);
      expect(measured / referenceKm2).toBeLessThan(1.15);
    }
  );

  // The whole point of the Mercator game: Algeria is genuinely larger than
  // Chad, and no projection changes that.
  // @req REQ-120
  it("orders two countries by true area, not by their drawn extent", () => {
    expect(ringArea(mainlandRing("DZA"))).toBeGreaterThan(
      ringArea(mainlandRing("TCD"))
    );
  });
});

describe("mercatorInflation", () => {
  // @req REQ-120
  it("barely inflates a ring sitting on the equator", () => {
    const equatorial: Ring = [
      { lon: 0, lat: -1 },
      { lon: 2, lat: -1 },
      { lon: 2, lat: 1 },
      { lon: 0, lat: 1 },
    ];
    expect(mercatorInflation(equatorial)).toBeCloseTo(1, 1);
  });

  // @req REQ-120
  it("inflates more the further a ring sits from the equator", () => {
    const nordic: Ring = [
      { lon: 0, lat: 59 },
      { lon: 2, lat: 59 },
      { lon: 2, lat: 61 },
      { lon: 0, lat: 61 },
    ];
    const sahel: Ring = [
      { lon: 0, lat: 14 },
      { lon: 2, lat: 14 },
      { lon: 2, lat: 16 },
      { lon: 0, lat: 16 },
    ];
    expect(mercatorInflation(nordic)).toBeGreaterThan(mercatorInflation(sahel));
    expect(mercatorInflation(sahel)).toBeGreaterThan(1);
  });

  // sec(60°) = 2, so a shape at 60° N is drawn four times its true area.
  // @req REQ-120
  it("reports the secant-squared factor at sixty degrees", () => {
    const ring: Ring = [
      { lon: 0, lat: 59.5 },
      { lon: 1, lat: 59.5 },
      { lon: 1, lat: 60.5 },
      { lon: 0, lat: 60.5 },
    ];
    expect(mercatorInflation(ring)).toBeCloseTo(4, 0);
  });

  // @req REQ-120
  it("never reports an inflation below one", () => {
    for (const countryId of ["DZA", "COD", "ZAF", "TCD"]) {
      expect(mercatorInflation(mainlandRing(countryId))).toBeGreaterThanOrEqual(
        1
      );
    }
  });
});

/**
 * Reference distances in km, computed on the WGS-84 authalic sphere the
 * module uses. They are round-trip checks on the formula, not survey data:
 * a great circle between two points is exact arithmetic, unlike the areas
 * above which rest on simplified outlines.
 */
describe("greatCircleKm", () => {
  const PARIS = { lon: 2.3522, lat: 48.8566 };
  const MOSCOW = { lon: 37.6173, lat: 55.7558 };
  const KINSHASA = { lon: 15.2663, lat: -4.4419 };
  const GOMA = { lon: 29.2336, lat: -1.6794 };

  // @req REQ-120
  it("returns zero between a point and itself", () => {
    expect(greatCircleKm(PARIS, PARIS)).toBe(0);
  });

  // @req REQ-120
  it("is symmetric", () => {
    expect(greatCircleKm(PARIS, MOSCOW)).toBeCloseTo(
      greatCircleKm(MOSCOW, PARIS),
      6
    );
  });

  // A quarter of a great circle: half of pi times the radius, over two.
  // @req REQ-120
  it("spans a quarter of the sphere from the equator to a pole", () => {
    const quarter = (Math.PI / 2) * 6371.0088;
    expect(greatCircleKm({ lon: 0, lat: 0 }, { lon: 0, lat: 90 })).toBeCloseTo(
      quarter,
      0
    );
  });

  // The published air distance is 2 486 km, and this is the pair the brief
  // that prompted this module got wrong — Kinshasa–Goma was said to equal
  // it and is in fact two thirds of it.
  // @req REQ-120
  it("matches the published Paris–Moscow distance", () => {
    expect(greatCircleKm(PARIS, MOSCOW)).toBeGreaterThan(2450);
    expect(greatCircleKm(PARIS, MOSCOW)).toBeLessThan(2520);
  });

  // @req REQ-120
  it("puts Kinshasa–Goma well short of Paris–Moscow", () => {
    expect(greatCircleKm(KINSHASA, GOMA)).toBeLessThan(
      greatCircleKm(PARIS, MOSCOW) * 0.7
    );
  });
});
