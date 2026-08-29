import { WORLD_LANDMASS_PATH } from "@/lib/atlas/assets/worldLandmassPath";
import type { LonLat } from "@/lib/atlas/overlays";

/**
 * The two ends of « La taille qu'on vous a cachée » and everything between
 * them (REQ-120).
 *
 * The game page is named after a projection and, until now, only said so: its
 * own comment promised "the flat Mercator map, and the slider that closes it
 * back into a globe while Tissot's indicatrices keep the same real area
 * throughout", and mounted the home's globe instead. Reading that Mercator
 * inflates the north and watching it happen are not the same lesson, which is
 * the reason the promise was written down in the first place.
 *
 * Both projections here share `x = lon`, so the slider moves nothing
 * east-west and everything north-south. That is not a simplification — it is
 * the argument. A cylindrical projection already draws every degree of
 * longitude the same width; what Mercator adds on top, and what an equal-area
 * projection refuses to add, is exactly the north-south stretch that makes
 * area explode toward the poles.
 */

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

/** Slider ends, named so a caller never has to remember which way round. */
// @req REQ-120
export const EQUAL_AREA_BLEND = 0;
// @req REQ-120
export const MERCATOR_BLEND = 1;

/**
 * Mercator is conventionally cut here — the projection diverges at the poles
 * and no map has ever drawn them.
 */
const MERCATOR_LATITUDE_LIMIT = 85;

/** Angular radius of each indicatrix, in degrees of great circle. */
// @req REQ-120
export const TISSOT_RADIUS_DEG = 5;

/** Points around each indicatrix. Enough that its area is not undercounted. */
const TISSOT_STEPS = 36;

/**
 * Lambert cylindrical equal-area, standard parallel 0.
 *
 * Scaled by 180/π so that x in degrees and y here share one unit and the
 * plane is genuinely equal-area — which is what lets the test measure an
 * indicatrix rather than trust this comment.
 */
function equalAreaY(latitude: number): number {
  return toDegrees(Math.sin(toRadians(latitude)));
}

function mercatorY(latitude: number): number {
  const clamped = Math.max(
    -MERCATOR_LATITUDE_LIMIT,
    Math.min(MERCATOR_LATITUDE_LIMIT, latitude)
  );
  return toDegrees(Math.log(Math.tan(Math.PI / 4 + toRadians(clamped) / 2)));
}

export interface MorphPoint {
  x: number;
  y: number;
}

/**
 * `blend` 0 is equal-area, 1 is Mercator. Both agree on the equator, so the
 * morph reads as the poles pulling away rather than as the map sliding.
 *
 * y is negated because SVG counts downward and latitude counts north.
 */
// @req REQ-120
export function projectMorph(
  lon: number,
  lat: number,
  blend: number
): MorphPoint {
  const y = equalAreaY(lat) + (mercatorY(lat) - equalAreaY(lat)) * blend;
  return { x: lon, y: -y };
}

/**
 * How many times its true area a surface at this latitude is drawn, at this
 * blend.
 *
 * For any cylindrical projection with `x = lon`, the area scale relative to
 * the equator is (dy/dφ) / cos φ. The equal-area end contributes cos φ and
 * the Mercator end sec φ, so the blend collapses to `(1-b) + b·sec²φ` — which
 * gives 1 everywhere at the equal-area end and the familiar sec²φ at the
 * Mercator end. The readout under the slider is this number, so it is derived
 * from the same geometry the map is drawn with rather than tabulated beside
 * it.
 */
// @req REQ-120
export function areaInflationAt(latitude: number, blend: number): number {
  const cosine = Math.cos(
    toRadians(
      Math.max(
        -MERCATOR_LATITUDE_LIMIT,
        Math.min(MERCATOR_LATITUDE_LIMIT, latitude)
      )
    )
  );
  return 1 - blend + blend / (cosine * cosine);
}

/** An indicatrix, carrying the latitude it was grown at — which is the whole
 *  variable the reader is being asked to notice. */
