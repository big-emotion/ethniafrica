import { AFRICA_GEO_BOUNDS, BASEMAP_VIEWBOX } from "@/lib/atlas/projection";
import { AFRICA_LANDMASS_PATH } from "@/lib/atlas/assets/africaLandmassPath";
import { WORLD_LANDMASS_PATH } from "@/lib/atlas/assets/worldLandmassPath";
import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";

/**
 * The sphere is textured with a whole-world equirectangular image, not an
 * Africa-shaped crop: a globe you can spin has a far side, and a texture
 * that stopped at Africa's bounds would leave it blank. Africa is the only
 * landmass the corpus can vouch for, so it is the only one painted as
 * terrain — with a coast line, in the earth palette. The other continents
 * are drawn under it as a faint silhouette in the hero title's own ink:
 * they put Africa on a real planet, which is what a globe with one
 * continent on it could not do, while the difference in treatment keeps
 * saying which of them this atlas actually documents.
 */
// @req REQ-112
export const GLOBE_TEXTURE_SIZE = { width: 2048, height: 1024 } as const;

// @req REQ-112
export const GRATICULE_STEP_DEGREES = 15;

/** Beyond this latitude the Mercator flat view runs away to infinity. */
// @req REQ-112
export const MERCATOR_LATITUDE_LIMIT = 80;

export interface GlobePalette {
  ocean: string;
  graticule: string;
  graticuleMajor: string;
  land: string;
  landFar: string;
  coast: string;
  equator: string;
  tissot: string;
  tissotEdge: string;
  border: string;
}

/**
 * Tissot's indicatrix: a ring of constant angular radius, so every disc
 * covers the same real area wherever it sits. That is the whole argument —
 * on the sphere they are visibly identical, and as the surface flattens
 * into Mercator they swell toward the poles by sec²(latitude), ×4 at 60°.
 * The reader is shown the distortion rather than told about it.
 */
// @req REQ-112
export const TISSOT_RADIUS_DEGREES = 4.2;
// @req REQ-112
export const TISSOT_SPACING_DEGREES = 30;
/** Past this latitude the discs crowd into an unreadable band. */
// @req REQ-112
export const TISSOT_LATITUDE_LIMIT = 60;

// @req REQ-112
export const lonToTextureX = (lon: number): number =>
  ((lon + 180) / 360) * GLOBE_TEXTURE_SIZE.width;

// @req REQ-112
export const latToTextureY = (lat: number): number =>
  ((90 - lat) / 180) * GLOBE_TEXTURE_SIZE.height;

export interface Meridian {
  lon: number;
  major: boolean;
}

export interface Parallel {
  lat: number;
  equator: boolean;
}

export interface Graticule {
  meridians: Meridian[];
  parallels: Parallel[];
}

// @req REQ-112
export function buildGraticule(): Graticule {
  const meridians: Meridian[] = [];
  for (let lon = -180; lon <= 180; lon += GRATICULE_STEP_DEGREES) {
    meridians.push({ lon, major: lon % 90 === 0 });
  }

  // Parallels stop short of the poles: at 90° a parallel collapses to a
  // point, and the ones just below it crowd into a solid band.
  const parallels: Parallel[] = [];
  for (let lat = -75; lat <= 75; lat += GRATICULE_STEP_DEGREES) {
    parallels.push({ lat, equator: lat === 0 });
  }

  return { meridians, parallels };
}

export interface LandmassTransform {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Places the committed basemap path — authored in its own 800x758 viewBox
 * (assets/README.md) — at Africa's real bounds inside the world texture.
 */
// @req REQ-112
export function landmassTransform(): LandmassTransform {
  const { lonMin, lonMax, latMin, latMax } = AFRICA_GEO_BOUNDS;
  return {
    translateX: lonToTextureX(lonMin),
    translateY: latToTextureY(latMax),
    scaleX:
      (lonToTextureX(lonMax) - lonToTextureX(lonMin)) / BASEMAP_VIEWBOX.width,
    scaleY:
      (latToTextureY(latMin) - latToTextureY(latMax)) / BASEMAP_VIEWBOX.height,
  };
}

export interface LonLatDegrees {
  lon: number;
  lat: number;
}

/**
 * The boundary of a circle of constant angular radius around a point, in
 * lon/lat — the great-circle offset formula, so the ring stays a true
 * circle on the sphere rather than an ellipse drawn in map coordinates.
 */
// @req REQ-112
export function geodesicCircle(
  centre: LonLatDegrees,
  radiusDegrees: number,
  steps = 72
): LonLatDegrees[] {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const lat0 = centre.lat * toRad;
  const lon0 = centre.lon * toRad;
  const radius = radiusDegrees * toRad;

  const ring: LonLatDegrees[] = [];
  for (let step = 0; step <= steps; step++) {
    const bearing = (step / steps) * 2 * Math.PI;
    const lat = Math.asin(
      Math.sin(lat0) * Math.cos(radius) +
        Math.cos(lat0) * Math.sin(radius) * Math.cos(bearing)
    );
    const lon =
      lon0 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(radius) * Math.cos(lat0),
        Math.cos(radius) - Math.sin(lat0) * Math.sin(lat)
      );
    ring.push({
      lat: lat * toDeg,
      lon: ((lon * toDeg + 540) % 360) - 180,
    });
  }
  return ring;
}

