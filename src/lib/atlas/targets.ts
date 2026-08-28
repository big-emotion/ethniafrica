/**
 * The choosable targets of a fiche globe (REQ-117). A target is always a
 * country — that is the only unit all three REQ-116 overlays share — carrying
 * where the camera must look and how wide the thing is, which is what decides
 * the dolly.
 *
 * This is the seam between the overlays and the camera: `camera.ts` never
 * reads an overlay, so a new encoding costs a case here and nothing else.
 */
import type { CountryId } from "@/types/afrik";
import {
  getAdmin0NameFr,
  getAdmin0Rings,
  ringCentroid,
  type AtlasOverlay,
  type LonLat,
  type Ring,
} from "@/lib/atlas/overlays";

const DEG2RAD = Math.PI / 180;

/** A country too small to measure still deserves a bounded dolly, not a division by zero. */
const MIN_ANGULAR_SPAN_DEG = 0.5;

/** cos(latitude) at 88°, the floor that keeps a near-polar frame finite. */
const MIN_LON_SCALE = 0.035;

/**
 * What the camera reads of a target: where to look, and how wide the thing is.
 * Split out from `AtlasTarget` because the frame that encloses a whole entity
 * is not a country and must not pretend to be one — it has a centre and a span
 * and no id to name.
 */
export interface TargetFrame {
  /** Where the camera must point for this frame to face the reader. */
  center: LonLat;
  /**
   * How wide the frame reads on the sphere, in degrees. Longitude extent is
   * scaled by cos(latitude) because a degree of longitude covers less ground
   * the further it sits from the equator — without that, a country near a
   * pole would be dollied out as if it were continent-wide.
   */
  angularSpanDeg: number;
}

export interface AtlasTarget extends TargetFrame {
  countryId: CountryId;
  /** The committed admin-0 asset's own French name — the app is French-only, and this saves inventing a second name table. */
  nameFr: string;
  /** Set only by the continent scene, where a target names a country's documented peoples. */
  documentedPeopleCount?: number;
}

// @req REQ-117
export function ringsAngularSpanDeg(rings: Ring[]): number {
  const points = rings.flat();
  if (points.length === 0) return MIN_ANGULAR_SPAN_DEG;

  const lons = points.map((point) => point.lon);
  const lats = points.map((point) => point.lat);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const centerLat = (latMin + latMax) / 2;

  const lonExtent =
    (Math.max(...lons) - Math.min(...lons)) * Math.cos(centerLat * DEG2RAD);
  const latExtent = latMax - latMin;

  return Math.max(lonExtent, latExtent, MIN_ANGULAR_SPAN_DEG);
}

function targetForCountry(
  countryId: CountryId,
  center?: LonLat
): AtlasTarget | null {
  const rings = getAdmin0Rings(countryId);
  if (!rings || rings.length === 0) return null;

  const largest = rings.reduce((best, ring) =>
    ring.length > best.length ? ring : best
  );

  return {
    countryId,
    nameFr: getAdmin0NameFr(countryId) ?? countryId,
    center: center ?? ringCentroid(largest),
    angularSpanDeg: ringsAngularSpanDeg(rings),
  };
}

/**
 * A people fiche's targets keep the field's own weighted centres: the overlay
 * already decided where each area sits, and deriving a second centre here
 * would let the marker drift off the blob it is meant to name.
 */
// @req REQ-117
export function buildAtlasTargets(overlay: AtlasOverlay | null): AtlasTarget[] {
  if (!overlay) return [];

  switch (overlay.kind) {
    case "people-field-missing":
      return [];
    case "country-outline":
      return [targetForCountry(overlay.countryId)].filter(
        (target): target is AtlasTarget => target !== null
      );
    case "people-field":
      return overlay.areas
        .map((area) => targetForCountry(area.countryId, area.center))
        .filter((target): target is AtlasTarget => target !== null);
    // Kept in the overlay's own density order: the country picker is built from
    // these targets and the footprint ranking from the overlay, so a divergence
    // would make the nth option and the nth row name different countries.
    case "family-footprint":
      return overlay.countries
        .map((country) => targetForCountry(country.countryId))
        .filter((target): target is AtlasTarget => target !== null);
    // A game's country set carries no ranking of its own — the round decides
    // the order, so the targets keep the order the round handed in.
    case "country-set":
      return overlay.countryIds
        .map((countryId) => targetForCountry(countryId))
        .filter((target): target is AtlasTarget => target !== null);
    // The frame is 51 countries of geographic reference; only an area is a
    // claim about the corpus, so only an area earns a marker.
    case "continent-field":
      return overlay.areas
        .map((area): AtlasTarget | null => {
          const target = targetForCountry(area.countryId, area.center);
          return target
            ? {
                ...target,
                documentedPeopleCount: area.documentedPeopleCount,
              }
            : null;
        })
        .filter((target): target is AtlasTarget => target !== null);
  }
}

