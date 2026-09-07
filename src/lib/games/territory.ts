import type { CountryId, Ring } from "@/lib/games/gameKinds";
import { WORLD_COMPARE } from "@/lib/atlas/assets/worldCompare";
import { WORLD_ADMIN0 } from "@/lib/atlas/assets/worldAdmin0";
import { getAdmin0Rings, getWorldCompareRings } from "@/lib/atlas/overlays";
import { borrowedOutline } from "@/lib/atlas/worldOutlines";
import {
  mercatorInflation,
  mercatorLatitude,
  ringArea,
} from "@/lib/games/sphericalArea";

/**
 * What « La taille qu'on vous a cachée » is allowed to hold up against what
 * (REQ-120).
 *
 * The game began comparing African countries to African countries, because
 * the only outlines its rounds could reach were the corpus's. That was never
 * where the projection lies: measured across the fifty-eight African
 * outlines, Mercator's factor runs from 1,00 to 1,46, so the honest
 * intra-African comparisons are near-ties and the striking ones — Greenland
 * drawn at fourteen times itself — sat in a committed asset no round could
 * name. This module is the seam that lets one round reach both assets.
 *
 * A territory is deliberately thin: an id, and how to say it. Everything else
 * is measured here from the committed outlines, because the corpus holds no
 * area column and never has.
 */

/**
 * Anything the game can put on a button. `GameCountryFixture` satisfies it
 * structurally, so a corpus country needs no adapter; a non-African
 * silhouette is one of `NON_AFRICAN_SILHOUETTES` below.
 */
export interface ComparedTerritory {
  id: string;
  nameFr: string;
  nameEn?: string;
}

/** Where a territory sits and what the flat map does to it. */
export interface TerritoryFootprint {
  trueAreaKm2: number;
  /** Area as Mercator draws it — the reader's mistaken impression, measured. */
  drawnAreaKm2: number;
  inflation: number;
  /** Centroid latitude, clamped as Mercator itself is. The reason for the factor. */
  latitude: number;
}

/**
 * Everything from outside the continent a round may hold an African country
 * up against: the six silhouettes of `worldCompare`, plus the countries of
 * `worldAdmin0`.
 *
 * The second asset exists because the first could not carry the question.
 * `worldCompare` was generated for the retired « Vraie taille » to be measured
 * *whole* against Africa, so its six entries are the six largest things worth
 * measuring that way — and five of them are bigger than every African country
 * but the largest, which makes for a comparison with no tension in it. The
 * pairs that teach are the near-ties across latitudes: mainland France against
 * Côte d'Ivoire, Norway against Cameroon, Sweden against Madagascar. Those
 * needed countries the reader's own map already holds, at a size an African
 * country can match.
 *
 * Keys stay plain strings rather than `CountryId`: `EUW` is a dissolved
 * Western Europe with no country code, and the atlas holds a fiche for none of
 * these anyway.
 */
// @req REQ-120
export const NON_AFRICAN_SILHOUETTES: ComparedTerritory[] = [
  ...Object.entries(WORLD_COMPARE),
  ...Object.entries(WORLD_ADMIN0),
].map(([id, shape]) => ({ id, nameFr: shape.nameFr, nameEn: shape.name }));

const NON_AFRICAN_IDS = new Set(NON_AFRICAN_SILHOUETTES.map(({ id }) => id));

/**
 * Whether this territory is one of the continent's — which is also the
 * question « does the atlas hold a fiche for it ».
 *
 * Two callers, one predicate, and both were bugs waiting to be written. A
 * reveal that linked to `/pays/GRL` would send the reader to a 404 on the
 * strength of an id that looks like an ISO code because, for Greenland, it is
 * one. And a comparison between two borrowed silhouettes — Western Europe
 * against India — is a round on an atlas of African peoples that mentions no
 * African anything: it is off the page's thesis, not merely uninteresting.
 */
// @req REQ-120
export function isAfricanTerritory(territory: ComparedTerritory): boolean {
  return !NON_AFRICAN_IDS.has(territory.id);
}

/** The mainland: the ring carrying the most points, islands set aside. */
function largestRing(rings: Ring[]): Ring {
  return rings.reduce((largest, ring) =>
    ring.length > largest.length ? ring : largest
  );
}

/**
 * Every ring the committed assets hold for this territory, African outlines
 * first. Two assets, one lookup: a round should not have to know which of
 * them its options came from.
 */
function ringsOf(territory: ComparedTerritory): Ring[] | null {
  const rings =
    getAdmin0Rings(territory.id as CountryId) ??
    borrowedOutline(territory.id)?.rings ??
    getWorldCompareRings(territory.id);
  return rings && rings.length > 0 ? rings : null;
}

function measure(territory: ComparedTerritory): TerritoryFootprint | null {
  const rings = ringsOf(territory);
  if (!rings) return null;

  const trueAreaKm2 = rings.reduce((total, ring) => total + ringArea(ring), 0);
  const mainland = largestRing(rings);
  const inflation = mercatorInflation(mainland);

  return {
    trueAreaKm2,
    inflation,
    latitude: mercatorLatitude(mainland),
    drawnAreaKm2: trueAreaKm2 * inflation,
  };
}

/**
 * Memoised for cost, never for correctness: the outlines are committed
 * constants, so a second call must and does return the same figures — the
 * same trade `africaAreaKm2` already makes.
 *
 * It is not an optimisation looking for a problem. The handler pairs
 * territories by considering every candidate pair, so a pool of sixty asks
 * about thirty-five hundred questions of this function per request, each one
 * a few thousand trigonometric calls over a coastline. Keyed by id because
 * that is what selects the outline.
 */
const footprintById = new Map<string, TerritoryFootprint | null>();

/**
 * The territory measured, or null when no committed outline draws it.
 *
 * Two conventions, both inherited from the round that established them:
 * islands count toward the area, and only the mainland decides the latitude —
 * a distant island would drag the centroid to a latitude the territory is not
 * mostly at, and the factor is a statement about where it sits.
 */
// @req REQ-120
export function territoryFootprint(
  territory: ComparedTerritory
): TerritoryFootprint | null {
  if (!footprintById.has(territory.id)) {
    footprintById.set(territory.id, measure(territory));
  }
  return footprintById.get(territory.id);
}
