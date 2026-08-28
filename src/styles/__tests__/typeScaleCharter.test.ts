import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const TYPE_CSS_PATH = join(process.cwd(), "src/styles/tokens/type.css");
const TAILWIND_CONFIG_PATH = join(process.cwd(), "tailwind.config.ts");

/** The nine roles the typography charter recognises, largest to smallest. */
const ROLES = [
  "hero",
  "h1",
  "h2",
  "h3",
  "lead",
  "body",
  "small",
  "caption",
  "eyebrow",
] as const;

/** Roles that grow with the viewport; the rest are fixed by design. */
const FLUID_ROLES = ["hero", "h1", "h2", "h3", "lead", "body"] as const;

const ROOT_FONT_PX = 16;
/** Charter floor: nothing in the scale may render below this. */
const MIN_RENDERED_PX = 12;
/** Charter floor for running text at the narrowest supported viewport. */
const MIN_BODY_PX = 16;
/** The two viewports the fluid roles are anchored to. */
const CLAMP_MIN_VIEWPORT_PX = 390;
const CLAMP_MAX_VIEWPORT_PX = 1200;

function readTypeCss(): string {
  return readFileSync(TYPE_CSS_PATH, "utf8");
}

/** `--afh-text-<role>` → its raw declared value. */
function typeTokens(css: string): Record<string, string> {
  return Object.fromEntries(
    [...css.matchAll(/(--afh-text-[a-z0-9]+):\s*([^;]+);/g)].map(
      ([, name, value]) => [name, value.trim()]
    )
  );
}

type Clamp = { min: string; intercept: string; slope: string; max: string };

function parseClamp(value: string): Clamp | null {
  const match = value.match(
    /^clamp\(\s*([^,]+?)\s*,\s*([\d.]+rem)\s*\+\s*([\d.]+)vw\s*,\s*([^)]+?)\s*\)$/
  );
  if (!match) return null;
  const [, min, intercept, slope, max] = match;
  return { min, intercept, slope: `${slope}vw`, max };
}

/** Renders a `rem`/`px` length at the default root font size. */
function toPx(length: string): number {
  const rem = length.match(/^([\d.]+)rem$/);
  if (rem) return Number(rem[1]) * ROOT_FONT_PX;
  const px = length.match(/^([\d.]+)px$/);
  if (px) return Number(px[1]);
  throw new Error(`unsupported length: ${length}`);
}

/** What a token renders to at a given viewport width, in px. */
function renderedPx(value: string, viewportPx: number): number {
  const clamp = parseClamp(value);
  if (!clamp) return toPx(value);
  const slope = Number(clamp.slope.replace("vw", "")) / 100;
  const preferred = toPx(clamp.intercept) + slope * viewportPx;
  return Math.min(Math.max(preferred, toPx(clamp.min)), toPx(clamp.max));
}

describe("type scale charter — the nine roles", () => {
  // @req REQ-091
  it("declares exactly the nine charter roles, once each", () => {
    const tokens = typeTokens(readTypeCss());
    expect(Object.keys(tokens).sort()).toEqual(
      ROLES.map((role) => `--afh-text-${role}`).sort()
    );
  });

  // @req REQ-091
  it("no longer declares the retired micro and nano roles", () => {
    const css = readTypeCss();
    expect(css).not.toMatch(/--afh-text-micro/);
    expect(css).not.toMatch(/--afh-text-nano/);
  });

  // @req REQ-091
  it("pairs every role with a line-height token", () => {
    const css = readTypeCss();
    for (const role of ROLES) {
      expect(css).toMatch(new RegExp(`--afh-leading-${role}:\\s*[\\d.]+;`));
    }
  });
});