/** Centres of the indicatrix grid, one every TISSOT_SPACING_DEGREES. */
// @req REQ-112
export function tissotCentres(): LonLatDegrees[] {
  const centres: LonLatDegrees[] = [];
  for (
    let lat = -TISSOT_LATITUDE_LIMIT;
    lat <= TISSOT_LATITUDE_LIMIT;
    lat += TISSOT_SPACING_DEGREES
  ) {
    for (let lon = -180; lon < 180; lon += TISSOT_SPACING_DEGREES) {
      centres.push({ lon, lat });
    }
  }
  return centres;
}

function paintTissot(
  ctx: CanvasRenderingContext2D,
  palette: GlobePalette
): void {
  for (const centre of tissotCentres()) {
    const ring = geodesicCircle(centre, TISSOT_RADIUS_DEGREES);
    ctx.beginPath();
    let previousX: number | null = null;
    ring.forEach(({ lon, lat }, index) => {
      const x = lonToTextureX(lon);
      const y = latToTextureY(lat);
      // A disc straddling ±180° wraps to the far edge of the texture;
      // drawing straight through would smear a band across the world.
      if (
        previousX !== null &&
        Math.abs(x - previousX) > GLOBE_TEXTURE_SIZE.width / 2
      ) {
        ctx.moveTo(x, y);
      } else if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      previousX = x;
    });
    ctx.closePath();
    ctx.fillStyle = palette.tissot;
    ctx.fill();
    ctx.strokeStyle = palette.tissotEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * The admin-0 rings of every committed country, stroked at the border
 * colour. The same asset the country overlays are built from, so a
 * highlighted outline lands exactly on the boundary painted here.
 */
const AFRICA_ADMIN0_LIST = Object.values(AFRICA_ADMIN0);

function paintCountryBorders(
  ctx: CanvasRenderingContext2D,
  palette: GlobePalette
): void {
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;

  for (const country of AFRICA_ADMIN0_LIST) {
    for (const ring of country.rings) {
      if (ring.length < 2) continue;
      ctx.beginPath();
      ring.forEach(([lon, lat], index) => {
        const x = lonToTextureX(lon);
        const y = latToTextureY(lat);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      // The committed rings already repeat their first point, so the path
      // closes itself and needs no closePath.
      ctx.stroke();
    }
  }
}

export interface GlobeTextureOptions {
  /** Draws Tissot's indicatrices over the terrain. */
  showTissot?: boolean;
  /**
   * Draws the admin-0 national boundaries. A fiche wants them — a country
   * surlignage floating on a blank continent has nothing to be read
   * against — while the home hero does not, which is why this is opt-in.
   */
  showBorders?: boolean;
}

/**
 * Paints the world texture: ocean, graticule, the far continents, then the
 * African landmass.
 */
// @req REQ-112
export function paintGlobeTexture(
  ctx: CanvasRenderingContext2D,
  palette: GlobePalette,
  options: GlobeTextureOptions = {}
): void {
  const { width, height } = GLOBE_TEXTURE_SIZE;

  ctx.fillStyle = palette.ocean;
  ctx.fillRect(0, 0, width, height);

  const { meridians, parallels } = buildGraticule();

  ctx.lineWidth = 1;
  for (const { lon, major } of meridians) {
    ctx.strokeStyle = major ? palette.graticuleMajor : palette.graticule;
    ctx.beginPath();
    ctx.moveTo(lonToTextureX(lon), 0);
    ctx.lineTo(lonToTextureX(lon), height);
    ctx.stroke();
  }

  for (const { lat, equator } of parallels) {
    ctx.strokeStyle = equator ? palette.equator : palette.graticule;
    ctx.lineWidth = equator ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(0, latToTextureY(lat));
    ctx.lineTo(width, latToTextureY(lat));
    ctx.stroke();
  }

  // The other continents first, at their own faint ink and with no coast
  // line of their own: they are the planet Africa sits on, not a second
  // subject. Africa goes on top, so overlapping ink can only ever read in
  // its favour.
  const world = new Path2D(WORLD_LANDMASS_PATH);
  ctx.fillStyle = palette.landFar;
  ctx.fill(world);

  const { translateX, translateY, scaleX, scaleY } = landmassTransform();
  ctx.save();
  ctx.translate(translateX, translateY);
  ctx.scale(scaleX, scaleY);
  const landmass = new Path2D(AFRICA_LANDMASS_PATH);
  ctx.fillStyle = palette.land;
  ctx.fill(landmass);
  // The stroke is specified in texture pixels, so it has to be divided
  // back out of the scale it is being drawn under.
  ctx.strokeStyle = palette.coast;
  ctx.lineWidth = 2 / scaleX;
  ctx.stroke(landmass);
  ctx.restore();

  // After the landmass so the boundaries sit on the terrain, and before
  // every overlay so a chosen country's surlignage always covers them.
  if (options.showBorders) {
    paintCountryBorders(ctx, palette);
  }

  // Last, so the discs sit over the terrain they are measuring.
  if (options.showTissot) {
    paintTissot(ctx, palette);
  }
}
