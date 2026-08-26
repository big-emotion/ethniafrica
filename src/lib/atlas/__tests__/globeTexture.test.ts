import { beforeAll, describe, expect, it } from "vitest";

import {
  GLOBE_TEXTURE_SIZE,
  GRATICULE_STEP_DEGREES,
  TISSOT_LATITUDE_LIMIT,
  TISSOT_RADIUS_DEGREES,
  TISSOT_SPACING_DEGREES,
  buildGraticule,
  geodesicCircle,
  landmassTransform,
  lonToTextureX,
  latToTextureY,
  paintGlobeTexture,
  tissotCentres,
  type GlobePalette,
} from "@/lib/atlas/globeTexture";
import { AFRICA_GEO_BOUNDS, BASEMAP_VIEWBOX } from "@/lib/atlas/projection";

const palette: GlobePalette = {
  ocean: "#120e0a",
  graticule: "#42341f",
  graticuleMajor: "#5d4a2e",
  land: "#6b4a22",
  coast: "#e8b96a",
  equator: "#7a8ce8",
  tissot: "rgba(51,163,144,0.30)",
  tissotEdge: "#33a390",
};

describe("globeTexture — equirectangular world texture (REQ-112)", () => {
  // @req REQ-112
  it("maps the whole world onto the texture, not just Africa's bounds", () => {
    expect(lonToTextureX(-180)).toBe(0);
    expect(lonToTextureX(180)).toBe(GLOBE_TEXTURE_SIZE.width);
    expect(lonToTextureX(0)).toBe(GLOBE_TEXTURE_SIZE.width / 2);

    expect(latToTextureY(90)).toBe(0);
    expect(latToTextureY(-90)).toBe(GLOBE_TEXTURE_SIZE.height);
    expect(latToTextureY(0)).toBe(GLOBE_TEXTURE_SIZE.height / 2);
  });

  // @req REQ-112
  it("draws a meridian and a parallel every 15 degrees", () => {
    const { meridians, parallels } = buildGraticule();

    expect(GRATICULE_STEP_DEGREES).toBe(15);
    expect(meridians.map((m) => m.lon)).toContain(0);
    expect(meridians.map((m) => m.lon)).toContain(-180);
    expect(meridians).toHaveLength(360 / GRATICULE_STEP_DEGREES + 1);
    expect(parallels.map((p) => p.lat)).toContain(0);
  });

  // A meridian every 90° carries the quarters of the globe, so it is drawn
  // heavier than the ones that only subdivide them.
  // @req REQ-112
  it("marks the quarter meridians and the equator apart from the rest", () => {
    const { meridians, parallels } = buildGraticule();

    expect(meridians.find((m) => m.lon === 90)?.major).toBe(true);
    expect(meridians.find((m) => m.lon === 15)?.major).toBe(false);
    expect(parallels.find((p) => p.lat === 0)?.equator).toBe(true);
    expect(parallels.find((p) => p.lat === 15)?.equator).toBe(false);
  });

  // The committed basemap path is drawn in its own 800x758 viewBox, so it
  // has to be placed into the world texture at Africa's real bounds or the
  // continent would sit in the wrong ocean.
  // @req REQ-112
  it("places the committed basemap path at Africa's real geographic bounds", () => {
    const transform = landmassTransform();

    expect(transform.translateX).toBeCloseTo(
      lonToTextureX(AFRICA_GEO_BOUNDS.lonMin)
    );
    expect(transform.translateY).toBeCloseTo(
      latToTextureY(AFRICA_GEO_BOUNDS.latMax)
    );
    expect(transform.scaleX).toBeCloseTo(
      (lonToTextureX(AFRICA_GEO_BOUNDS.lonMax) -
        lonToTextureX(AFRICA_GEO_BOUNDS.lonMin)) /
        BASEMAP_VIEWBOX.width
    );
    expect(transform.scaleY).toBeCloseTo(
      (latToTextureY(AFRICA_GEO_BOUNDS.latMin) -
        latToTextureY(AFRICA_GEO_BOUNDS.latMax)) /
        BASEMAP_VIEWBOX.height
    );
  });
});