describe("type scale charter — legibility floors", () => {
  // @req REQ-091
  it("keeps running text at 16 px or more from the narrowest viewport up", () => {
    const tokens = typeTokens(readTypeCss());
    expect(
      renderedPx(tokens["--afh-text-body"], CLAMP_MIN_VIEWPORT_PX)
    ).toBeGreaterThanOrEqual(MIN_BODY_PX);
  });

  // @req REQ-091
  it("puts no role below 12 px at any viewport", () => {
    const tokens = typeTokens(readTypeCss());
    for (const [name, value] of Object.entries(tokens)) {
      expect(
        renderedPx(value, CLAMP_MIN_VIEWPORT_PX),
        `${name} at ${CLAMP_MIN_VIEWPORT_PX}px`
      ).toBeGreaterThanOrEqual(MIN_RENDERED_PX);
    }
  });

  // Non-increasing, not strictly decreasing: h3 and lead deliberately meet at
  // 19 px on mobile — a section heading and a standfirst are told apart by
  // family and weight there, not by size. They separate again on desktop.
  // @req REQ-091
  it("never lets a smaller role outgrow a larger one", () => {
    const tokens = typeTokens(readTypeCss());
    for (const viewport of [CLAMP_MIN_VIEWPORT_PX, CLAMP_MAX_VIEWPORT_PX]) {
      const rendered = ROLES.map((role) =>
        renderedPx(tokens[`--afh-text-${role}`], viewport)
      );
      for (let i = 1; i < rendered.length; i++) {
        expect(
          rendered[i],
          `${ROLES[i]} vs ${ROLES[i - 1]} at ${viewport}px`
        ).toBeLessThanOrEqual(rendered[i - 1] + 0.05);
      }
    }
  });
});

describe("type scale charter — fluid roles", () => {
  // @req REQ-091
  it("expresses every fluid role as a clamp() and every fixed role as a length", () => {
    const tokens = typeTokens(readTypeCss());
    for (const role of ROLES) {
      const value = tokens[`--afh-text-${role}`];
      const isFluid = (FLUID_ROLES as readonly string[]).includes(role);
      expect(Boolean(parseClamp(value)), `${role} → ${value}`).toBe(isFluid);
    }
  });

  // A clamp whose intercept is in px ignores the browser's font-size setting
  // and fails WCAG 1.4.4 — the vw term alone cannot restore user scaling.
  // @req REQ-091
  it("writes every clamp() intercept in rem, never px", () => {
    const tokens = typeTokens(readTypeCss());
    for (const role of FLUID_ROLES) {
      const value = tokens[`--afh-text-${role}`];
      expect(
        value,
        `${role} must not mix px into its preferred term`
      ).not.toMatch(/\+\s*[\d.]+px|[\d.]+px\s*\+/);
      expect(parseClamp(value)?.intercept, `${role} intercept`).toMatch(
        /^[\d.]+rem$/
      );
    }
  });

  // @req REQ-091
  it("lands each clamp on its own bounds at 390 px and 1200 px", () => {
    const tokens = typeTokens(readTypeCss());
    for (const role of FLUID_ROLES) {
      const value = tokens[`--afh-text-${role}`];
      const clamp = parseClamp(value);
      expect(clamp, `${role} must be a clamp()`).not.toBeNull();
      expect(
        renderedPx(value, CLAMP_MIN_VIEWPORT_PX),
        `${role} at ${CLAMP_MIN_VIEWPORT_PX}px`
      ).toBeCloseTo(toPx(clamp.min), 1);
      expect(
        renderedPx(value, CLAMP_MAX_VIEWPORT_PX),
        `${role} at ${CLAMP_MAX_VIEWPORT_PX}px`
      ).toBeCloseTo(toPx(clamp.max), 1);
    }
  });

  // The two @media steps the fixed scale used are what the clamps replace;
  // leaving one behind would reintroduce a second, competing scale.
  // @req REQ-091
  it("resizes no type token inside a media query", () => {
    const css = readTypeCss().replace(/\/\*[\s\S]*?\*\//g, "");
    const mediaStart = css.indexOf("@media");
    if (mediaStart === -1) return;
    expect(css.slice(mediaStart)).not.toMatch(/--afh-text-/);
  });
});

describe("type scale charter — the Tailwind bridge", () => {
  // @req REQ-091
  it("maps every afh fontSize utility onto a token that exists", () => {
    const tokens = typeTokens(readTypeCss());
    const config = readFileSync(TAILWIND_CONFIG_PATH, "utf8");
    const fontSizeBlock = config.match(/fontSize:\s*\{([\s\S]*?)\n {6}\}/)?.[1];
    expect(fontSizeBlock, "fontSize block in tailwind.config.ts").toBeTruthy();

    const entries = [
      ...fontSizeBlock.matchAll(
        /"afh-([a-z0-9]+)":\s*"var\((--afh-text-[a-z0-9]+)\)"/g
      ),
    ];
    expect(entries.length).toBe(ROLES.length);
    for (const [, utility, token] of entries) {
      expect(tokens, `text-afh-${utility} → ${token}`).toHaveProperty(token);
      expect(token).toBe(`--afh-text-${utility}`);
    }
  });
});
