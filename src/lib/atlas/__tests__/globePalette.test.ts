import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
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
  it("keeps the committed fallback identical to the color.css tokens", () => {
    expect(declaredValue("--afh-globe-ocean")).toBe(
      GLOBE_PALETTE_FALLBACK.ocean
    );
    expect(declaredValue("--afh-globe-graticule")).toBe(
      GLOBE_PALETTE_FALLBACK.graticule
    );
    expect(declaredValue("--afh-globe-graticule-major")).toBe(
      GLOBE_PALETTE_FALLBACK.graticuleMajor
    );
    expect(declaredValue("--afh-globe-land")).toBe(GLOBE_PALETTE_FALLBACK.land);
    expect(declaredValue("--afh-globe-land-far")).toBe(
      GLOBE_PALETTE_FALLBACK.landFar
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
      GLOBE_PALETTE_FALLBACK.coast
    );
    expect(declaredValue("--afh-globe-equator")).toBe("var(--afh-cat-perv)");
    expect(declaredValue("--afh-cat-perv")).toBe(
      GLOBE_PALETTE_FALLBACK.equator
    );
    expect(declaredValue("--afh-globe-tissot-edge")).toBe(
      "var(--afh-cat-teal)"
    );
    expect(declaredValue("--afh-cat-teal")).toBe(
      GLOBE_PALETTE_FALLBACK.tissotEdge
    );
  });

  // @req REQ-112
  it("keeps the indicatrix fill in step with the token too", () => {
    expect(declaredValue("--afh-globe-tissot")).toBe(
      GLOBE_PALETTE_FALLBACK.tissot
    );
  });

  // @req REQ-112
  it("prefers the live token over the fallback when the document answers", () => {
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: (token: string) =>
        token === "--afh-globe-land" ? " #ff0000 " : "",
    } as unknown as CSSStyleDeclaration);

    const palette = resolveGlobePalette();

    expect(palette.land).toBe("#ff0000");
    expect(palette.ocean).toBe(GLOBE_PALETTE_FALLBACK.ocean);
  });
});
