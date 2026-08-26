import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const colorCss = readFileSync(
  resolve(process.cwd(), "src/styles/tokens/color.css"),
  "utf8"
);

function tokenHex(name: string): string {
  const match = colorCss.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!match) throw new Error(`Missing hexadecimal token ${name}`);
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4)
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const values = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("AFH color tokens", () => {
  // @req REQ-090
  it("keeps small gold text AA-readable on its lightest surfaces", () => {
    const gold = tokenHex("--afh-color-gold");
    expect(
      contrastRatio(gold, tokenHex("--afh-color-gold-bg"))
    ).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(gold, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  // @req REQ-090
  it("keeps soft text AA-readable on the earth surface", () => {
    expect(
      contrastRatio(
        tokenHex("--afh-color-text-soft"),
        tokenHex("--afh-color-earth-bg")
      )
    ).toBeGreaterThanOrEqual(4.5);
  });

  // The full-strength accent is a fill colour, not an ink: every --afh-cat-*
  // base sits between 2.28:1 and 3.09:1 on its own tint, so text tinted with
  // it fails AA. --afh-cat-*-ink is the readable counterpart, and it only
  // earns its place if it clears the bar on every accent.
  // @req REQ-090
  it.each(["ocre", "teal", "terre", "perv"])(
    "keeps %s accent ink AA-readable on its own tint",
    (accent) => {
      expect(
        contrastRatio(
          tokenHex(`--afh-cat-${accent}-ink`),
          tokenHex(`--afh-cat-${accent}-tint`)
        )
      ).toBeGreaterThanOrEqual(4.5);
    }
  );
});

describe("night theme (REQ-115)", () => {
  const ground = () => tokenHex("--afh-night-ground");
  const surface = () => tokenHex("--afh-night-surface-2");

  // @req REQ-115
  it("keeps body and soft text AA-readable on both night surfaces", () => {
    for (const ink of ["--afh-night-ink", "--afh-night-ink-2"]) {
      expect(contrastRatio(tokenHex(ink), ground())).toBeGreaterThanOrEqual(
        4.5
      );
      expect(contrastRatio(tokenHex(ink), surface())).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });

  // Every axis accent lands on the night ground in the hero band, so an
  // accent that fails there would take a whole axis down with it.
  // @req REQ-115
  it("keeps every access-mode accent AA-readable on the night ground", () => {
    for (const accent of [
      "--afh-cat-ocre",
      "--afh-cat-teal",
      "--afh-cat-perv",
    ]) {
      expect(contrastRatio(tokenHex(accent), ground())).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });

  // The theme swaps the semantic aliases, not the components: anything
  // that reads --afh-bg / --afh-text follows without being touched.
  // @req REQ-115
  it("rebinds the semantic surface and text aliases under .dark", () => {
    const darkBlock = colorCss.match(/\.dark[^{]*\{([^}]*)\}/);
    expect(darkBlock).not.toBeNull();

    for (const alias of [
      "--afh-bg",
      "--afh-bg-warm",
      "--afh-surface",
      "--afh-border",
      "--afh-text",
      "--afh-text-soft",
      "--afh-text-muted",
    ]) {
      expect(darkBlock![1]).toContain(`${alias}:`);
    }
  });

  // The hero band is night whatever the reader's page theme, so the two
  // have to be one rule — two copies would drift into two nights.
  // @req REQ-115
  it("applies the same night swap to a subtree scope as to the page", () => {
    expect(colorCss).toMatch(/\.dark,\s*\n\.afh-on-night\s*\{/);
  });

  // `color` is resolved once on body and inherited from there, so text that
  // never set its own colour ignores a token swap. The nav wordmark went
  // unreadable on the night band for exactly this reason.
  // @req REQ-115
  it("states an inherited colour on the night scope, not just tokens", () => {
    const darkBlock = colorCss.match(/\.dark[^{]*\{([^}]*)\}/);

    expect(darkBlock![1]).toMatch(/(^|\n)\s*color:\s*var\(--afh-text\);/);
  });
});
