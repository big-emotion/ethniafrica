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
});
