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
import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";
import {
  getAdmin0Rings,
  ringCentroid,
  type AtlasOverlay,
  type LonLat,
  type Ring,
} from "@/lib/atlas/overlays";

const DEG2RAD = Math.PI / 180;

/** A country too small to measure still deserves a bounded dolly, not a division by zero. */
const MIN_ANGULAR_SPAN_DEG = 0.5;

export interface AtlasTarget {
  countryId: CountryId;
  /** The committed admin-0 asset's own French name — the app is French-only, and this saves inventing a second name table. */
  nameFr: string;
  /** Where the camera must point for this target to face the reader. */
  center: LonLat;
  /**
   * How wide the target reads on the sphere, in degrees. Longitude extent is
   * scaled by cos(latitude) because a degree of longitude covers less ground
   * the further it sits from the equator — without that, a country near a
   * pole would be dollied out as if it were continent-wide.
   */
  angularSpanDeg: number;
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
    nameFr: AFRICA_ADMIN0[countryId].nameFr,
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
  }
}
