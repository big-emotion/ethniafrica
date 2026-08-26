/**
 * The three fiche-globe overlays (REQ-116, atlas-charter §1): pure data
 * builders, no rendering. `AtlasGlobe` (src/components/atlas/AtlasGlobe.tsx)
 * draws whatever these return, in both its WebGL and non-WebGL paths, so no
 * fact about an encoding can exist only in one rendering technique.
 *
 * The hard rule the charter states: a people never receives a closed line —
 * `PeopleFieldOverlay`/`PeopleFieldMissingOverlay` below have no `rings`
 * field at all, so a caller cannot stroke one by mistake.
 */
import type { CountryDistribution, CountryId } from "@/types/afrik";
import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";

export interface LonLat {
  lon: number;
  lat: number;
}

export type Ring = LonLat[];

function toRings(rawRings: readonly (readonly [number, number])[][]): Ring[] {
  return rawRings.map((ring) => ring.map(([lon, lat]) => ({ lon, lat })));
}

/**
 * Area-weighted centroid of a ring (shoelace formula), treating lon/lat as
 * planar — a stylised placement, not a survey-grade one, the same tradeoff
 * projection.ts's HomeGlobe geometry already makes.
 */
// @req REQ-116
export function ringCentroid(ring: Ring): LonLat {
  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < ring.length; i++) {
    const p0 = ring[i];
    const p1 = ring[(i + 1) % ring.length];
    const cross = p0.lon * p1.lat - p1.lon * p0.lat;
    area += cross;
    cx += (p0.lon + p1.lon) * cross;
    cy += (p0.lat + p1.lat) * cross;
  }
  area *= 0.5;

  if (area === 0) {
    const n = ring.length || 1;
    return {
      lon: ring.reduce((sum, p) => sum + p.lon, 0) / n,
      lat: ring.reduce((sum, p) => sum + p.lat, 0) / n,
    };
  }

  return { lon: cx / (6 * area), lat: cy / (6 * area) };
}

function largestRingCentroid(rings: Ring[]): LonLat {
  const largest = rings.reduce((best, ring) =>
    ring.length > best.length ? ring : best
  );
  return ringCentroid(largest);
}

/** Undefined for any country absent from the committed 51-country asset — treated as missing, never as a silently dropped shape. */
// @req REQ-116
export function getAdmin0Rings(countryId: CountryId): Ring[] | undefined {
  const country = AFRICA_ADMIN0[countryId];
  return country ? toRings(country.rings) : undefined;
}

// ─── Country: closed outline, stroked as it draws, 22% fill ────────────────

// @req REQ-116
export const COUNTRY_FILL_OPACITY = 0.22;

export interface CountryOutlineOverlay {
  kind: "country-outline";
  countryId: CountryId;
  rings: Ring[];
  fillOpacity: number;
}

// @req REQ-116
export function buildCountryOutlineOverlay(
  countryId: CountryId
): CountryOutlineOverlay | null {
  const rings = getAdmin0Rings(countryId);
  if (!rings || rings.length === 0) return null;
  return {
    kind: "country-outline",
    countryId,
    rings,
    fillOpacity: COUNTRY_FILL_OPACITY,
  };
}

// ─── People: radial field, no edge anywhere, radius ∝ √population ─────────

export interface PeopleFieldArea {
  countryId: CountryId;
  center: LonLat;
  /**
   * 0..1, normalised to the largest declared share in this fiche's
   * distribution. This is a population weight, not a radius — AtlasGlobe
   * derives the drawn radius as ∝ √populationShare so the eye reads area,
   * matching the charter's "radius ∝ √population" rule.
   */
  populationShare: number;
}

export interface PeopleFieldOverlay {
  kind: "people-field";
  areas: PeopleFieldArea[];
}

/** REQ-119: a fiche with no distributionByCountry renders as declared-missing, not as an empty globe. */
export interface PeopleFieldMissingOverlay {
  kind: "people-field-missing";
}

