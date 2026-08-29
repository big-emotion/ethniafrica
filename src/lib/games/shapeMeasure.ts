import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";
import type { Ring } from "@/lib/atlas/overlays";
import { mercatorInflation, ringArea } from "@/lib/games/sphericalArea";

/**
 * Measuring a committed outline (REQ-120).
 *
 * `sphericalArea` knows how to measure a ring; this knows how to measure a
 * *shape*, which is a list of rings plus the two conventions the game has
 * settled on — islands count toward area, and only the mainland decides
 * where the shape sits. `mercatorRound` established both; the scale facts and
 * the estimate rounds inherit them here rather than restating them, so a
 * country cannot be measured one way in a round and another in a fact
 * printed beside it.
 */

type RawRings = readonly (readonly [number, number])[][];

const toRings = (rawRings: RawRings): Ring[] =>
  rawRings.map((ring) => ring.map(([lon, lat]) => ({ lon, lat })));

/** Ground the shape really covers, islands included. */
// @req REQ-120
export function shapeAreaKm2(rawRings: RawRings): number {
  return toRings(rawRings).reduce((total, ring) => total + ringArea(ring), 0);
}

/**
 * How many times its true area Mercator draws the shape at, read on the
 * mainland alone: a distant island would drag the centroid to a latitude the
 * shape is not mostly at, and the factor is a statement about where it sits.
 */
// @req REQ-120
export function shapeInflation(rawRings: RawRings): number {
  const rings = toRings(rawRings);
  if (rings.length === 0) return 1;

  return mercatorInflation(
    rings.reduce((largest, ring) =>
      ring.length > largest.length ? ring : largest
    )
  );
}

/**
 * The continent, summed once.
 *
 * Every comparison the page makes is against this figure, and summing
 * fifty-eight outlines is a few hundred thousand trigonometric calls — worth
 * doing once per process, not once per request. Memoised for cost, never for
 * correctness: the assets are static, so a second call must and does return
 * the same number.
 */
let africaTotal: number | null = null;

// @req REQ-120
export function africaAreaKm2(): number {
  if (africaTotal === null) {
    africaTotal = Object.values(AFRICA_ADMIN0).reduce(
      (total, country) => total + shapeAreaKm2(country.rings),
      0
    );
  }
  return africaTotal;
}
