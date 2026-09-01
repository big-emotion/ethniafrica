// @req REQ-091 — Charter V2 search overlay + results shell restyle (ETNI-802 · FR107)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = join(process.cwd(), "src");

function readSource(relativePath: string): string {
  return readFileSync(join(SRC_DIR, relativePath), "utf8");
}

// Legacy shadcn semantic-color utilities that must never appear on restyled
// chrome — every color must resolve through --afh-* instead (see
// charterPrimitives.test.tsx for the primitive-level version of this guard).
const LEGACY_COLOR_CLASS = new RegExp(
  String.raw`(?<!-)\b(?:bg|text|border|ring|from|via|to|fill|stroke)-(?:background|foreground|card(?:-foreground)?|popover(?:-foreground)?|primary(?:-foreground)?|secondary(?:-foreground)?|muted(?:-foreground)?|accent(?:-foreground)?|destructive(?:-foreground)?|input|ring)\b`
);
const RAW_PALETTE_CLASS =
  /\b(?:bg|text|border)-(?:red|green|gray|blue|yellow|indigo|purple|pink)-[0-9]{2,3}\b/;
const RAW_HEX_OR_RGB = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(/;
const LEGACY_RADIUS_CLASS =
  /\brounded(?:-[tlrb][lr]?)?-(?:sm|md|lg|xl|2xl|3xl|none|\[[^\]]+\])(?!\w)/;

// Extracting the result card out of the two surfaces below would have moved
// its markup out of this guard's sight, so the extracted pieces are named
// here in the same change that creates them.
const IN_SCOPE_FILES = [
  "components/search/SearchModalV2.tsx",
  "components/search/SearchResultCard.tsx",
  "components/search/SearchSnippet.tsx",
  "components/search/SearchPivotCard.tsx",
  "components/search/DominantAnswerPanel.tsx",
  "components/pages/RecherchePageContent.tsx",
];

describe("search family tokenization (ETNI-802 · FR107)", () => {
  describe.each(IN_SCOPE_FILES)("%s", (file) => {
    // @req REQ-091
    it("uses no legacy shadcn semantic-color utility", () => {
      const source = readSource(file);
      const offenders = source
        .split("\n")
        .filter((line) => LEGACY_COLOR_CLASS.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-091
    it("uses no raw Tailwind palette color class", () => {
      const source = readSource(file);
      const offenders = source
        .split("\n")
        .filter((line) => RAW_PALETTE_CLASS.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-091
    it("contains no raw hex/rgb/hsl color literal", () => {
      const source = readSource(file);
      const offenders = source
        .split("\n")
        .filter((line) => RAW_HEX_OR_RGB.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-091
    it("uses no legacy (non-charter) radius scale", () => {
      const source = readSource(file);
      const offenders = source
        .split("\n")
        .filter((line) => LEGACY_RADIUS_CLASS.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-091
    it("consumes at least one --afh-* charter token", () => {
      const source = readSource(file);
      expect(source).toMatch(/afh-|--accent/);
    });
  });

  describe("entity-type accent module (searchEntityAccent.tsx)", () => {
    const source = () => readSource("components/search/searchEntityAccent.tsx");

    // @req REQ-091
    it("marks every entity type with a --afh-cat-* accent (never a raw palette color)", () => {
      const offenders = source()
        .split("\n")
        .filter(
          (line) => RAW_PALETTE_CLASS.test(line) || RAW_HEX_OR_RGB.test(line)
        );
      expect(offenders).toEqual([]);
      expect(source()).toMatch(/--afh-cat-/);
    });

    // @req REQ-091
    it("the decorative mark is always paired with a text label — never color alone", () => {
      expect(source()).toMatch(/aria-hidden=\{?"?true"?\}?/);
      expect(source()).toMatch(/getSearchEntityLabel/);
    });
  });
});
