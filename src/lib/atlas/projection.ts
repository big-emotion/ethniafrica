export interface AtlasViewport {
  width: number;
  height: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
}

/**
 * Geographic bounds the committed basemap asset
 * (src/lib/atlas/assets/africa-basemap.svg) was generated at — Natural
 * Earth 1:50m admin-0 countries, continent "Africa", dissolved and
 * simplified (see assets/README.md). Both the asset and this projection
 * share these bounds so pixel coordinates never drift apart; changing one
 * requires regenerating the other.
 */
// @req REQ-101
export const AFRICA_GEO_BOUNDS = {
  lonMin: -25,
  lonMax: 52,
  latMin: -35,
  latMax: 38,
} as const;

/** The committed asset's `viewBox="0 0 800 758"`. */
// @req REQ-101
export const BASEMAP_VIEWBOX: AtlasViewport = {
  width: 800,
  height: Math.round(
    (800 * (AFRICA_GEO_BOUNDS.latMax - AFRICA_GEO_BOUNDS.latMin)) /
      (AFRICA_GEO_BOUNDS.lonMax - AFRICA_GEO_BOUNDS.lonMin)
  ),
};

/**
 * Pure linear equirectangular (Plate Carrée) projection — no trigonometry,
 * no d3-geo, no runtime dependency. Longitude maps linearly to x; latitude
 * maps linearly to y, inverted because SVG y grows downward. Both axes
 * scale AFRICA_GEO_BOUNDS onto the given viewport.
 */
// @req REQ-101
export function projectLonLat(
  lon: number,
  lat: number,
  viewport: AtlasViewport
): ProjectedPoint {
  const { lonMin, lonMax, latMin, latMax } = AFRICA_GEO_BOUNDS;
  const x = ((lon - lonMin) / (lonMax - lonMin)) * viewport.width;
  const y = ((latMax - lat) / (latMax - latMin)) * viewport.height;
  return { x, y };
}
