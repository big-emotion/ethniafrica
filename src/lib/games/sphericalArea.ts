import type { LonLat, Ring } from "@/lib/atlas/overlays";
import { ringCentroid } from "@/lib/atlas/overlays";

/**
 * What the sphere measures (REQ-120): the true area of a lon/lat ring, how
 * much Mercator exaggerates it, and the distance between two points.
 *
 * All three belong together because they share one premise — the surface is
 * a sphere, and the projection is the subject rather than the medium. A
 * planar shoelace on lon/lat, or a flat Pythagoras between two coordinates,
 * would carry the very distortion these measurements exist to expose.
 */

const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Spherical excess over the geodesic polygon, after Chamberlain & Duquette
 * (JPL, 2007). Planar shoelace on lon/lat would carry the very distortion
 * these games exist to expose, so the sphere is not an optional refinement
 * here — it is the subject.
 */
// @req REQ-120
export function ringArea(ring: Ring): number {
  if (ring.length < 3) return 0;

  let excess = 0;
  for (let i = 0; i < ring.length; i++) {
    const current = ring[i];
    const next = ring[(i + 1) % ring.length];
    excess +=
      (toRadians(next.lon) - toRadians(current.lon)) *
      (2 + Math.sin(toRadians(current.lat)) + Math.sin(toRadians(next.lat)));
  }

  // Winding order only flips the sign; an area has none.
  return Math.abs((excess * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2);
}

/**
 * How many times its true area a ring occupies on a Mercator map, taken at
 * the latitude of its centroid: the projection scales east-west by sec(lat)
 * and north-south by the same factor, so area grows as sec²(lat).
 *
 * Clamped to ±85°, the latitude beyond which Mercator is conventionally cut
 * — the factor diverges at the poles and a game must not divide by zero.
 */
// @req REQ-120
export function mercatorInflation(ring: Ring): number {
  if (ring.length < 3) return 1;

  const latitude = Math.max(-85, Math.min(85, ringCentroid(ring).lat));
  const cosine = Math.cos(toRadians(latitude));
  return 1 / (cosine * cosine);
}

/**
 * Distance along the sphere between two lon/lat points, in kilometres.
 *
 * Haversine rather than the spherical law of cosines: the two agree to the
 * metre at continental range, and haversine keeps its precision for the short
 * hops the scale facts also use — Accra to Abidjan is 424 km, where the
 * cosine form starts losing digits to floating point.
 *
 * The claim this pays for is the one the areas cannot make. Mercator barely
 * lies *inside* Africa — the inflation factors run from 1.00 to 1.46 — so a
 * reader can accept that Africa is large and still not feel it. A distance
 * they already own, set against one they do not, is what makes it land.
 */
// @req REQ-120
export function greatCircleKm(from: LonLat, to: LonLat): number {
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLon = toRadians(to.lon - from.lon);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(haversine)));
}
