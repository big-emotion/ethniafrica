import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AFRICA_CENTER_LON,
  AFRICA_GEO_BOUNDS,
  BASEMAP_VIEWBOX,
  buildRotationMatrix,
  lonLatToSphere,
  projectLonLat,
  rotateSpherePoint,
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

describe("lonLatToSphere", () => {
  // @req REQ-112
  it("places lon 0 / lat 0 facing the camera at (0, 0, 1)", () => {
    const { x, y, z } = lonLatToSphere(0, 0);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(0, 10);
    expect(z).toBeCloseTo(1, 10);
  });

  // @req REQ-112
  it("places lon 90 / lat 0 on the +x side of the sphere", () => {
    const { x, y, z } = lonLatToSphere(90, 0);
    expect(x).toBeCloseTo(1, 10);
    expect(y).toBeCloseTo(0, 10);
    expect(z).toBeCloseTo(0, 10);
  });

  // @req REQ-112
  it("places lat 90 at the north pole (0, 1, 0) regardless of longitude", () => {
    const { x, y, z } = lonLatToSphere(37, 90);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(1, 10);
    expect(z).toBeCloseTo(0, 10);
  });

  // @req REQ-112
  it("always returns a unit-length vector", () => {
    const { x, y, z } = lonLatToSphere(-18, 24);
    expect(x * x + y * y + z * z).toBeCloseTo(1, 10);
  });
});

describe("AFRICA_CENTER_LON", () => {
  // @req REQ-112
  it("is the midpoint of the committed geographic bounds", () => {
    expect(AFRICA_CENTER_LON).toBe(
      (AFRICA_GEO_BOUNDS.lonMin + AFRICA_GEO_BOUNDS.lonMax) / 2
    );
  });
});

describe("buildRotationMatrix / rotateSpherePoint", () => {
  // @req REQ-112
  it("returns the identity matrix at yaw 0 / pitch 0", () => {
    const matrix = buildRotationMatrix(0, 0);
    const point = lonLatToSphere(12, 34);
    const rotated = rotateSpherePoint(matrix, point);

    expect(rotated.x).toBeCloseTo(point.x, 10);
    expect(rotated.y).toBeCloseTo(point.y, 10);
    expect(rotated.z).toBeCloseTo(point.z, 10);
  });

  // @req REQ-112
  it("rotating by -AFRICA_CENTER_LON faces Africa's centroid longitude to the camera (z = 1)", () => {
    const matrix = buildRotationMatrix(-AFRICA_CENTER_LON * (Math.PI / 180), 0);
    const point = lonLatToSphere(AFRICA_CENTER_LON, 0);
    const rotated = rotateSpherePoint(matrix, point);

    expect(rotated.x).toBeCloseTo(0, 10);
    expect(rotated.y).toBeCloseTo(0, 10);
    expect(rotated.z).toBeCloseTo(1, 10);
  });

  // @req REQ-112
  it("a positive pitch tilts a front-facing point toward -y", () => {
    const matrix = buildRotationMatrix(0, Math.PI / 2);
    const rotated = rotateSpherePoint(matrix, { x: 0, y: 0, z: 1 });

    expect(rotated.x).toBeCloseTo(0, 10);
    expect(rotated.y).toBeCloseTo(-1, 10);
    expect(rotated.z).toBeCloseTo(0, 10);
  });

  // @req REQ-112
  it("preserves vector length (rotation matrices are orthonormal)", () => {
    const matrix = buildRotationMatrix(0.7, -0.4);
    const point = lonLatToSphere(-40, 55);
    const { x, y, z } = rotateSpherePoint(matrix, point);

    expect(x * x + y * y + z * z).toBeCloseTo(1, 10);
  });
});
