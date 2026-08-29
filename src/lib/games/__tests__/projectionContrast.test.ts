import { describe, expect, it } from "vitest";

import {
  buildProjectionContrast,
  layoutContrastSilhouettes,
  type ContrastPair,
} from "@/lib/games/projectionContrast";
import type { CountryId } from "@/types/afrik";

/** The ids are what these cases are about; the display labels are not. */
function pairOf(ids: {
  inflatedId: string;
  understatedId: string;
}): ContrastPair {
  return {
    inflatedId: ids.inflatedId,
    understatedId: ids.understatedId as CountryId,
    inflatedLabelFr: ids.inflatedId,
    understatedLabelFr: ids.understatedId,
    inflatedArticledFr: ids.inflatedId,
    understatedArticledFr: ids.understatedId,
  };
}

/**
 * Area enclosed by an emitted path, measured back off the string the browser
 * will actually draw. Going through the artifact rather than the numbers
 * behind it is the point: a scale factor slipped in anywhere between the
 * projection and the `d` attribute would be invisible to any other check.
 */
function pathArea(pathD: string): number {
  return pathD
    .split("Z")
    .filter((segment) => segment.trim().length > 0)
    .reduce((total, segment) => {
      const points = [...segment.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(
        (match) => ({ x: Number(match[1]), y: Number(match[2]) })
      );
      let twiceArea = 0;
      for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        twiceArea += current.x * next.y - next.x * current.y;
      }
      return total + Math.abs(twiceArea) / 2;
    }, 0);
}

describe("buildProjectionContrast — the Jouer hub's counter-fact (REQ-120)", () => {
  // The scene's whole assertion, in the only direction that makes it one:
  // the map shows the reader the opposite of what the sphere measures.
  // @req REQ-120
  it("states a claim the map gets backwards", () => {
    const contrast = buildProjectionContrast();

    expect(contrast).not.toBeNull();
    expect(contrast.inflated.nameFr).toBe("Groenland");
    expect(contrast.understated.nameFr).toBe(
      "République démocratique du Congo"
    );

    // Truly smaller, drawn larger. Both halves are the claim.
    expect(contrast.understated.trueAreaKm2).toBeGreaterThan(
      contrast.inflated.trueAreaKm2
    );
    expect(contrast.inflated.drawnAreaKm2).toBeGreaterThan(
      contrast.understated.drawnAreaKm2
    );
  });

  // Greenland is the chosen example precisely because the factor is absurd;
  // a pair inflated by 15% would state the same thing and convince nobody.
  // @req REQ-120
  it("measures an inflation large enough to be worth showing", () => {
    const contrast = buildProjectionContrast();

    expect(contrast.inflated.inflation).toBeGreaterThan(10);
    expect(contrast.understated.inflation).toBeLessThan(1.05);
  });

  // The percentage the scene prints is derived, never typed by hand — an
  // editor changing the copy cannot make the page assert a different gap
  // than the one the asset holds.
  // @req REQ-120
  it("derives the true advantage from the measured areas", () => {
    const contrast = buildProjectionContrast();
    const expected =
      (contrast.understated.trueAreaKm2 / contrast.inflated.trueAreaKm2 - 1) *
      100;

    expect(contrast.trueAdvantagePercent).toBeCloseTo(expected, 6);
    expect(contrast.trueAdvantagePercent).toBeGreaterThan(2);
  });

  // Same discipline as the mercator round, and for the same reason: below
  // the threshold the two areas are indistinguishable at the asset's own
  // precision, so asserting an order would be stating noise as a fact.
  // @req REQ-120
  it("refuses a pair the projection does not actually mislead about", () => {
    // Algeria is drawn larger than Chad and really is larger — nothing is
    // reversed, so there is no counter-fact to state.
    expect(
      buildProjectionContrast(
        pairOf({ inflatedId: "DZA", understatedId: "TCD" })
      )
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null rather than a half-measured shape for an unknown id", () => {
    expect(
      buildProjectionContrast(
        pairOf({ inflatedId: "ZZZ", understatedId: "COD" })
      )
    ).toBeNull();
    expect(
      buildProjectionContrast(
        pairOf({ inflatedId: "GRL", understatedId: "ZZZ" })
      )
    ).toBeNull();
  });

  // The silhouettes come back in kilometres on one shared scale, which is
  // what lets the scene draw them side by side without rescaling either.
  // @req REQ-120
  it("hands back both silhouettes in the same units", () => {
    const contrast = buildProjectionContrast();

    for (const shape of [contrast.inflated, contrast.understated]) {
      expect(shape.outline.length).toBeGreaterThan(0);

      const xs = shape.outline.flat().map((point) => point.x);
      const spanKm = Math.max(...xs) - Math.min(...xs);
      // Both countries are between 1 000 and 3 000 km across; anything
      // outside that means the units slipped.
      expect(spanKm).toBeGreaterThan(1000);
      expect(spanKm).toBeLessThan(3000);
    }
  });
});

describe("layoutContrastSilhouettes — a drawing that cannot lie (REQ-114)", () => {
  // The scene's argument is that a projection misrepresents relative area,
  // so the illustration carrying it must not. This measures the emitted
  // paths, which is the only check that would catch a shape being nudged to
  // fit its box.
  // @req REQ-114 @req REQ-120
  it("draws both shapes at one scale, in their true area ratio", () => {
    const contrast = buildProjectionContrast();
    const silhouettes = layoutContrastSilhouettes(contrast);

    const drawnRatio =
      pathArea(silhouettes.understated.pathD) /
      pathArea(silhouettes.inflated.pathD);
    const trueRatio =
      contrast.understated.trueAreaKm2 / contrast.inflated.trueAreaKm2;

    expect(drawnRatio / trueRatio).toBeGreaterThan(0.98);
    expect(drawnRatio / trueRatio).toBeLessThan(1.02);
  });

  // The two silhouettes must not overlap, or the reader cannot see either
  // one whole and the comparison the scene rests on stops being available.
  // @req REQ-114
  it("keeps the two silhouettes apart, each carrying its own name", () => {
    const silhouettes = layoutContrastSilhouettes(buildProjectionContrast());

    expect(silhouettes.inflated.labelFr).toBe("Groenland");
    expect(silhouettes.understated.labelFr).toBe("RD Congo");

    const xsOf = (pathD: string) =>
      [...pathD.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((match) =>
        Number(match[1])
      );

    expect(Math.min(...xsOf(silhouettes.understated.pathD))).toBeGreaterThan(
      Math.max(...xsOf(silhouettes.inflated.pathD))
    );
  });

  // @req REQ-114
  it("frames a viewBox that holds both shapes whole", () => {
    const silhouettes = layoutContrastSilhouettes(buildProjectionContrast());
    const [, , width, height] = silhouettes.viewBox.split(" ").map(Number);

    const coordinates = [
      ...silhouettes.inflated.pathD.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g),
      ...silhouettes.understated.pathD.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g),
    ];

    for (const match of coordinates) {
      expect(Number(match[1])).toBeGreaterThanOrEqual(0);
      expect(Number(match[1])).toBeLessThanOrEqual(width);
      expect(Number(match[2])).toBeGreaterThanOrEqual(0);
      expect(Number(match[2])).toBeLessThanOrEqual(height);
    }
  });
});
