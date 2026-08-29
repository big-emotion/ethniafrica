import { ringCentroid } from "@/lib/atlas/overlays";
import type { Ring } from "@/lib/atlas/overlays";

/**
 * Lambert azimuthal equal-area, one shape at a time (REQ-120).
 *
 * The Jouer hub opens on an argument about area — Mercator draws Greenland
 * eleven times larger than it is — and carries that argument as two
 * silhouettes set side by side. Drawing them through `projectLonLat`, the
 * atlas's plate-carrée helper, would have reproduced inside the illustration
 * the very distortion the illustration exists to deny. So this is not a
 * refinement of the basemap projection; it is the only projection the scene
 * is allowed to use.
 *
 * Azimuthal rather than cylindrical because each shape is centred on its own
 * centroid: an equal-area *cylindrical* projection holds area everywhere but
 * shears shapes badly at Greenland's latitude, and a sheared silhouette
 * would read as a second lie about the same country.
 */

const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Planar kilometres from the projection centre. */
export interface EqualAreaPoint {
  x: number;
  y: number;
}

/**
 * Projects a ring about its own centroid. Output is in kilometres, so two
 * rings projected independently share one scale and may be compared directly
 * — which is exactly what the scene does with them.
 */
// @req REQ-120
export function projectEqualArea(ring: Ring): EqualAreaPoint[] {
  if (ring.length < 3) return [];

  return projectEqualAreaAbout(ring, ringCentroid(ring));
}

/**
 * Projects a ring about a centre chosen by the caller.
 *
 * A country's islands must not each be centred on themselves — that would
 * stack them on top of the mainland. They are projected about the mainland's
 * centre so the group keeps its real arrangement.
 */
// @req REQ-120
export function projectEqualAreaAbout(
  ring: Ring,
  centre: { lon: number; lat: number }
): EqualAreaPoint[] {
  const centreLon = toRadians(centre.lon);
  const centreLat = toRadians(centre.lat);
  const sinCentreLat = Math.sin(centreLat);
  const cosCentreLat = Math.cos(centreLat);

  return ring.map((point) => {
    const lat = toRadians(point.lat);
    const deltaLon = toRadians(point.lon) - centreLon;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const cosDelta = Math.cos(deltaLon);

    const cosAngularDistance =
      sinCentreLat * sinLat + cosCentreLat * cosLat * cosDelta;
    // Zero at the antipode, where the projection is undefined. Nothing this
    // scene draws comes near it, but a NaN leaking into an SVG path silently
    // renders nothing at all, which is the worst way to find out.
    const scale =
      EARTH_RADIUS_KM * Math.sqrt(2 / Math.max(1 + cosAngularDistance, 1e-12));

    return {
      x: scale * cosLat * Math.sin(deltaLon),
      y: scale * (cosCentreLat * sinLat - sinCentreLat * cosLat * cosDelta),
    };
  });
}

/**
 * Shoelace area of a projected ring, in square kilometres.
 *
 * Planar here is correct rather than approximate: the points are already off
 * the sphere and into an equal-area plane, which is the whole reason they
 * were projected before being measured.
 */
// @req REQ-120
export function planarRingArea(points: EqualAreaPoint[]): number {
  if (points.length < 3) return 0;

  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }

  // Winding order only flips the sign; an area has none.
  return Math.abs(twiceArea) / 2;
}
