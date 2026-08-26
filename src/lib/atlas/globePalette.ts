import type { GlobePalette } from "@/lib/atlas/globeTexture";

/**
 * The globe's colours, resolved from the --afh-globe-* tokens at runtime
 * so the CSS stays the single source of truth (color.css). A WebGL texture
 * needs literal colour strings, not `var(...)`, which is why they are read
 * rather than referenced.
 *
 * DEC-022 keeps dataviz on the Night surface whatever the reader's page
 * theme, so there is one palette here and no parchment counterpart — a lit
 * body only reads as a body against a dark sky.
 */
// @req REQ-112
const TOKEN_BY_ROLE: Record<keyof GlobePalette, string> = {
  ocean: "--afh-globe-ocean",
  graticule: "--afh-globe-graticule",
  graticuleMajor: "--afh-globe-graticule-major",
  land: "--afh-globe-land",
  coast: "--afh-globe-coast",
  equator: "--afh-globe-equator",
  tissot: "--afh-globe-tissot",
  tissotEdge: "--afh-globe-tissot-edge",
};

// The committed values of the tokens above. They stand in wherever
// getComputedStyle cannot answer — server rendering, a detached canvas in
// a test — so the globe never falls back to an unpainted texture.
// globePalette.test.ts reads color.css and fails if the two drift apart.
export const GLOBE_PALETTE_FALLBACK: GlobePalette = {
  ocean: "#120e0a",
  graticule: "#42341f",
  graticuleMajor: "#5d4a2e",
  land: "#6b4a22",
  coast: "#e8b96a",
  equator: "#7a8ce8",
  tissot: "rgba(51, 163, 144, 0.3)",
  tissotEdge: "#33a390",
};

function readToken(role: keyof GlobePalette): string {
  if (typeof window === "undefined") return GLOBE_PALETTE_FALLBACK[role];
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(TOKEN_BY_ROLE[role])
    .trim();
  return value || GLOBE_PALETTE_FALLBACK[role];
}

/** Resolves the night palette against the document's current tokens. */
// @req REQ-112
export function resolveGlobePalette(): GlobePalette {
  return {
    ocean: readToken("ocean"),
    graticule: readToken("graticule"),
    graticuleMajor: readToken("graticuleMajor"),
    land: readToken("land"),
    coast: readToken("coast"),
    equator: readToken("equator"),
    tissot: readToken("tissot"),
    tissotEdge: readToken("tissotEdge"),
  };
}
