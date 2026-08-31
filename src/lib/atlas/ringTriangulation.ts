/**
 * Ear clipping for the atlas fills.
 *
 * The fills used to be a GL_TRIANGLE_FAN anchored on the ring centroid, which
 * only tiles a ring that is star-shaped from that centroid. No African outline
 * is: on ZAF's 82-point ring, 12 of the fan's triangles wound backwards and so
 * landed *on* the interior instead of beside it. At the overlay's partial
 * fill opacity those doubly-painted slivers blended twice and showed up as
 * bright hairlines radiating from the middle of the selected country.
 *
 * Ear clipping keeps every vertex on the ring — it adds no interior point the
 * projection would have to invent — and emits a set of triangles that covers
 * the ring exactly once, whatever its concavities.
 *
 * Rings here are plane lon/lat polygons of a few dozen points, so the textbook
 * O(n²) algorithm is the right amount of machinery. Holes are out of scope:
 * the committed admin-0 asset carries none.
 */
import type { LonLat, Ring } from "@/lib/atlas/overlays";

function signedArea(ring: Ring): number {
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    total += a.lon * b.lat - b.lon * a.lat;
  }
  return total / 2;
}

function cross(origin: LonLat, a: LonLat, b: LonLat): number {
  return (
    (a.lon - origin.lon) * (b.lat - origin.lat) -
    (a.lat - origin.lat) * (b.lon - origin.lon)
  );
}

/** Barycentric containment, edges included — a vertex sitting on an ear's edge still blocks the clip. */
function containsPoint(a: LonLat, b: LonLat, c: LonLat, p: LonLat): boolean {
  const ab = cross(a, b, p);
  const bc = cross(b, c, p);
  const ca = cross(c, a, p);
  return (ab >= 0 && bc >= 0 && ca >= 0) || (ab <= 0 && bc <= 0 && ca <= 0);
}

/** Natural Earth repeats the first point to close a ring; a duplicate vertex has no ear and would stall the clip. */
function withoutRepeatedPoints(ring: Ring): Ring {
  const cleaned: Ring = [];
  for (const point of ring) {
    const previous = cleaned[cleaned.length - 1];
    if (previous && previous.lon === point.lon && previous.lat === point.lat) {
      continue;
    }
    cleaned.push(point);
  }
  const first = cleaned[0];
  const last = cleaned[cleaned.length - 1];
  if (cleaned.length > 1 && first.lon === last.lon && first.lat === last.lat) {
    cleaned.pop();
  }
  return cleaned;
}

/**
 * A ring as a flat list of triangle vertices — 3 per triangle, in the ring's
 * own winding. Empty for anything that cannot bound an area.
 */
// @req REQ-116
export function triangulateRing(ring: Ring): LonLat[] {
  const points = withoutRepeatedPoints(ring);
  if (points.length < 3) return [];

  const clockwise = signedArea(points) < 0;
  // Ear tests assume counter-clockwise; the ring's own winding is restored on
  // the way out so a fill never flips relative to the outline it belongs to.
  const working = clockwise ? [...points].reverse() : [...points];

  const indices = working.map((_, index) => index);
  const triangles: LonLat[] = [];

  // Each pass that clips nothing means the remaining ring is self-intersecting
  // or fully collinear; stop rather than spin.
  let remainingAttempts = indices.length;

  while (indices.length > 3 && remainingAttempts > 0) {
    let clipped = false;

    for (let i = 0; i < indices.length; i++) {
      const previous =
        working[indices[(i - 1 + indices.length) % indices.length]];
      const ear = working[indices[i]];
      const next = working[indices[(i + 1) % indices.length]];

      if (cross(previous, ear, next) <= 0) continue;

      const blocked = indices.some((index, position) => {
        if (
          position === i ||
          position === (i - 1 + indices.length) % indices.length ||
          position === (i + 1) % indices.length
        ) {
          return false;
        }
        return containsPoint(previous, ear, next, working[index]);
      });
      if (blocked) continue;

      triangles.push(previous, ear, next);
      indices.splice(i, 1);
      clipped = true;
      remainingAttempts = indices.length;
      break;
    }

    if (!clipped) break;
    remainingAttempts--;
  }

  // The remainder is only a triangle worth drawing if it winds like the rest.
  // A self-intersecting ring — SDN's committed outline crosses itself once —
  // can leave a reversed scrap here, and drawing it would reintroduce exactly
  // the doubly-painted sliver this whole module exists to remove. Dropping it
  // loses a fraction of a fraction of the country's area; keeping it would be
  // visible.
  if (indices.length === 3) {
    const [a, b, c] = indices.map((index) => working[index]);
    if (cross(a, b, c) > 0) triangles.push(a, b, c);
  }

  if (!clockwise) return triangles;

  // Reverse each triangle in place, not the whole list: the caller reads the
  // array three vertices at a time.
  const restored: LonLat[] = [];
  for (let i = 0; i < triangles.length; i += 3) {
    restored.push(triangles[i + 2], triangles[i + 1], triangles[i]);
  }
  return restored;
}
