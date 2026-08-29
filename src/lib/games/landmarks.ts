import type { LonLat } from "@/lib/atlas/overlays";

/**
 * The fixed points the scale facts measure between (REQ-120).
 *
 * Why a table at all: the corpus holds peoples, countries and families, and
 * nothing smaller. There is no city in it, and the admin-0 asset carries
 * outlines rather than places — so a claim about Kinshasa and Goma has
 * nowhere else to come from.
 *
 * Provenance: city-centre and cape coordinates at four decimals, which is a
 * ten-metre grid. Every fact built from them is stated to the nearest ten
 * kilometres, so the margin swallows any disagreement between gazetteers
 * about where a city's centre lies — the facts compare magnitudes, they do
 * not survey, the same tradeoff `mercatorRound` records for its areas.
 *
 * The European and Asian entries are here on purpose and are not a
 * digression. A reader who is told Africa is vast has learned a number; a
 * reader who is told the Congo alone is wider than Paris to Warsaw has been
 * handed a distance they already own. The comparison is the lesson, so the
 * far end of it has to be in the table too.
 */
export interface Landmark extends LonLat {
  nameFr: string;
}

/**
 * `AFRICA_WIDTH` and `AFRICA_HEIGHT` below are drawn between the mainland's
 * extreme capes rather than between its extreme *territories*: Cape Verde is
 * an Atlantic archipelago and would stretch the width by a thousand
 * kilometres of open sea, which is a fact about the ocean, not the continent.
 */
// @req REQ-120
export const LANDMARKS: Record<string, Landmark> = {
  // Africa — the four extremes of the mainland.
  ALMADIES: {
    nameFr: "la pointe des Almadies (Sénégal)",
    lon: -17.5253,
    lat: 14.7456,
  },
  RAS_HAFUN: { nameFr: "le cap Hafun (Somalie)", lon: 51.4152, lat: 10.4456 },
  BLANC: { nameFr: "le cap Blanc (Tunisie)", lon: 9.8739, lat: 37.2746 },
  AGULHAS: {
    nameFr: "le cap des Aiguilles (Afrique du Sud)",
    lon: 20.0,
    lat: -34.8333,
  },

  // Africa — cities the facts set against European spans.
  KINSHASA: { nameFr: "Kinshasa", lon: 15.2663, lat: -4.4419 },
  GOMA: { nameFr: "Goma", lon: 29.2336, lat: -1.6794 },
  LE_CAIRE: { nameFr: "Le Caire", lon: 31.2357, lat: 30.0444 },
  LE_CAP: { nameFr: "Le Cap", lon: 18.4241, lat: -33.9249 },

  // The far end of each comparison.
  PARIS: { nameFr: "Paris", lon: 2.3522, lat: 48.8566 },
  VARSOVIE: { nameFr: "Varsovie", lon: 21.0122, lat: 52.2297 },
  PEKIN: { nameFr: "Pékin", lon: 116.4074, lat: 39.9042 },
  NEW_YORK: { nameFr: "New York", lon: -74.006, lat: 40.7128 },
};

/** Where the facts say these figures were measured. */
// @req REQ-120
export const LANDMARK_PROVENANCE_PATH = "lib/games/landmarks";
