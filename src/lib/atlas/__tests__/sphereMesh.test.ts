import { describe, expect, it } from "vitest";

import {
  SPHERE_MESH_SEGMENTS,
  buildSphereMesh,
  flatHalfExtent,
  mercatorY,
} from "@/lib/atlas/sphereMesh";
import { MERCATOR_LATITUDE_LIMIT } from "@/lib/atlas/globeTexture";

describe("sphereMesh — the morphable globe surface (REQ-112)", () => {
  // @req REQ-112
  it("places the equator at the origin and grows away from it", () => {
    expect(mercatorY(0)).toBeCloseTo(0);
    expect(mercatorY(45)).toBeGreaterThan(0);
    expect(mercatorY(-45)).toBeCloseTo(-mercatorY(45));
  });

  // This is the whole point of the flat view: Mercator inflates latitude
  // faster and faster, which is what the reader is being shown.
  // @req REQ-112
  it("stretches high latitudes further than the degrees they cover", () => {
    const lowBand = mercatorY(30) - mercatorY(0);
    const highBand = mercatorY(75) - mercatorY(45);

    expect(highBand).toBeGreaterThan(lowBand);
  });

  // @req REQ-112
  it("builds one vertex per grid node with matching attribute lengths", () => {
    const mesh = buildSphereMesh();
    const expected =
      (SPHERE_MESH_SEGMENTS.x + 1) * (SPHERE_MESH_SEGMENTS.y + 1);

    expect(mesh.vertexCount).toBe(expected);
    expect(mesh.spherePositions).toHaveLength(expected * 3);
    expect(mesh.flatPositions).toHaveLength(expected * 3);
    expect(mesh.uvs).toHaveLength(expected * 2);
  });

  // @req REQ-112
  it("keeps every sphere vertex on the unit sphere", () => {
    const { spherePositions, vertexCount } = buildSphereMesh();

    for (let i = 0; i < vertexCount; i += 97) {
      const x = spherePositions[i * 3];
      const y = spherePositions[i * 3 + 1];
      const z = spherePositions[i * 3 + 2];
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
    }
  });

  // @req REQ-112
  it("indexes two triangles per grid cell", () => {
    const { indices } = buildSphereMesh();
    const cells = SPHERE_MESH_SEGMENTS.x * SPHERE_MESH_SEGMENTS.y;

    expect(indices).toHaveLength(cells * 6);
    // reduce, not Math.max(...indices): the index buffer is 120k entries
    // and spreading it overflows the call stack.
    const highest = indices.reduce((max, index) => Math.max(max, index), 0);
    expect(highest).toBeLessThan(
      (SPHERE_MESH_SEGMENTS.x + 1) * (SPHERE_MESH_SEGMENTS.y + 1)
    );
  });

  // The texture is a whole-world equirectangular image, so u has to run
  // the full 0..1 across 360° or the continent would land off-position.
  // @req REQ-112
  it("spans the full texture in u and the mesh's latitude band in v", () => {
    const { uvs } = buildSphereMesh();
    const us = uvs.filter((_, i) => i % 2 === 0);
    const vs = uvs.filter((_, i) => i % 2 === 1);
    const lowest = (values: Float32Array) =>
      values.reduce((min, value) => Math.min(min, value), Infinity);
    const highest = (values: Float32Array) =>
      values.reduce((max, value) => Math.max(max, value), -Infinity);

    expect(lowest(us)).toBeCloseTo(0);
    expect(highest(us)).toBeCloseTo(1);
    expect(lowest(vs)).toBeCloseTo(0, 5);
    expect(highest(vs)).toBeCloseTo(1, 5);
  });

  // @req REQ-112
  it("reports a flat extent the camera can frame the whole map from", () => {
    const { halfWidth, halfHeight } = flatHalfExtent();

    expect(halfWidth).toBeCloseTo(Math.PI);
    expect(halfHeight).toBeCloseTo(mercatorY(MERCATOR_LATITUDE_LIMIT));
    expect(halfWidth).toBeGreaterThan(1);
  });
});

// The mesh reused the Mercator latitude limit for both states, so the
// sphere was a band from +80 to -80 with two open boundaries. The home
// globe pitches through +-1.1 rad, which is enough to bring them into
// view as holes. The plane still has to stop at the limit — Mercator runs
// away to infinity past it — so only the sphere closes.
describe("sphereMesh — closed at the poles (REQ-112)", () => {
  const GLOBE_RADIUS = 1;

  // @req REQ-112
  it("carries a vertex at each pole so the sphere has no open boundary", () => {
    const { spherePositions } = buildSphereMesh();
    const ys: number[] = [];
    for (let i = 1; i < spherePositions.length; i += 3) {
      ys.push(spherePositions[i]);
    }

    expect(Math.max(...ys)).toBeCloseTo(GLOBE_RADIUS, 5);
    expect(Math.min(...ys)).toBeCloseTo(-GLOBE_RADIUS, 5);
  });

  // @req REQ-112
  it("keeps the flat plane clamped to the Mercator limit", () => {
    const { flatPositions } = buildSphereMesh();
    const ys: number[] = [];
    for (let i = 1; i < flatPositions.length; i += 3) {
      ys.push(flatPositions[i]);
    }

    expect(Math.max(...ys)).toBeCloseTo(mercatorY(MERCATOR_LATITUDE_LIMIT), 5);
    expect(Math.min(...ys)).toBeCloseTo(-mercatorY(MERCATOR_LATITUDE_LIMIT), 5);
  });

  // The rows past the limit collapse onto the plane's edge, so their quads
  // have zero height and rasterize to nothing. That is what lets the sphere
  // close without the flat map growing a squashed polar band.
  // @req REQ-112
  it("leaves the flat map's framing unchanged by the added polar rows", () => {
    const { halfHeight } = flatHalfExtent();

    expect(halfHeight).toBeCloseTo(mercatorY(MERCATOR_LATITUDE_LIMIT), 5);
  });
});
