import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GLOBE_LIGHTING,
  GLOBE_PALETTE_FALLBACK,
  resolveGlobePalette,
} from "@/lib/atlas/globePalette";

const colorCss = readFileSync(
  resolve(process.cwd(), "src/styles/tokens/color.css"),
  "utf8"
);

function declaredValue(token: string): string {
  const match = colorCss.match(new RegExp(`${token}:\\s*([^;]+);`));
  if (!match) throw new Error(`Missing token ${token}`);
  return match[1].trim();
}

describe("globePalette (REQ-112)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The fallback exists so a globe never paints an empty texture, but a
  // fallback that has drifted from the tokens is a second palette nobody
  // knows about — this is what stops the two diverging silently.
  // @req REQ-112
  it("keeps the committed night fallback identical to the color.css tokens", () => {
    expect(declaredValue("--afh-globe-ocean")).toBe(
      GLOBE_PALETTE_FALLBACK.night.ocean
    );
    expect(declaredValue("--afh-globe-graticule")).toBe(
      GLOBE_PALETTE_FALLBACK.night.graticule
    );
    expect(declaredValue("--afh-globe-graticule-major")).toBe(
      GLOBE_PALETTE_FALLBACK.night.graticuleMajor
    );
    expect(declaredValue("--afh-globe-land")).toBe(
      GLOBE_PALETTE_FALLBACK.night.land
    );
    expect(declaredValue("--afh-globe-land-far")).toBe(
      GLOBE_PALETTE_FALLBACK.night.landFar
    );
  });

  // @req REQ-112
  it("keeps the committed parchment fallback identical to the color.css tokens", () => {
    expect(declaredValue("--afh-globe-parchment-ocean")).toBe(
      GLOBE_PALETTE_FALLBACK.parchment.ocean
    );
    expect(declaredValue("--afh-globe-parchment-graticule")).toBe(
      GLOBE_PALETTE_FALLBACK.parchment.graticule
    );
    expect(declaredValue("--afh-globe-parchment-graticule-major")).toBe(
      GLOBE_PALETTE_FALLBACK.parchment.graticuleMajor
    );
    expect(declaredValue("--afh-globe-parchment-coast")).toBe(
      GLOBE_PALETTE_FALLBACK.parchment.coast
    );
    expect(declaredValue("--afh-globe-parchment-land-far")).toBe(
      GLOBE_PALETTE_FALLBACK.parchment.landFar
    );
  });

  // coast and equator are declared as var(...) aliases, so the fallback
  // has to carry the value the alias resolves to, not the alias text.
  // @req REQ-112
  it("resolves the aliased coast and equator tokens to their target values", () => {
    expect(declaredValue("--afh-globe-coast")).toBe(
      "var(--afh-night-ocre-soft)"
    );
    expect(declaredValue("--afh-night-ocre-soft")).toBe(
      GLOBE_PALETTE_FALLBACK.night.coast
    );
    expect(declaredValue("--afh-globe-equator")).toBe("var(--afh-cat-perv)");
    expect(declaredValue("--afh-cat-perv")).toBe(
      GLOBE_PALETTE_FALLBACK.night.equator
    );
    expect(declaredValue("--afh-globe-tissot-edge")).toBe(
      "var(--afh-cat-teal)"
    );
    expect(declaredValue("--afh-cat-teal")).toBe(
      GLOBE_PALETTE_FALLBACK.night.tissotEdge
    );
  });

  // The parchment sphere keeps the same two instruments — the equator and
  // the indicatrices — on the same categorical accents, so a reader who
  // switches surface is not also asked to relearn what a colour means.
  // @req REQ-112
  it("keeps the parchment instruments on the same categorical accents", () => {
    expect(declaredValue("--afh-globe-parchment-equator")).toBe(
      "var(--afh-cat-perv)"
    );
    expect(declaredValue("--afh-globe-parchment-tissot-edge")).toBe(
      "var(--afh-cat-teal)"
    );
    expect(GLOBE_PALETTE_FALLBACK.parchment.equator).toBe(
      GLOBE_PALETTE_FALLBACK.night.equator
    );
    expect(GLOBE_PALETTE_FALLBACK.parchment.tissotEdge).toBe(
      GLOBE_PALETTE_FALLBACK.night.tissotEdge
    );
  });

  // @req REQ-112
  it("keeps the indicatrix fill in step with the token too", () => {
    expect(declaredValue("--afh-globe-tissot")).toBe(
      GLOBE_PALETTE_FALLBACK.night.tissot
    );
    expect(declaredValue("--afh-globe-parchment-tissot")).toBe(
      GLOBE_PALETTE_FALLBACK.parchment.tissot
    );
  });

  // @req REQ-112
  it("prefers the live token over the fallback when the document answers", () => {
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: (token: string) =>
        token === "--afh-globe-land" ? " #ff0000 " : "",
    } as unknown as CSSStyleDeclaration);

    const palette = resolveGlobePalette("night");

    expect(palette.land).toBe("#ff0000");
    expect(palette.ocean).toBe(GLOBE_PALETTE_FALLBACK.night.ocean);
  });

  // The two surfaces have to read different tokens, or the parchment globe
  // silently repaints itself in the night palette.
  // @req REQ-112
  it("reads the parchment tokens when the parchment surface is asked for", () => {
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: (token: string) =>
        token === "--afh-globe-parchment-land" ? " #00ff00 " : "",
    } as unknown as CSSStyleDeclaration);

    expect(resolveGlobePalette("parchment").land).toBe("#00ff00");
    expect(resolveGlobePalette("night").land).toBe(
      GLOBE_PALETTE_FALLBACK.night.land
    );
  });

  // The night sphere is lit against a dark sky, so its limb is lifted by a
  // warm rim to stop the body dissolving into the ground. On parchment the
  // ground is lighter than the sphere, so that same rim reads as a halo —
  // there the edge is already stated by the ocean fill against the page.
  // @req REQ-112
  it("drops the limb rim on parchment and raises its ambient floor", () => {
    expect(GLOBE_LIGHTING.night.rim).toBeGreaterThan(0);
    expect(GLOBE_LIGHTING.parchment.rim).toBe(0);
    expect(GLOBE_LIGHTING.parchment.ambient).toBeGreaterThan(
      GLOBE_LIGHTING.night.ambient
    );
  });
});
