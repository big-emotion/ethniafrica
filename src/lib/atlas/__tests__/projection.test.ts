import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AFRICA_GEO_BOUNDS,
  BASEMAP_VIEWBOX,
  projectLonLat,
} from "../projection";

describe("projectLonLat", () => {
  // @req REQ-101
  it("maps the north-west bound corner to the SVG origin", () => {
    expect(
      projectLonLat(
        AFRICA_GEO_BOUNDS.lonMin,
        AFRICA_GEO_BOUNDS.latMax,
        BASEMAP_VIEWBOX
      )
    ).toEqual({ x: 0, y: 0 });
  });

  // @req REQ-101
  it("maps the south-east bound corner to the SVG's far corner", () => {
    expect(
      projectLonLat(
        AFRICA_GEO_BOUNDS.lonMax,
        AFRICA_GEO_BOUNDS.latMin,
        BASEMAP_VIEWBOX
      )
    ).toEqual({ x: BASEMAP_VIEWBOX.width, y: BASEMAP_VIEWBOX.height });
  });

  // @req REQ-101
  it("maps the geographic centroid to the viewport centre", () => {
    const lon = (AFRICA_GEO_BOUNDS.lonMin + AFRICA_GEO_BOUNDS.lonMax) / 2;
    const lat = (AFRICA_GEO_BOUNDS.latMin + AFRICA_GEO_BOUNDS.latMax) / 2;
    const { x, y } = projectLonLat(lon, lat, BASEMAP_VIEWBOX);
    expect(x).toBeCloseTo(BASEMAP_VIEWBOX.width / 2, 5);
    expect(y).toBeCloseTo(BASEMAP_VIEWBOX.height / 2, 5);
  });

  // @req REQ-101
  it("scales linearly with the viewport — halving the viewport halves every coordinate", () => {
    const full = projectLonLat(10, 5, BASEMAP_VIEWBOX);
    const half = projectLonLat(10, 5, {
      width: BASEMAP_VIEWBOX.width / 2,
      height: BASEMAP_VIEWBOX.height / 2,
    });
    expect(half.x).toBeCloseTo(full.x / 2, 5);
    expect(half.y).toBeCloseTo(full.y / 2, 5);
  });

  // @req REQ-101
  it("projects a known reference point (Lagos, Nigeria) by the documented linear formula", () => {
    const lon = 3.3792;
    const lat = 6.5244;
    const expectedX =
      ((lon - AFRICA_GEO_BOUNDS.lonMin) /
        (AFRICA_GEO_BOUNDS.lonMax - AFRICA_GEO_BOUNDS.lonMin)) *
      BASEMAP_VIEWBOX.width;
    const expectedY =
      ((AFRICA_GEO_BOUNDS.latMax - lat) /
        (AFRICA_GEO_BOUNDS.latMax - AFRICA_GEO_BOUNDS.latMin)) *
      BASEMAP_VIEWBOX.height;

    expect(projectLonLat(lon, lat, BASEMAP_VIEWBOX)).toEqual({
      x: expectedX,
      y: expectedY,
    });
  });

  // @req REQ-101
  it("stays consistent with the committed basemap asset's viewBox", () => {
    const svgPath = join(
      process.cwd(),
      "src/lib/atlas/assets/africa-basemap.svg"
    );
    const svg = readFileSync(svgPath, "utf8");
    const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];

    expect(viewBox).toBe(
      `0 0 ${BASEMAP_VIEWBOX.width} ${BASEMAP_VIEWBOX.height}`
    );
  });

  // @req REQ-101
  it("keeps the bundler-safe path constant byte-identical to the committed SVG's path data", async () => {
    const svgPath = join(
      process.cwd(),
      "src/lib/atlas/assets/africa-basemap.svg"
    );
    const svg = readFileSync(svgPath, "utf8");
    const svgD = svg.match(/<path[^>]*\sd="([^"]+)"/)?.[1];

    const { AFRICA_LANDMASS_PATH } =
      await import("../assets/africaLandmassPath");

    expect(AFRICA_LANDMASS_PATH).toBe(svgD);
  });
});
