import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * One band, one height — and the height is never the screen.
 *
 * The band shipped with two: a short one for destinations and a viewport-tall
 * one for the home and the three axis hubs. On a hub the tall band put the
 * plate — bottom-aligned, as every band is — at the foot of a full screen of
 * empty parchment, so the reader met the masthead, a field of nothing, and the
 * title of the page they had asked for somewhere past the fold. The home never
 * showed it: it passes `hideHeader` and opens on its own globe. So the tall
 * band's only three routes were the three it was worst on.
 *
 * The contract is stated in the terms the fault appeared in — a hero rule that
 * measures itself against the viewport — rather than as "there is exactly one
 * `min-height` declaration, which would pass the day someone reintroduces the
 * tall band under a different property.
 */
const HERO_CSS = readFileSync(
  join(process.cwd(), "src/styles/hero.css"),
  "utf8"
);

/** Comments carry the rationale, including the retired units. Only rules count. */
const withoutComments = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("the hero band — one height, and never the viewport's (REQ-115)", () => {
  // @req REQ-115
  it("sizes the band against nothing that grows with the screen", () => {
    expect(withoutComments(HERO_CSS)).not.toMatch(/\d\s*(?:svh|lvh|dvh|vh)\b/);
  });

  /**
   * The variant attribute is how a route asked for the tall band. Gone from
   * the stylesheet, it cannot be reached by a stray `data-hero-variant` left
   * on some page — the rule it would have matched no longer exists.
   */
  // @req REQ-115
  it("keeps no rule a variant attribute could still select", () => {
    expect(withoutComments(HERO_CSS)).not.toMatch(/data-hero-variant/);
  });

  /**
   * A fiche brings its own head into the plate, and that head is the parchment
   * head — which carries the rule below it that separates it from the figures
   * it used to sit above. Inside a plate that rule is a line across a card and
   * the padding is a second inset inside the plate's own.
   */
  // @req REQ-115
  it("strips the parchment head's own frame when it sits in the plate", () => {
    const rule = withoutComments(HERO_CSS).match(
      /\.afh-hero-plate\s+\.afh-parchment-head\s*\{([^}]*)\}/
    );

    expect(rule).not.toBeNull();
    expect(rule?.[1]).toMatch(/padding:\s*0/);
    expect(rule?.[1]).toMatch(/border-bottom:\s*(?:0|none)/);
  });
});
