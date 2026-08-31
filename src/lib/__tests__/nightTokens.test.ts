import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("night color tokens", () => {
  // @req REQ-091
  // Dormant since ETNI-798: the categorical ocre/teal/terre/perv values are
  // superseded by the first-class --afh-cat-* tokens (charterTokens.test.ts)
  // and must no longer be consumed by components. This group is kept
  // unchanged pending the epics 7–13 decision — see color.css.
  it("defines the complete night palette with exact values", () => {
    const colorCss = readFileSync(
      join(process.cwd(), "src/styles/tokens/color.css"),
      "utf8"
    );
    const nightTokens = Object.fromEntries(
      [...colorCss.matchAll(/(--afh-night-[\w-]+):\s*(#[\dA-Fa-f]{6});/g)].map(
        ([, name, value]) => [name, value.toUpperCase()]
      )
    );

    expect(nightTokens).toEqual({
      "--afh-night-ground": "#120E0A",
      "--afh-night-surface": "#1D1710",
      "--afh-night-surface-2": "#271E14",
      "--afh-night-line": "#3A2E1F",
      "--afh-night-ink": "#F1E7D8",
      "--afh-night-ink-2": "#C9B99F",
      "--afh-night-ink-3": "#8F7F66",
      "--afh-night-ocre": "#C9821F",
      "--afh-night-ocre-soft": "#E8B96A",
      "--afh-night-teal": "#33A390",
      "--afh-night-terre": "#C4573F",
      "--afh-night-perv": "#7A8CE8",
      // Not dormant, unlike the four categorical values above: the parchment's
      // colonial tone is a day ink at 2.2–2.6:1 on these grounds, so anything
      // marking an imposed name against the theme's own ground reads this
      // through --afh-colonial-ink. Measured in ficheParchmentContrast.
      "--afh-night-colonial": "#D98A7A",
    });
  });
});
