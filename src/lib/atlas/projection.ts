export interface AtlasViewport {
  width: number;
  height: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
}

/**
 * Geographic bounds the committed basemap asset
 * (src/lib/atlas/assets/africa-basemap.svg) was generated at — Natural
 * Earth 1:50m admin-0 countries, continent "Africa", dissolved and
 * simplified (see assets/README.md). Both the asset and this projection
 * share these bounds so pixel coordinates never drift apart; changing one
 * requires regenerating the other.
 */
// @req REQ-101
export const AFRICA_GEO_BOUNDS = {
  lonMin: -25,
  lonMax: 52,
  latMin: -35,
  latMax: 38,
} as const;

/** The committed asset's `viewBox="0 0 800 758"`. */
// @req REQ-101
export const BASEMAP_VIEWBOX: AtlasViewport = {
  width: 800,
  height: Math.round(
    (800 * (AFRICA_GEO_BOUNDS.latMax - AFRICA_GEO_BOUNDS.latMin)) /
      (AFRICA_GEO_BOUNDS.lonMax - AFRICA_GEO_BOUNDS.lonMin)
  ),
};

/**
 * Pure linear equirectangular (Plate Carrée) projection — no trigonometry,
 * no d3-geo, no runtime dependency. Longitude maps linearly to x; latitude
 * maps linearly to y, inverted because SVG y grows downward. Both axes
 * scale AFRICA_GEO_BOUNDS onto the given viewport.
 */
// @req REQ-101
export function projectLonLat(
  lon: number,
  lat: number,
  viewport: AtlasViewport
): ProjectedPoint {
  const { lonMin, lonMax, latMin, latMax } = AFRICA_GEO_BOUNDS;
  const x = ((lon - lonMin) / (lonMax - lonMin)) * viewport.width;
  const y = ((latMax - lat) / (latMax - latMin)) * viewport.height;
  return { x, y };
}

const DEG2RAD = Math.PI / 180;

export interface SpherePoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Maps a geographic coordinate onto a unit sphere: the true-relative-area
 * counterpart to the equirectangular projectLonLat above, which stretches
 * area as latitude grows. Longitude 0 / latitude 0 faces the camera
 * (+z); AFRICA_CENTER_LON below picks the initial yaw that faces Africa's
 * own bounding-box centroid front-on.
 */
// @req REQ-112
export function lonLatToSphere(lon: number, lat: number): SpherePoint {
  const theta = lon * DEG2RAD;
  const phi = lat * DEG2RAD;
  return {
    x: Math.cos(phi) * Math.sin(theta),
    y: Math.sin(phi),
    z: Math.cos(phi) * Math.cos(theta),
  };
}

/** Africa's own bounding-box centroid longitude (REQ-112 AC1: "Africa faces the reader on first paint"). */
// @req REQ-112
export const AFRICA_CENTER_LON =
  (AFRICA_GEO_BOUNDS.lonMin + AFRICA_GEO_BOUNDS.lonMax) / 2;

/** Column-major 3x3 rotation matrix — ready for WebGL's uniformMatrix3fv. */
export type Mat3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

function multiplyMat3(a: Mat3, b: Mat3): Mat3 {
  const out: number[] = new Array(9).fill(0);
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      out[col * 3 + row] =
        a[0 * 3 + row] * b[col * 3 + 0] +
        a[1 * 3 + row] * b[col * 3 + 1] +
        a[2 * 3 + row] * b[col * 3 + 2];
    }
  }
  return out as unknown as Mat3;
}

/**
 * Combined rotation (yaw around Y applied first, then pitch around X), in
 * radians — the single control the globe drives from pointer drag and
 * keyboard arrows.
 */
// @req REQ-112
export function buildRotationMatrix(yaw: number, pitch: number): Mat3 {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const ry: Mat3 = [cosY, 0, -sinY, 0, 1, 0, sinY, 0, cosY];

  const cosX = Math.cos(pitch);
  const sinX = Math.sin(pitch);
  const rx: Mat3 = [1, 0, 0, 0, cosX, sinX, 0, -sinX, cosX];

  return multiplyMat3(rx, ry);
}

/** Applies a column-major Mat3 to a sphere point — used by tests to verify rotation without a WebGL context. */
// @req REQ-112
export function rotateSpherePoint(
  matrix: Mat3,
  point: SpherePoint
): SpherePoint {
  return {
    x: matrix[0] * point.x + matrix[3] * point.y + matrix[6] * point.z,
    y: matrix[1] * point.x + matrix[4] * point.y + matrix[7] * point.z,
    z: matrix[2] * point.x + matrix[5] * point.y + matrix[8] * point.z,
  };
}
