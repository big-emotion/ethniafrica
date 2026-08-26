import type { GlobePalette } from "@/lib/atlas/globeTexture";
import type { SphereLighting } from "@/lib/atlas/sphereLayer";

/**
 * The globe's colours, resolved from the --afh-globe-* tokens at runtime
 * so the CSS stays the single source of truth (color.css). A WebGL texture
 * needs literal colour strings, not `var(...)`, which is why they are read
 * rather than referenced.
 *
 * DEC-022 keeps a fiche's atlas on the Night surface whatever the reader's
 * page theme — there the globe is a panel inside the page, and a lit body
 * reads as a body against a dark sky. The home's globe is not a panel: it
 * is the page's subject, filling the opening band, and pinned to night it
 * read as a hole punched through a parchment page. So there are two
 * palettes here, and the caller says which surface it is painting on.
 */
export type GlobeSurface = "night" | "parchment";

// @req REQ-112
const TOKEN_BY_ROLE: Record<
  GlobeSurface,
  Record<keyof GlobePalette, string>
> = {
  night: {
    ocean: "--afh-globe-ocean",
    graticule: "--afh-globe-graticule",
    graticuleMajor: "--afh-globe-graticule-major",
    land: "--afh-globe-land",
    landFar: "--afh-globe-land-far",
    coast: "--afh-globe-coast",
    equator: "--afh-globe-equator",
    tissot: "--afh-globe-tissot",
    tissotEdge: "--afh-globe-tissot-edge",
    border: "--afh-globe-border",
  },
  parchment: {
    ocean: "--afh-globe-parchment-ocean",
    graticule: "--afh-globe-parchment-graticule",
    graticuleMajor: "--afh-globe-parchment-graticule-major",
    land: "--afh-globe-parchment-land",
    landFar: "--afh-globe-parchment-land-far",
    coast: "--afh-globe-parchment-coast",
    equator: "--afh-globe-parchment-equator",
    tissot: "--afh-globe-parchment-tissot",
    tissotEdge: "--afh-globe-parchment-tissot-edge",
    border: "--afh-globe-parchment-border",
  },
};

// The committed values of the tokens above. They stand in wherever
// getComputedStyle cannot answer — server rendering, a detached canvas in
// a test — so the globe never falls back to an unpainted texture.
// globePalette.test.ts reads color.css and fails if the two drift apart.
// @req REQ-112
export const GLOBE_PALETTE_FALLBACK: Record<GlobeSurface, GlobePalette> = {
  night: {
    ocean: "#120e0a",
    graticule: "#42341f",
    graticuleMajor: "#5d4a2e",
    land: "#6b4a22",
    landFar: "rgba(241, 231, 216, 0.4)",
    coast: "#e8b96a",
    equator: "#7a8ce8",
    tissot: "rgba(51, 163, 144, 0.3)",
    tissotEdge: "#33a390",
    border: "rgba(232, 185, 106, 0.28)",
  },
  parchment: {
    ocean: "#e6dcc7",
    graticule: "#cdbc9f",
    graticuleMajor: "#b09a78",
    land: "#b64e27",
    landFar: "rgba(44, 32, 24, 0.16)",
    coast: "#6b3a1c",
    equator: "#7a8ce8",
    tissot: "rgba(51, 163, 144, 0.28)",
    tissotEdge: "#33a390",
    border: "rgba(107, 58, 28, 0.26)",
  },
};

/**
 * The other half of each palette. Lighting is not decoration here: on
 * night the sphere sits on a ground darker than its own ocean, so it needs
 * the warm limb rim to stop dissolving into it, and a low ambient floor
 * lets the terminator carry the roundness. On parchment the page is
 * *lighter* than the ocean — the disc already states its edge — so the
 * same rim reads as a halo, and a low ambient turns the unlit half into a
 * shadow the parchment surface has nowhere to put.
 */
// @req REQ-112
export const GLOBE_LIGHTING: Record<GlobeSurface, SphereLighting> = {
  night: { ambient: 0.44, rim: 0.3 },
  parchment: { ambient: 0.86, rim: 0 },
};

/**
 * The home looks at the globe from far off; a fiche comes close. At that
 * framing the night palette turns to black — the terminator eats the half
 * of the subject the reader came for, and the limb rim, sized for a small
 * disc, becomes a bright band across it. So the floor comes up and the rim
 * comes down. Same palette, different distance.
 */
// @req REQ-112
export const FICHE_LIGHTING: SphereLighting = { ambient: 0.6, rim: 0.24 };

function readToken(surface: GlobeSurface, role: keyof GlobePalette): string {
  if (typeof window === "undefined")
    return GLOBE_PALETTE_FALLBACK[surface][role];
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(TOKEN_BY_ROLE[surface][role])
    .trim();
  return value || GLOBE_PALETTE_FALLBACK[surface][role];
}

/** Resolves one surface's palette against the document's current tokens. */
// @req REQ-112
export function resolveGlobePalette(
  surface: GlobeSurface = "night"
): GlobePalette {
  return {
    ocean: readToken(surface, "ocean"),
    graticule: readToken(surface, "graticule"),
    graticuleMajor: readToken(surface, "graticuleMajor"),
    land: readToken(surface, "land"),
    landFar: readToken(surface, "landFar"),
    coast: readToken(surface, "coast"),
    equator: readToken(surface, "equator"),
    tissot: readToken(surface, "tissot"),
    tissotEdge: readToken(surface, "tissotEdge"),
    border: readToken(surface, "border"),
  };
}
