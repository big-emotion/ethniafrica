/**
 * How a family footprint is painted — the numbers only, shared by the WebGL
 * path (AtlasGlobeCanvas) and the SVG fallback (AtlasGlobeFallback).
 *
 * The charter's rule is that no fact about an encoding may exist in only one
 * rendering technique. A choropleth whose ramp lived in the WebGL branch would
 * be a different map in the fallback, and nothing would catch it — so the ramp,
 * the dimming and the dash live here and both branches read them.
 *
 * Values are the mockup's (docs/design/mockups/pages/famille.html, drawFootprint
 * and paintFallback), which is the oracle the parity specs compare against.
 */
import type { Ring } from "@/lib/atlas/overlays";

/**
 * Fill opacity ramps from a floor to a ceiling across the footprint's weights.
 * The floor matters: a country with a single member people must still read as
 * *present*. Zero would erase it, and the whole point of a derived footprint is
 * that presence is the claim being made.
 */
// @req REQ-116
export const FOOTPRINT_FILL_OPACITY_MIN = 0.16;
// @req REQ-116
export const FOOTPRINT_FILL_OPACITY_RANGE = 0.46;

/** What a country falls back to while another one holds the focus. */
// @req REQ-116
export const FOOTPRINT_FILL_OPACITY_DIMMED = 0.12;
// @req REQ-116
export const FOOTPRINT_STROKE_OPACITY = 0.85;
// @req REQ-116
export const FOOTPRINT_STROKE_OPACITY_DIMMED = 0.22;

/** Line widths, in the units each renderer already uses for its strokes. */
// @req REQ-116
export const FOOTPRINT_STROKE_WIDTH = 1.8;
// @req REQ-116
export const FOOTPRINT_STROKE_WIDTH_FOCUSED = 2.8;
// @req REQ-116
export const FOOTPRINT_STROKE_WIDTH_SVG = 2;
// @req REQ-116
export const FOOTPRINT_STROKE_WIDTH_SVG_FOCUSED = 3.2;

/**
 * The dash, in the 800×758 basemap frame — the same frame the mockup's fallback
 * draws in, so these are its literal `stroke-dasharray="9 7"`.
 *
 * The dash is not decoration: a language family has no border, and this
 * aggregate of presences has even less of one than the family does. The broken
 * line is what stops the shape being read as a declared boundary.
 */
// @req REQ-116
export const FOOTPRINT_DASH_ON = 9;
// @req REQ-116
export const FOOTPRINT_DASH_OFF = 7;
// @req REQ-116
export const FOOTPRINT_DASH_ARRAY = `${FOOTPRINT_DASH_ON} ${FOOTPRINT_DASH_OFF}`;

/** How long the trace takes to draw itself in, and the curve it eases on. */
// @req REQ-116
export const FOOTPRINT_REVEAL_DURATION_SECONDS = 1.1;

export interface FootprintPaintState {
  weight: number;
  /** True when some other country holds the focus — not when this one does. */
  dimmed: boolean;
}

// @req REQ-116
export function footprintFillOpacity({
  weight,
  dimmed,
}: FootprintPaintState): number {
  if (dimmed) return FOOTPRINT_FILL_OPACITY_DIMMED;
  const clamped = Math.min(1, Math.max(0, weight));
  return FOOTPRINT_FILL_OPACITY_MIN + FOOTPRINT_FILL_OPACITY_RANGE * clamped;
}

// @req REQ-116
export function footprintStrokeOpacity(dimmed: boolean): number {
  return dimmed ? FOOTPRINT_STROKE_OPACITY_DIMMED : FOOTPRINT_STROKE_OPACITY;
}

/**
 * Ease-out cubic, the mockup's reveal curve. The trace decelerates into place
 * rather than stopping dead, which is what makes it read as being drawn.
 */
// @req REQ-116
export function footprintRevealEase(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return 1 - Math.pow(1 - clamped, 3);
}

const DEG2RAD = Math.PI / 180;

/** Ring perimeter in degrees, longitude scaled by cos(lat) as on the sphere. */
// @req REQ-116
export function ringPerimeterDeg(ring: Ring): number {
  if (ring.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < ring.length; i++) {
    const from = ring[i];
    const to = ring[(i + 1) % ring.length];
    const meanLat = ((from.lat + to.lat) / 2) * DEG2RAD;
    const dLon = (to.lon - from.lon) * Math.cos(meanLat);
    const dLat = to.lat - from.lat;
    perimeter += Math.hypot(dLon, dLat);
  }
  return perimeter;
}

/**
 * The WebGL boundary shader dashes by repeats-per-ring, not by absolute length,
 * so the mockup's fixed 9/7 has to be converted per ring or a small country
 * would get the same number of dashes as a large one and its outline would read
 * as a different texture.
 *
 * The conversion is through the mockup's own equirectangular overlay texture:
 * 2048 px across 360° of longitude, dashed every 9+7 px.
 */
const MOCKUP_OVERLAY_TEXTURE_WIDTH = 2048;
const DEGREES_OF_LONGITUDE = 360;
const TEXTURE_PX_PER_DEG = MOCKUP_OVERLAY_TEXTURE_WIDTH / DEGREES_OF_LONGITUDE;
const DASH_PATTERN_PX = FOOTPRINT_DASH_ON + FOOTPRINT_DASH_OFF;

// @req REQ-116
export function footprintDashRepeats(ring: Ring): number {
  const perimeterPx = ringPerimeterDeg(ring) * TEXTURE_PX_PER_DEG;
  return Math.max(1, Math.round(perimeterPx / DASH_PATTERN_PX));
}
