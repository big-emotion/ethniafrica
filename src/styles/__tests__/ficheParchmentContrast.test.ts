import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The family parchment's small text has to clear WCAG AA.
 *
 * This is not a hypothetical. The mockup sets every overline, field path and
 * caption in the lighter ink, and reproducing that faithfully put a SERIOUS
 * axe colour-contrast violation on the family fiche at all three widths — the
 * mockup is an oracle for composition, and nobody contrast-tested it.
 *
 * Asserting it here rather than trusting the comment in fiche-parchment.css:
 * a comment asks the next person to remember, a test tells them.
 */
const parchmentCss = readFileSync(
  resolve(process.cwd(), "src/styles/fiche-parchment.css"),
  "utf8"
);

const colorCss = readFileSync(
  resolve(process.cwd(), "src/styles/tokens/color.css"),
  "utf8"
);

function tokenHex(name: string): string {
  const match = colorCss.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!match) throw new Error(`Missing hexadecimal token ${name}`);
  return match[1];
}

function channelLuminance(channel: number): number {
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((pair) => channelLuminance(Number.parseInt(pair, 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x
  );
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA for text below 18.66px — which every rule guarded here is. */
const AA_SMALL_TEXT = 4.5;

/** The three grounds a parchment section can sit on. */
const GROUNDS = [
  "--afh-color-bg",
  "--afh-color-bg-warm",
  "--afh-color-card",
] as const;

/**
 * The same three, after `.dark` rebinds them. A reader's theme choice is
 * site-wide, so every parchment ground has a night counterpart and any ink
 * that does not follow the swap is measured against the wrong background.
 */
const NIGHT_GROUNDS = [
  "--afh-night-ground",
  "--afh-night-surface",
  "--afh-night-surface-2",
] as const;

describe("fiche parchment contrast", () => {
  // @req REQ-116
  it("sets no small text in the muted ink, which fails AA on every parchment ground", () => {
    // The whole failure in one assertion: --afh-text-muted is the token the
    // mockup's greys map to, and it does not clear 4.5:1 anywhere the
    // parchment renders.
    const declarations = parchmentCss
      .split("\n")
      .filter((line) => line.trim().startsWith("color:"));

    expect(
      declarations.filter((line) => line.includes("--afh-text-muted"))
    ).toEqual([]);
  });

  // Small accent-coloured text takes the ink variant, never the fill: the
  // fills sit between 2.28:1 and 3.09:1 on their own tint. Only the head's h1
  // may carry the raw accent, and only because large text clears at 3:1.
  // @req REQ-116
  it("sets no small text in the raw accent fill", () => {
    const smallAccentText = parchmentCss
      .split("\n")
      .filter((line) => /color:\s*var\(--accent\)/.test(line));

    expect(smallAccentText).toEqual([]);
  });

  // @req REQ-116
  it("proves the ink it does use clears AA, and the one it avoids does not", () => {
    const soft = tokenHex("--afh-color-text-soft");
    const muted = tokenHex("--afh-color-text-muted");

    for (const ground of GROUNDS) {
      const background = tokenHex(ground);
      expect(contrast(soft, background)).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
      // Stated so the test fails loudly if muted is ever darkened enough to
      // make the rule above unnecessary — at which point delete both.
      expect(contrast(muted, background)).toBeLessThan(AA_SMALL_TEXT);
    }
  });

  // The colonial tone used to appear only on its own pale tint, inside the
  // blocks that marked an absence or an imposed name. Dropping those blocks
  // for the parchment's rule device puts the same ink straight onto the page
  // grounds — a move that has broken contrast on this surface before, when
  // the mockup's greys were reproduced without measuring them.
  // @req REQ-116
  it("keeps the colonial ink legible on the grounds, not just on its own tint", () => {
    const colonial = tokenHex("--afh-color-colonial");

    for (const ground of GROUNDS) {
      expect(contrast(colonial, tokenHex(ground))).toBeGreaterThanOrEqual(
        AA_SMALL_TEXT
      );
    }
  });

  // The parchment palette is the day palette: --afh-color-colonial is #9b3030,
  // which sits at 2.2–2.6:1 on the night grounds. It survived unnoticed for as
  // long as every colonial-inked element painted its own pale tint underneath
  // itself and carried it into night. Nothing that reads the theme's ground
  // may use the raw tone, exactly as small accent text takes --accent-ink.
  // @req REQ-116
  it("gives the colonial tone a night ink that clears AA on the dark grounds", () => {
    const nightColonial = tokenHex("--afh-night-colonial");

    for (const ground of NIGHT_GROUNDS) {
      expect(contrast(nightColonial, tokenHex(ground))).toBeGreaterThanOrEqual(
        AA_SMALL_TEXT
      );
    }
  });

  /**
   * The guard that makes the token above load-bearing rather than decorative.
   *
   * Only these two rules put the colonial tone against the theme's own
   * ground. The other three that use it — the missing-field chip, the missing
   * stat card and the gap block — paint `--afh-color-colonial-bg` underneath
   * themselves, and that pale tint is part of the parchment ramp, so it
   * follows the tone into night and the pair stays legible. Listing the two
   * rather than pattern-matching every line is what keeps that distinction
   * legible: the exemption is a fact about the rule, not about the line.
   */
  const INKED_ON_THEME_GROUND = [
    // The imposed field's rule and its label — a 3px rule is a graphical
    // object and owes 3:1, which the raw tone misses on night just as the
    // text does.
    '.afh-naming-field[data-role="imposed"]',
    '.afh-naming-field[data-role="imposed"] .afh-naming-label',
    '.afh-chip[data-tier="unverified"]',
  ];

  // @req REQ-116
  it.each(INKED_ON_THEME_GROUND)(
    "inks %s in the night-aware colonial ink, not the raw tone",
    (selector) => {
      const escaped = selector.replace(/[.[\]="^$*+?()|{}\\]/g, "\\$&");
      const body = parchmentCss.match(
        new RegExp(`${escaped}\\s*\\{([^}]*)\\}`)
      )?.[1];

      expect(body).toBeDefined();
      expect(body).toMatch(/color:\s*var\(--afh-colonial-ink\)/);
      expect(body).not.toMatch(/color:\s*var\(--afh-color-colonial\)/);
    }
  );
});
