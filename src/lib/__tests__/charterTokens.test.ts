import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const COLOR_CSS_PATH = join(process.cwd(), "src/styles/tokens/color.css");
const CONSUMER_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);

function readColorCss(): string {
  return readFileSync(COLOR_CSS_PATH, "utf8");
}

function listFilesRecursive(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listFilesRecursive(path);
    return CONSUMER_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });
}

function listStyleFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) => join(dir, entry.name));
}

describe("charter categorical accent tokens (ETNI-798)", () => {
  // @req REQ-091
  it("defines the CVD-validated categorical set with exact hexes", () => {
    const colorCss = readColorCss();
    const catTokens = Object.fromEntries(
      [...colorCss.matchAll(/(--afh-cat-[\w-]+):\s*(#[\dA-Fa-f]{6});/g)].map(
        ([, name, value]) => [name, value.toUpperCase()]
      )
    );

    expect(catTokens).toEqual({
      "--afh-cat-ocre": "#C9821F",
      "--afh-cat-ocre-tint": "#F1D9AE",
      "--afh-cat-ocre-ink": "#835514",
      "--afh-cat-teal": "#33A390",
      "--afh-cat-teal-tint": "#CBE7DF",
      "--afh-cat-teal-ink": "#226D60",
      "--afh-cat-terre": "#C4573F",
      "--afh-cat-terre-tint": "#F0D2C8",
      "--afh-cat-terre-ink": "#974331",
      // The only night ink needing a colour of its own: ocre, teal and perv
      // reuse their base fill, which already clears AA on both night
      // surfaces, so they resolve through var() and never land here.
      "--afh-cat-terre-ink-night": "#CD725E",
      "--afh-cat-perv": "#7A8CE8",
      "--afh-cat-perv-tint": "#DCE1F9",
      "--afh-cat-perv-ink": "#535F9E",
    });
  });

  // @req REQ-091
  it("resolves --accent / --accent-tint via the cat tokens, never a hex literal", () => {
    const colorCss = readColorCss();
    const rootBlock = colorCss.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

    const accentLine = rootBlock.match(/--accent:\s*([^;]+);/)?.[1]?.trim();
    const accentTintLine = rootBlock
      .match(/--accent-tint:\s*([^;]+);/)?.[1]
      ?.trim();

    expect(accentLine).toMatch(/^var\(--afh-cat-[\w-]+\)$/);
    expect(accentTintLine).toMatch(/^var\(--afh-cat-[\w-]+(-tint)?\)$/);
  });

  // @req REQ-091
  it("has no component stylesheet consuming the dormant --afh-night-{ocre,teal,terre,perv} tokens", () => {
    const consumerFiles = [
      ...listFilesRecursive(join(process.cwd(), "src/components")),
      ...listStyleFiles(join(process.cwd(), "src/styles")),
    ].filter((path) => path !== COLOR_CSS_PATH);

    const nightCatPattern = /--afh-night-(ocre|teal|terre|perv)(?![\w-])/;
    const offenders = consumerFiles.filter((path) =>
      nightCatPattern.test(readFileSync(path, "utf8"))
    );

    expect(offenders).toEqual([]);
  });
});

const MOTION_CSS_PATH = join(process.cwd(), "src/styles/tokens/motion.css");
const CHARTER_PATH = join(process.cwd(), "docs/design/atlas-charter.md");

describe("charter motion tokens (atlas charter §6)", () => {
  // The charter names one spring and reserves it for things arriving on
  // screen. While the token was missing, anything wanting it had to inline
  // the curve, which is how a mockup and an app drift apart.
  // @req REQ-091
  it("defines --afh-ease-spring as the curve the charter names", () => {
    const motionCss = readFileSync(MOTION_CSS_PATH, "utf8");
    const spring = motionCss.match(/--afh-ease-spring:\s*([^;]+);/)?.[1];
    // Compared as four numbers, not as a string: whether the author wrote
    // `.22` or `0.22` is Prettier's business, and the curve is the contract.
    const controlPoints = spring
      ?.match(/cubic-bezier\(([^)]+)\)/)?.[1]
      .split(",")
      .map((point) => Number(point));

    expect(controlPoints).toEqual([0.22, 1, 0.36, 1]);
  });

  // A spring is the one easing legible on its own: it travels past its
  // destination and comes back. Collapsing the duration hides that, but only
  // for as long as no caller pairs the curve with a duration of its own, so
  // the curve is flattened at the source as well.
  // @req REQ-091
  it("flattens the spring under prefers-reduced-motion", () => {
    const motionCss = readFileSync(MOTION_CSS_PATH, "utf8");
    const reducedBlock =
      motionCss.match(
        /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)\n\}/
      )?.[1] ?? "";

    expect(reducedBlock).toMatch(/--afh-ease-spring:\s*linear;/);
  });
});

describe("the atlas charter is in the repository", () => {
  // Nothing is "charter-compliant" while the charter lives outside the repo.
  // A docs sweep removed it once without a single gate going red; this is
  // the gate that would have caught it.
  // @req REQ-091
  it("carries the charter document and its load-bearing sections", () => {
    const charter = readFileSync(CHARTER_PATH, "utf8");

    for (const section of [
      "## 1. Cartographic grammar",
      "## 2. Accent scope",
      "## 3. The three entry points",
      "## 4. Saying what the corpus does not have",
      "## 5. The information panel",
      "## 6. Motion",
    ]) {
      expect(charter).toContain(section);
    }
  });

  // §1's hard rule is what the people fiche is built on. If an edit softens
  // it, every encoding test downstream loses the thing it cites.
  // @req REQ-116
  it("states the hard rule that a people never receives a closed line", () => {
    const charter = readFileSync(CHARTER_PATH, "utf8");

    expect(charter).toContain("A people never receives a closed line");
  });
});