/**
 * What the continent scene's panel opens with. The count lives in the
 * description because the title doubles as the marker's accessible name, and
 * a marker called "Nigeria 40" reads as a quantity of Nigerians. The wording
 * says "documentés" for the same reason: this counts fiches in the corpus,
 * never people in a country.
 */
// @req REQ-117
export function continentTargetFacts(target: AtlasTarget): {
  title: string;
  description: string;
} {
  const count = target.documentedPeopleCount ?? 0;
  return {
    title: target.nameFr,
    description:
      count === 1 ? "1 peuple documenté" : `${count} peuples documentés`,
  };
}

/**
 * The choosable countries of a country fiche's picker (REQ-117).
 *
 * Fed the corpus's own list rather than the asset's keys: the corpus decides
 * which countries have a fiche, and building the list from the geometry would
 * offer Mayotte and Somaliland, which have none. Resolution runs the other way
 * — each corpus id is looked up in the asset, through the same alias that lets
 * SSD find the shape filed as SDS.
 *
 * The name comes from the asset because the corpus stores the declared name:
 * `nameFr` on a country fiche is "Republique algerienne democratique et
 * populaire (...)", which is what a reader gets when the picker reads it.
 */
// @req REQ-117
export function buildCountryPickerTargets(
  countryIds: readonly CountryId[]
): AtlasTarget[] {
  return countryIds
    .map((countryId) => targetForCountry(countryId))
    .filter((target): target is AtlasTarget => target !== null)
    .sort((first, second) => first.nameFr.localeCompare(second.nameFr, "fr"));
}

/**
 * The frame that holds a whole entity: a family's footprint, a people's field,
 * a country's own outline. « Recentrer » aims here, so a reader who has turned
 * the globe or opened one country of seventeen gets the subject back rather
 * than the planet.
 *
 * Each target is taken as a box `angularSpanDeg` across, centred on the centre
 * the overlay already chose. Re-measuring the rings would be more exact and
 * would be wrong: the markers are placed from those centres, so a frame built
 * from anything else would sit off the pastilles it is meant to gather.
 *
 * Longitude is un-scaled by cos(lat) on the way in and re-scaled on the way
 * out, which is the convention `ringsAngularSpanDeg` sets — mixing the two
 * would make a Sahelian family read as twice its width.
 *
 * The antimeridian is not handled, and does not need to be: the corpus spans
 * 26°W to 64°E. A target set straddling ±180° would need the seam.
 */
// @req REQ-112
export function enclosingFrame(
  targets: readonly AtlasTarget[]
): TargetFrame | null {
  if (targets.length === 0) return null;

  let lonMin = Infinity;
  let lonMax = -Infinity;
  let latMin = Infinity;
  let latMax = -Infinity;

  for (const target of targets) {
    const halfLat = target.angularSpanDeg / 2;
    // A target sitting on a pole would divide the half-width by zero. Nothing
    // in the corpus does, and the floor costs one comparison.
    const lonScale = Math.max(
      Math.cos(target.center.lat * DEG2RAD),
      MIN_LON_SCALE
    );
    const halfLon = halfLat / lonScale;

    latMin = Math.min(latMin, target.center.lat - halfLat);
    latMax = Math.max(latMax, target.center.lat + halfLat);
    lonMin = Math.min(lonMin, target.center.lon - halfLon);
    lonMax = Math.max(lonMax, target.center.lon + halfLon);
  }

  const centerLat = (latMin + latMax) / 2;
  const centerLon = (lonMin + lonMax) / 2;

  return {
    center: { lon: centerLon, lat: centerLat },
    angularSpanDeg: Math.max(
      (lonMax - lonMin) * Math.cos(centerLat * DEG2RAD),
      latMax - latMin,
      MIN_ANGULAR_SPAN_DEG
    ),
  };
}
