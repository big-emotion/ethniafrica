import { WORLD_ADMIN0 } from "@/lib/atlas/assets/worldAdmin0";
import { WORLD_COMPARE } from "@/lib/atlas/assets/worldCompare";
import type { ContinentFrameCountry, Ring } from "@/lib/atlas/overlays";

/**
 * The outlines of the territories outside Africa, resolved by a caller that
 * actually needs them (REQ-120).
 *
 * **A module of its own for one reason: payload.** `overlays.ts` is imported
 * by `ContinentGlobeStage`, which the home mounts and four atlas hubs mount
 * with it, so a lookup living there put both world assets in the shared client
 * chunk — measured at 17 kB gzipped of Norwegian and Argentinian coastline, on
 * the pages whose Lighthouse budget the site actually cares about, for
 * outlines none of them ever draws.
 *
 * Here, only the Mercator surface imports it, so only that route pays. The
 * asset reaches the globe as data rather than as a lookup the globe performs,
 * which is also why `buildContinentOverlay` takes frame countries instead of
 * ids it would have to resolve itself.
 */

function toRings(rawRings: readonly (readonly [number, number])[][]): Ring[] {
  return rawRings.map((ring) => ring.map(([lon, lat]) => ({ lon, lat })));
}

/**
 * The outline of a territory the continent frame does not draw, or undefined
 * when neither world asset holds it.
 *
 * Both assets are consulted, African outlines are not: a caller asking for one
 * of those wants `getAdmin0Rings`, and answering here would let a country be
 * drawn from two sources.
 */
// @req REQ-120
export function borrowedOutline(
  countryId: string
): ContinentFrameCountry | null {
  const shape = WORLD_ADMIN0[countryId] ?? WORLD_COMPARE[countryId];
  if (!shape) return null;

  const rings = toRings(shape.rings);
  if (rings.length === 0) return null;

  return { countryId, rings, offContinent: true };
}

/**
 * Every borrowed outline among these ids, in order, silently dropping the ones
 * the continent frame already draws — the caller passes a whole round's
 * territories and does not have to know which half is African.
 */
// @req REQ-120
export function borrowedOutlines(
  countryIds: string[]
): ContinentFrameCountry[] {
  return countryIds
    .map(borrowedOutline)
    .filter((outline): outline is ContinentFrameCountry => outline !== null);
}
