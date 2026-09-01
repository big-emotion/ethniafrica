// @req REQ-120 — Charter contract for the Jouer games module
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract test for the Jouer games (REQ-120). It is named *Charter* so
 * `discoverCharterNamedTests()` enrols it with no manifest edit.
 *
 * It reads source rather than rendering, for the same reason the other
 * charter suites do: these are statements about how the code is written —
 * which colours it may name, which engine it may mount — and a render test
 * would only prove the one path it exercised.
 */

const PLAY_DIR = join(process.cwd(), "src", "components", "play");
const HUB_REGISTRY = join(
  process.cwd(),
  "src",
  "lib",
  "hubs",
  "moduleRegistry.ts"
);

function playComponentFiles(): string[] {
  return readdirSync(PLAY_DIR)
    .filter((file) => file.endsWith(".tsx") && !file.includes(".test."))
    .sort();
}

function readPlaySource(file: string): string {
  return readFileSync(join(PLAY_DIR, file), "utf8");
}

/** Colour literals of every spelling. Colours belong in tokens, not in JSX. */
const RAW_HEX_OR_RGB = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(/;
const RAW_PALETTE_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke)-(?:red|green|gray|grey|blue|yellow|indigo|purple|pink|orange|teal|slate|zinc|neutral|stone|amber|lime|emerald|cyan|sky|violet|fuchsia|rose)-[0-9]{2,3}\b/;

/**
 * UX-DR27/34: the games teach, they do not celebrate. The quiz score card
 * already holds this line; the games inherit it.
 */
const EXCLAMATION_IN_COPY = /[A-Za-zÀ-ÿ0-9»)][  ]*![  ]*["'`»]/;
const EMOJI = /\p{Extended_Pictographic}/u;

describe("Jouer games charter contract (REQ-120)", () => {
  const files = playComponentFiles();

  // @req REQ-120
  it("has play components to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  describe.each(files)("%s", (file) => {
    // @req REQ-120
    it("contains no raw hex, rgb or hsl colour literal", () => {
      const offenders = readPlaySource(file)
        .split("\n")
        .filter((line) => RAW_HEX_OR_RGB.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-120
    it("names no raw Tailwind palette colour", () => {
      const offenders = readPlaySource(file)
        .split("\n")
        .filter((line) => RAW_PALETTE_CLASS.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-120
    it("carries no emoji in its copy", () => {
      const offenders = readPlaySource(file)
        .split("\n")
        .filter((line) => EMOJI.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-120
    it("ends no sentence of copy with an exclamation mark", () => {
      const offenders = readPlaySource(file)
        .split("\n")
        .filter((line) => EXCLAMATION_IN_COPY.test(line));
      expect(offenders).toEqual([]);
    });
  });

  // @req REQ-120
  it("declares the Jouer accent in the token registry, not in a component", () => {
    expect(readFileSync(HUB_REGISTRY, "utf8")).toContain(
      'jeux: "afh-accent-perv"'
    );

    const inlined = playComponentFiles().filter((file) =>
      readPlaySource(file).includes("afh-accent-perv")
    );
    // The accent reaches a game through the hub's ACCENT_BY_ACCESS_MODE map.
    // A component naming the token itself has forked the mapping.
    expect(inlined).toEqual([]);
  });

  /**
   * `GlobeTap` was the one play component allowed to reach a globe, and it
   * went with « Le pays d'avant ». The Mercator page does show a globe, but
   * it is the home's stage mounted by the route above the play loop — not a
   * second engine built inside one of these components.
   */
  // @req REQ-120
  it("mounts no globe engine of its own: the play components stay flat", () => {
    const globeConsumers = playComponentFiles().filter((file) =>
      /AtlasGlobe|AtlasGlobeCanvas|WebGLRenderingContext|getContext\(\s*["'`]webgl/.test(
        readPlaySource(file)
      )
    );
    expect(globeConsumers).toEqual([]);
  });

  // @req REQ-120
  it("draws its own canvas nowhere: the area comparison is plain SVG", () => {
    const canvasUsers = playComponentFiles().filter((file) =>
      /<canvas|createElement\(\s*["'`]canvas/.test(readPlaySource(file))
    );
    expect(canvasUsers).toEqual([]);
  });

  // @req REQ-120
  it("gives every tappable primitive a 44px minimum target", () => {
    // The four primitives are what a finger lands on; the reveal and the
    // score card are read, then dismissed by one button the same rule covers.
    const primitives = [
      "BinaryChoice.tsx",
      "EstimateSlider.tsx",
      "QuadChoice.tsx",
      "AreaCompare.tsx",
      "GlobeTap.tsx",
    ].filter((file) => files.includes(file));

    expect(primitives.length).toBeGreaterThan(0);
    for (const file of primitives) {
      expect(readPlaySource(file)).toMatch(/min-h-\[44px\]|min-h-11/);
    }
  });
});
