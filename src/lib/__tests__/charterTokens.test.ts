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
      "--afh-cat-teal": "#33A390",
      "--afh-cat-teal-tint": "#CBE7DF",
      "--afh-cat-terre": "#C4573F",
      "--afh-cat-terre-tint": "#F0D2C8",
      "--afh-cat-perv": "#7A8CE8",
      "--afh-cat-perv-tint": "#DCE1F9",
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