describe("Tissot indicatrices — the equal-area argument (REQ-112)", () => {
  // Every disc has to cover the same real area, or the demonstration is
  // just decoration: this is what makes the flat view's swelling readable
  // as distortion rather than as different-sized markers.
  // @req REQ-112
  it("places one disc every 30 degrees, stopping short of the poles", () => {
    const centres = tissotCentres();
    const lats = [...new Set(centres.map((c) => c.lat))].sort((a, b) => a - b);

    expect(TISSOT_SPACING_DEGREES).toBe(30);
    expect(lats[0]).toBe(-TISSOT_LATITUDE_LIMIT);
    expect(lats.at(-1)).toBe(TISSOT_LATITUDE_LIMIT);
    expect(centres).toHaveLength(lats.length * (360 / TISSOT_SPACING_DEGREES));
  });

  // @req REQ-112
  it("traces a closed ring at a constant angular radius from its centre", () => {
    const centre = { lon: 10, lat: 20 };
    const ring = geodesicCircle(centre, TISSOT_RADIUS_DEGREES, 36);

    const angularDistance = ({ lon, lat }: { lon: number; lat: number }) => {
      const toRad = Math.PI / 180;
      return (
        Math.acos(
          Math.sin(centre.lat * toRad) * Math.sin(lat * toRad) +
            Math.cos(centre.lat * toRad) *
              Math.cos(lat * toRad) *
              Math.cos((lon - centre.lon) * toRad)
        ) / toRad
      );
    };

    for (const point of ring) {
      expect(angularDistance(point)).toBeCloseTo(TISSOT_RADIUS_DEGREES, 4);
    }
    expect(ring[0].lat).toBeCloseTo(ring.at(-1)!.lat, 6);
  });

  // Equal angular radius at every latitude is exactly what equal true area
  // means on a sphere — a disc at 60° is no smaller than one at the equator.
  // @req REQ-112
  it("keeps a polar disc the same true size as an equatorial one", () => {
    const equator = geodesicCircle({ lon: 0, lat: 0 }, TISSOT_RADIUS_DEGREES);
    const high = geodesicCircle({ lon: 0, lat: 60 }, TISSOT_RADIUS_DEGREES);

    const latitudeSpan = (ring: { lat: number }[]) =>
      Math.max(...ring.map((p) => p.lat)) - Math.min(...ring.map((p) => p.lat));

    expect(latitudeSpan(high)).toBeCloseTo(latitudeSpan(equator), 3);
  });

  // @req REQ-112
  it("wraps a disc that straddles the antimeridian back into range", () => {
    const ring = geodesicCircle({ lon: 180, lat: 0 }, TISSOT_RADIUS_DEGREES);

    for (const { lon } of ring) {
      expect(lon).toBeGreaterThanOrEqual(-180);
      expect(lon).toBeLessThan(180);
    }
  });
});

/** Records the drawing calls a 2D context receives, in order. */
function recordingContext() {
  const calls: string[] = [];
  const fillStyles: string[] = [];
  const strokeStyles: string[] = [];

  const ctx = {
    canvas: { width: 0, height: 0 },
    set fillStyle(value: string) {
      fillStyles.push(value);
    },
    set strokeStyle(value: string) {
      strokeStyles.push(value);
    },
    lineWidth: 0,
    fillRect: () => calls.push("fillRect"),
    beginPath: () => calls.push("beginPath"),
    closePath: () => calls.push("closePath"),
    moveTo: () => calls.push("moveTo"),
    lineTo: () => calls.push("lineTo"),
    stroke: () => calls.push("stroke"),
    fill: () => calls.push("fill"),
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    translate: () => calls.push("translate"),
    scale: () => calls.push("scale"),
  };

  return { ctx, calls, fillStyles, strokeStyles };
}

describe("paintGlobeTexture — the painted result (REQ-112)", () => {
  // happy-dom ships no Path2D; every browser has had it since 2015, so
  // the shim stands in for the environment rather than for the code.
  beforeAll(() => {
    if (typeof globalThis.Path2D === "undefined") {
      globalThis.Path2D = class {
        constructor(readonly d?: string) {}
      } as unknown as typeof Path2D;
    }
  });

  // @req REQ-112
  it("lays the ocean down before anything is drawn on top of it", () => {
    const { ctx, calls, fillStyles } = recordingContext();

    paintGlobeTexture(ctx as unknown as CanvasRenderingContext2D, palette);

    expect(calls[0]).toBe("fillRect");
    expect(fillStyles[0]).toBe(palette.ocean);
  });

  // @req REQ-112
  it("paints every palette colour it was given", () => {
    const { ctx, fillStyles, strokeStyles } = recordingContext();

    paintGlobeTexture(ctx as unknown as CanvasRenderingContext2D, palette);

    expect(fillStyles).toContain(palette.ocean);
    expect(fillStyles).toContain(palette.land);
    expect(strokeStyles).toContain(palette.graticule);
    expect(strokeStyles).toContain(palette.graticuleMajor);
    expect(strokeStyles).toContain(palette.equator);
    expect(strokeStyles).toContain(palette.coast);
  });

  // The landmass is drawn under a transform; leaving it applied would drag
  // every later draw call into Africa's local coordinates.
  // @req REQ-112
  it("leaves the indicatrices off unless they are asked for", () => {
    const { ctx, fillStyles } = recordingContext();

    paintGlobeTexture(ctx as unknown as CanvasRenderingContext2D, palette);

    expect(fillStyles).not.toContain(palette.tissot);
  });

  // @req REQ-112
  it("draws the indicatrices over the terrain, never under it", () => {
    const { ctx, fillStyles, strokeStyles } = recordingContext();

    paintGlobeTexture(ctx as unknown as CanvasRenderingContext2D, palette, {
      showTissot: true,
    });

    expect(fillStyles).toContain(palette.tissot);
    expect(strokeStyles).toContain(palette.tissotEdge);
    expect(fillStyles.lastIndexOf(palette.tissot)).toBeGreaterThan(
      fillStyles.lastIndexOf(palette.land)
    );
  });

  // @req REQ-112
  it("restores the canvas transform after placing the landmass", () => {
    const { ctx, calls } = recordingContext();

    paintGlobeTexture(ctx as unknown as CanvasRenderingContext2D, palette);

    expect(calls.filter((c) => c === "save")).toHaveLength(
      calls.filter((c) => c === "restore").length
    );
    expect(calls.lastIndexOf("restore")).toBeGreaterThan(
      calls.lastIndexOf("translate")
    );
  });
});