// @req REQ-116
export function buildPeopleFieldOverlay(
  distributionByCountry: CountryDistribution[] | undefined
): PeopleFieldOverlay | PeopleFieldMissingOverlay {
  if (!distributionByCountry || distributionByCountry.length === 0) {
    return { kind: "people-field-missing" };
  }

  const resolved = distributionByCountry
    .map((entry) => ({
      countryId: entry.country,
      rawWeight: entry.percentage ?? entry.population ?? 0,
      rings: getAdmin0Rings(entry.country),
    }))
    .filter(
      (entry): entry is typeof entry & { rings: Ring[] } =>
        Boolean(entry.rings) && entry.rawWeight > 0
    );

  if (resolved.length === 0) {
    return { kind: "people-field-missing" };
  }

  const maxWeight = Math.max(...resolved.map((entry) => entry.rawWeight));

  const areas: PeopleFieldArea[] = resolved.map((entry) => ({
    countryId: entry.countryId,
    center: largestRingCentroid(entry.rings),
    populationShare: maxWeight > 0 ? entry.rawWeight / maxWeight : 0,
  }));

  return { kind: "people-field", areas };
}

// ─── Language family: derived choropleth, dashed boundary, tint by member count ─

/**
 * One country of the footprint, carrying its own density. A single tint for the
 * whole family could only ever say "this family is here"; the reader's question
 * is where it is *concentrated*, and that needs a value per country.
 */
export interface FamilyFootprintCountry {
  countryId: CountryId;
  rings: Ring[];
  /** How many member peoples name this country in their currentCountries. */
  memberCount: number;
  /**
   * 0..1, normalised to the densest country of this footprint, which is always
   * exactly 1. This is the choropleth's input; AtlasGlobe turns it into an
   * opacity. Relative to the family, never to some absolute scale: a small
   * family's densest country should read as strongly on its own fiche as a
   * large family's does on its.
   */
  weight: number;
}

export interface FamilyFootprintOverlay {
  kind: "family-footprint";
  /** Densest first, ties broken on the country id — see buildFamilyFootprintOverlay. */
  countries: FamilyFootprintCountry[];
  /** The family's own member count, which is *not* the sum of memberCount above. */
  memberPeopleCount: number;
}

/**
 * The footprint is the union of `currentCountries` over every people carrying
 * this family's languageFamilyId — never the family's own
 * `distribution.distributionByCountry`, which the recette database reads empty
 * for all 24 families (atlas-charter §4). `memberCurrentCountries` is one array
 * per member people; the caller (the family fiche route) is the one that
 * already knows which peoples carry this family's id.
 *
 * The order is total on purpose. Twelve of the seventeen countries in the
 * reference family sit at one people each, so density alone leaves them
 * unordered and their relative positions would depend on input order — the
 * ranking and the country picker would reshuffle between two renders of the
 * same data. Ties therefore break on the country id.
 */
// @req REQ-116
export function buildFamilyFootprintOverlay(
  memberCurrentCountries: CountryId[][],
  memberPeopleCount: number
): FamilyFootprintOverlay | null {
  const memberCountByCountry = new Map<CountryId, number>();
  for (const declaredCountries of memberCurrentCountries) {
    // Deduplicated per people: currentCountries is a declared list, not a set,
    // and one fiche repeating a country must not inflate that country's tint.
    for (const countryId of new Set(declaredCountries)) {
      memberCountByCountry.set(
        countryId,
        (memberCountByCountry.get(countryId) ?? 0) + 1
      );
    }
  }

  const drawable = Array.from(memberCountByCountry.entries())
    .map(([countryId, memberCount]) => ({
      countryId,
      memberCount,
      rings: getAdmin0Rings(countryId),
    }))
    // Excluded, not drawn at zero: a country the committed asset cannot draw
    // has no shape to tint, and a zero-weight entry would still take a row in
    // the ranking and an option in the picker.
    .filter(
      (entry): entry is typeof entry & { rings: Ring[] } =>
        entry.rings !== undefined
    );

  if (drawable.length === 0) return null;

  const densest = Math.max(...drawable.map((entry) => entry.memberCount));

  const countries = drawable
    .sort(
      (a, b) =>
        b.memberCount - a.memberCount || a.countryId.localeCompare(b.countryId)
    )
    .map(({ countryId, rings, memberCount }) => ({
      countryId,
      rings,
      memberCount,
      weight: memberCount / densest,
    }));

  return { kind: "family-footprint", countries, memberPeopleCount };
}

export type AtlasOverlay =
  | CountryOutlineOverlay
  | PeopleFieldOverlay
  | PeopleFieldMissingOverlay
  | FamilyFootprintOverlay;
