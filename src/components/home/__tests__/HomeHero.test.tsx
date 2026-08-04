import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeHero } from "@/components/home/HomeHero";
import { PRODUCT_NAME } from "@/lib/brand";

const HOME_HERO_SOURCE_PATH = resolve(
  process.cwd(),
  "src/components/home/HomeHero.tsx"
);

function tokenHex(name: string): string {
  const colorCss = readFileSync(
    resolve(process.cwd(), "src/styles/tokens/color.css"),
    "utf8"
  );
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

describe("HomeHero", () => {
  // @req REQ-044
  it("renders the eyebrow with the exact copy", () => {
    render(<HomeHero />);
    expect(
      screen.getByText("EXPLORER · COMPRENDRE · JOUER")
    ).toBeInTheDocument();
  });

  // @req REQ-044
  it("renders a single H1 with the exact copy, a hard line break after « raconté », and an italic accent on « carte vivante »", () => {
    render(<HomeHero />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    const h1 = headings[0];

    expect(h1.querySelector("br")).toBeInTheDocument();
    expect(h1.querySelector("em")).toHaveTextContent("carte vivante");
    expect(h1.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Le continent raconté comme une carte vivante"
    );
  });

  // @req REQ-044
  it("renders the adapted lede copy", () => {
    render(<HomeHero />);
    expect(
      screen.getByText(
        "Peuples, langues, noms et migrations : l'histoire africaine racontée depuis son propre regard — chaque affirmation adossée à une source vérifiable."
      )
    ).toBeInTheDocument();
  });

  // @req REQ-044
  it("composes DottedContinent behind the content", () => {
    const { container } = render(<HomeHero />);
    const canvas = container.querySelector("canvas");

    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  // @req REQ-044
  it("sources the brand line from src/lib/brand.ts, never hardcoded", () => {
    render(<HomeHero />);
    expect(screen.getByText(PRODUCT_NAME)).toBeInTheDocument();
  });

  // @req REQ-044
  it("renders the section on the charter light ground, not the night ground", () => {
    const { container } = render(<HomeHero />);
    const section = container.querySelector("section");

    expect(section?.style.backgroundColor).toBe("var(--afh-bg-warm)");
    expect(section?.style.borderBottom).toContain("var(--afh-border)");
  });

  // @req REQ-044
  it("never references a night-ground token in its source", () => {
    const source = readFileSync(HOME_HERO_SOURCE_PATH, "utf8");
    expect(source).not.toMatch(/--afh-night-/);
  });

  // @req REQ-044
  it("meets WCAG AA contrast on the light ground for eyebrow, h1, lede and pill text", () => {
    const bgWarm = tokenHex("--afh-color-bg-warm");

    expect(
      contrastRatio(tokenHex("--afh-color-gold"), bgWarm)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(tokenHex("--afh-color-text"), bgWarm)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(tokenHex("--afh-color-text-soft"), bgWarm)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(tokenHex("--afh-color-text"), tokenHex("--afh-color-card"))
    ).toBeGreaterThanOrEqual(4.5);
  });
});
