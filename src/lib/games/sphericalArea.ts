import type { Ring } from "@/lib/atlas/overlays";
import { ringCentroid } from "@/lib/atlas/overlays";

/**
 * True surface area of a lon/lat ring, and how much Mercator exaggerates it
 * (REQ-120). Two games rest on this: « La taille qu'on vous a cachée » asks
 * which of two countries is really larger, and « Vraie taille » lays an
 * African outline over a non-African one. Both are arguments about the
 * projection, so neither may measure area *in* the projection.
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
