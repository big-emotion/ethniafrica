import { MERCATOR_LATITUDE_LIMIT } from "@/lib/atlas/globeTexture";

/**
 * Grid resolution of the morphing surface. Dense enough that the sphere's
 * silhouette reads as a curve rather than a polygon at hero sizes, and
 * that the flat view's Mercator stretch stays smooth between parallels.
 */
// @req REQ-112
export const SPHERE_MESH_SEGMENTS = { x: 200, y: 100 } as const;

const GLOBE_RADIUS = 1;
const DEG2RAD = Math.PI / 180;

/**
 * Mercator's latitude scaling. This is the distortion the flat view
 * exists to expose: it is not a different drawing of the same map but the
 * same surface pulled apart, so the reader watches Africa shrink relative
 * to the high latitudes instead of being told that it does.
 */
// @req REQ-112
export const mercatorY = (lat: number): number =>
  Math.log(Math.tan(Math.PI / 4 + (lat * DEG2RAD) / 2));

export interface FlatHalfExtent {
  halfWidth: number;
  halfHeight: number;
}

/** The flat map's half-extents, for framing the camera on it. */
// @req REQ-112
export function flatHalfExtent(): FlatHalfExtent {
  return {
    halfWidth: Math.PI * GLOBE_RADIUS,
    halfHeight: GLOBE_RADIUS * mercatorY(MERCATOR_LATITUDE_LIMIT),
  };
}

export interface SphereMesh {
  /** Unit-sphere position per vertex, xyz. */
  spherePositions: Float32Array;
  /** Mercator plane position per vertex, xyz (z always 0). */
  flatPositions: Float32Array;
  uvs: Float32Array;
  /**
   * Uint16, which caps the mesh at 65 535 vertices. SPHERE_MESH_SEGMENTS
   * yields 20 301, well inside that — and staying inside it is what lets
   * the layer call drawElements on plain WebGL 1 without asking for the
   * OES_element_index_uint extension.
   */
  indices: Uint16Array;
  vertexCount: number;
}

/**
 * Builds both states of the surface from one lon/lat grid, so a vertex
 * keeps its identity across the morph: index i is the same piece of ground
 * whether it is on the sphere or on the flat map, and the shader only has
 * to interpolate between the two positions it already holds.
 */
// @req REQ-112
export function buildSphereMesh(): SphereMesh {
  const { x: segX, y: segY } = SPHERE_MESH_SEGMENTS;
  const vertexCount = (segX + 1) * (segY + 1);

  const spherePositions = new Float32Array(vertexCount * 3);
  const flatPositions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  let vertex = 0;
  for (let j = 0; j <= segY; j++) {
    const lat =
      MERCATOR_LATITUDE_LIMIT - (j / segY) * (2 * MERCATOR_LATITUDE_LIMIT);
    for (let i = 0; i <= segX; i++) {
      const u = i / segX;
      const lon = -180 + u * 360;

      flatPositions[vertex * 3] = GLOBE_RADIUS * lon * DEG2RAD;
      flatPositions[vertex * 3 + 1] = GLOBE_RADIUS * mercatorY(lat);
      flatPositions[vertex * 3 + 2] = 0;

      const phi = lat * DEG2RAD;
      const lambda = lon * DEG2RAD;
      spherePositions[vertex * 3] =
        GLOBE_RADIUS * Math.cos(phi) * Math.sin(lambda);
      spherePositions[vertex * 3 + 1] = GLOBE_RADIUS * Math.sin(phi);
      spherePositions[vertex * 3 + 2] =
        GLOBE_RADIUS * Math.cos(phi) * Math.cos(lambda);

      uvs[vertex * 2] = u;
      uvs[vertex * 2 + 1] = (90 - lat) / 180;

      vertex++;
    }
  }

  const indices = new Uint16Array(segX * segY * 6);
  let cursor = 0;
  for (let j = 0; j < segY; j++) {
    for (let i = 0; i < segX; i++) {
      const topLeft = j * (segX + 1) + i;
      const topRight = topLeft + 1;
      const bottomLeft = (j + 1) * (segX + 1) + i;
      const bottomRight = bottomLeft + 1;

      indices[cursor++] = topLeft;
      indices[cursor++] = bottomLeft;
      indices[cursor++] = topRight;
      indices[cursor++] = topRight;
      indices[cursor++] = bottomLeft;
      indices[cursor++] = bottomRight;
    }
  }

  return { spherePositions, flatPositions, uvs, indices, vertexCount };
}
