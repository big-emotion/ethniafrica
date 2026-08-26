/**
 * How a people's field of presence is encoded, stated once for both renderers.
 *
 * AtlasGlobe draws the same overlay two ways — WebGL points on a sphere, SVG
 * circles on the committed basemap — and the charter's §1 rules are about what
 * the drawing *claims*, not about which technique produced it. Anything here
 * that lived in only one path would be a fact a reader receives or not
 * depending on their driver: focus dimming was exactly that, present in the
 * fallback and absent from WebGL, until this module.
 *
 * The radius formula is deliberately *not* here. "Radius ∝ √population" holds
 * in both paths, but one measures in device pixels and the other in basemap
 * viewBox units, so they scale the same shape by different constants. What is
 * shared is everything that can be shared without lying about that.
 */
import type { PeopleFieldArea } from "@/lib/atlas/overlays";
import type { CountryId } from "@/types/afrik";

/**
 * What a halo drops to when another country is focused.
 *
 * Never zero. A halo faded out of existence takes its country with it: the
 * marker stops being findable, and the map ends up asserting an absence the
 * corpus never declared. Dimming says "not this one right now"; disappearing
 * says "not here", which is the one thing a people's field must never claim.
 */
// @req REQ-116
export const PEOPLE_FIELD_DIMMED_INTENSITY = 0.4;

/** 1 for the focused country, or for every country while nothing is focused. */
// @req REQ-116
export function peopleFieldIntensity(
  countryId: CountryId,
  focusedCountryId: CountryId | null | undefined
): number {
  if (!focusedCountryId || focusedCountryId === countryId) return 1;
  return PEOPLE_FIELD_DIMMED_INTENSITY;
}

/**
 * Largest first, so the smallest presence is painted last and stays readable.
 *
 * PPL_BANTU declares 21 countries spanning three orders of magnitude. In fiche
 * order, a 400-million halo covers a 200-thousand one and the map silently
 * says that country has no Bantu presence.
 */
// @req REQ-116
export function orderedPeopleFieldAreas(
  areas: readonly PeopleFieldArea[]
): PeopleFieldArea[] {
  return [...areas].sort((a, b) => b.populationShare - a.populationShare);
}
