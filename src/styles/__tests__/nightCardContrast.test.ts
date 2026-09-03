import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const colorCss = readFileSync(
  resolve(process.cwd(), "src/styles/tokens/color.css"),
  "utf8"
);
const historicalFacts = readFileSync(
  resolve(process.cwd(), "src/components/country/HistoricalFactsSection.tsx"),
  "utf8"
);
const cultureGrid = readFileSync(
  resolve(process.cwd(), "src/components/country/CultureGrid.tsx"),
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
  const [lighter, darker] = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((left, right) => right - left);

  return (lighter + 0.05) / (darker + 0.05);
}

const AA_NORMAL_TEXT = 4.5;

describe("night card contrast", () => {
  /**
   * These country cards deliberately carry their pale categorical tint into
   * night mode. The ink therefore has to travel with that fixed parchment
   * surface too: a theme-aware night ink on a fixed light card is light on
   * light, which is the regression this guard captures.
   */
  // @req REQ-092
  it("pairs fixed country-card tints with fixed parchment inks", () => {
    expect(historicalFacts).toContain(
      'style={{ color: "var(--afh-color-text)" }}'
    );
    expect(historicalFacts).not.toContain(
      'style={{ color: "var(--country-text)" }}'
    );

    expect(cultureGrid).toContain(
      'style={{ color: "var(--afh-color-text-soft)" }}'
    );
    expect(cultureGrid).not.toContain(
      'style={{ color: "var(--country-text-soft)" }}'
    );
  });

  // @req REQ-092
  it("proves both parchment inks clear AA on every categorical tint", () => {
    const backgrounds = [
      "--afh-color-earth-bg",
      "--afh-color-green-bg",
      "--afh-color-gold-bg",
      "--afh-color-terracotta-bg",
    ];
    const inks = ["--afh-color-text", "--afh-color-text-soft"];

    for (const background of backgrounds) {
      for (const ink of inks) {
        expect(
          contrastRatio(tokenHex(ink), tokenHex(background)),
          `${ink} must remain readable on ${background}`
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      }
    }
  });

  // @req REQ-113
  it("proves the night card surface clears AA with its semantic inks", () => {
    const background = tokenHex("--afh-night-surface-2");

    for (const ink of ["--afh-night-ink", "--afh-night-ink-2"]) {
      expect(contrastRatio(tokenHex(ink), background)).toBeGreaterThanOrEqual(
        AA_NORMAL_TEXT
      );
    }
  });
});