export interface TissotCircle {
  centreLat: number;
  ring: LonLat[];
}

const TISSOT_LATITUDES = [-60, -30, 0, 30, 60];
const TISSOT_LONGITUDES = [-140, -70, 0, 70, 140];

/**
 * A circle of constant angular radius on the sphere, walked as a geodesic
 * circle and then projected like any other geometry.
 *
 * Drawing an ellipse with the algebraically correct axes would give the same
 * picture and prove nothing: the point of an indicatrix is that it is a real
 * circle on the real sphere, and that every distortion the reader sees was
 * done to it by the projection alone.
 */
function geodesicCircle(
  centreLon: number,
  centreLat: number,
  radiusDeg: number
): LonLat[] {
  const lat0 = toRadians(centreLat);
  const lon0 = toRadians(centreLon);
  const radius = toRadians(radiusDeg);

  return Array.from({ length: TISSOT_STEPS }, (_, step) => {
    const bearing = (2 * Math.PI * step) / TISSOT_STEPS;
    const lat = Math.asin(
      Math.sin(lat0) * Math.cos(radius) +
        Math.cos(lat0) * Math.sin(radius) * Math.cos(bearing)
    );
    const lon =
      lon0 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(radius) * Math.cos(lat0),
        Math.cos(radius) - Math.sin(lat0) * Math.sin(lat)
      );
    return { lon: toDegrees(lon), lat: toDegrees(lat) };
  });
}

// @req REQ-120
export function tissotIndicatrices(): TissotCircle[] {
  return TISSOT_LATITUDES.flatMap((lat) =>
    TISSOT_LONGITUDES.map((lon) => ({
      centreLat: lat,
      ring: geodesicCircle(lon, lat, TISSOT_RADIUS_DEG),
    }))
  );
}

/**
 * Equirectangular texture the world path is expressed in: 2048 x 1024 pixels,
 * lon -180..180 across x, lat 90..-90 down y (see the asset's own header).
 */
const TEXTURE_WIDTH = 2048;
const TEXTURE_HEIGHT = 1024;

let cachedWorldRings: LonLat[][] | null = null;

/**
 * The committed world silhouette, read back out of globe-texture pixels.
 *
 * The asset is stored that way because that is the form the globe paints, and
 * it is the same shape either way — so the slider reads it back rather than a
 * second world outline being generated and committed beside it, which is how
 * two silhouettes of one planet end up disagreeing.
 */
// @req REQ-120
export function worldLandmassRings(): LonLat[][] {
  if (cachedWorldRings) return cachedWorldRings;

  cachedWorldRings = WORLD_LANDMASS_PATH.split("M")
    .filter((subpath) => subpath.trim().length > 0)
    .map((subpath) =>
      subpath
        .replace(/Z/g, "")
        .split("L")
        .map((pair) => {
          const [x, y] = pair.split(",").map(Number);
          return {
            lon: (x / TEXTURE_WIDTH) * 360 - 180,
            lat: 90 - (y / TEXTURE_HEIGHT) * 180,
          };
        })
        .filter(
          (point) => Number.isFinite(point.lon) && Number.isFinite(point.lat)
        )
    )
    .filter((ring) => ring.length >= 3);

  return cachedWorldRings;
}

// @req REQ-120
export function ringToPath(ring: LonLat[], blend: number): string {
  return `${ring
    .map((point, index) => {
      const projected = projectMorph(point.lon, point.lat, blend);
      return `${index === 0 ? "M" : "L"}${projected.x.toFixed(1)} ${projected.y.toFixed(1)}`;
    })
    .join(" ")}Z`;
}

/**
 * Wide enough for every longitude, tall enough for Mercator at its 85° cut —
 * fixed, so the map grows into the frame as the slider moves instead of the
 * frame growing with it, which would hide the very change it is showing.
 */
// @req REQ-120
export const MORPH_VIEWBOX = `-180 -182 360 364`;
