import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every `color:` declaration in the app, held to AA — by sweeping, not by list.
 *
 * `colorTokens.test.ts` already checks contrast, but only for selectors someone
 * remembered to enumerate (`.access-axis-figure`, `.access-axis-stake`, the
 * globe's morph label…). That is an allowlist wearing a gate's clothes: it goes
 * green on a file it has never heard of. The home's three image credits sat at
 * 3.08:1 for months underneath it, and axe-core — which does sweep, but only
 * across eighteen sampled routes — was the only thing that ever said so.
 *
 * This walks every component and route source instead, pulls out what each
 * `color:` declaration resolves to, and fails on any token that clears neither
 * light surface. A new offender fails the build in the file that introduced it,
 * rather than in a Lighthouse score three PRs later.
 *
 * Scope, deliberately narrow so the rule has no exceptions to argue about:
 *
 *   - `color:` only. It is the one property that is always text, so the 4.5:1
 *     floor always applies. An icon tinted through the same token is non-text
 *     content at 3:1 (WCAG 1.4.11) and is none of this test's business, which
 *     is why `background-color`, `fill`, `stroke` and `border-color` are out.
 *
 *   - Tailwind's `text-afh-*` classes are out too, and that is a real gap: a
 *     class string cannot tell a caption from an `<svg>` statically, so gating
 *     them would fail the icons. axe-core covers that half at runtime. The two
 *     gates overlap rather than nest.
 */

const REPO = process.cwd();

const colorCss = readFileSync(
  resolve(REPO, "src/styles/tokens/color.css"),
  "utf8"
);

/** The two grounds a light-surface reader ever sees text on. */
const LIGHT_SURFACES = ["--afh-color-bg", "--afh-color-card"] as const;

/**
 * The night grounds. A `--afh-night-*` ink is named for the surface it was
 * mixed for, so measuring it against parchment would report every dataviz
 * panel as broken — and a sweep that cries wolf is a sweep someone deletes.
 */
const NIGHT_SURFACES = [
  "--afh-night-ground",
  "--afh-night-surface",
  "--afh-night-surface-2",
] as const;

const AA_NORMAL_TEXT = 4.5;

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

/**
 * A token's light-surface value. Only `:root` is read — the night block
 * re-declares the same names against a dark ground, and mixing the two would
 * measure parchment ink against a night surface.
 */
const rootBlock = colorCss.slice(0, colorCss.indexOf(".dark,"));

function resolvedHex(name: string): string | null {
  let current = name;
  for (let hop = 0; hop < 8; hop += 1) {
    const match = rootBlock.match(
      new RegExp(`${current}:\\s*(#[0-9a-f]{6}|var\\(--[a-z0-9-]+\\))`, "i")
    );
    if (!match) return null;
    if (match[1].startsWith("#")) return match[1];
    current = match[1].slice(4, -1);
  }
  return null;
}

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "__tests__" || entry === "__snapshots__") continue;
      found.push(...sourceFiles(path));
      continue;
    }
    if (/\.(tsx|ts|css)$/.test(entry) && !/\.stories\.tsx$/.test(entry)) {
      found.push(path);
    }
  }
  return found;
}

interface TextColorUse {
  file: string;
  line: number;
  token: string;
  hex: string;
  /** What it was measured against, named so a failure is actionable. */
  ground: string;
  best: number;
}

/**
 * The lines of the rule (or inline style object) a declaration sits in.
 *
 * A line scan alone measures every colour against the page, which is wrong
 * twice over: it clears text that sits on a tint darker than parchment, and
 * it condemns text that sits on one lighter. The imposed-name chip is the
 * case that matters — terre on terre-tint is 3.09:1, worse than the 4.39:1 a
 * page-ground reading reports, so the naive sweep understated a real defect.
 *
 * Bounded by the nearest brace either way rather than parsed properly: these
 * are styled-jsx template literals and inline object literals, and a real CSS
 * parser for both is a great deal of machinery to answer "is there a
 * background next to this colour".
 */
function enclosingBlock(lines: string[], at: number): string[] {
  let start = at;
  while (start > 0 && !/[{}]/.test(lines[start - 1])) start -= 1;
  let end = at;
  while (end < lines.length - 1 && !/[{}]/.test(lines[end + 1])) end += 1;
  return lines.slice(start, end + 1);
}

/**
 * The selector a declaration belongs to — the nearest preceding line that
 * opens a block. Used only to spot inactive controls, which WCAG 1.4.3
 * exempts from contrast: a disabled arrow that met AA would be
 * indistinguishable from a live one, so muting it is the correct rendering.
 */
function selectorFor(lines: string[], at: number): string {
  for (let index = at; index >= 0; index -= 1) {
    if (/\{\s*$/.test(lines[index])) return lines[index];
  }
  return "";
}

const INACTIVE =
  /:disabled|\[disabled\]|aria-disabled|\[data-state="?(inactive|off)/;

/**
 * Every `color: var(--token)` in a source file, in CSS or in an inline style
 * object. Declarations naming a literal colour are not this test's subject —
 * `colorTokens.test.ts` and the eslint rules already forbid those.
 */
function textColorUses(): TextColorUse[] {
  const uses: TextColorUse[] = [];
  const roots = ["src/components", "src/app", "src/styles"].map((dir) =>
    resolve(REPO, dir)
  );

  for (const root of roots) {
    for (const file of sourceFiles(root)) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((text, index) => {
        // `color:` but not `background-color:`, `border-color:`, `caret-color:`
        const match = text.match(
          /(?<![a-z-])color:\s*"?var\((--afh-[a-z0-9-]+)\)/i
        );
        if (!match) return;

        const token = match[1];
        const hex = resolvedHex(token);
        // A token the root block never defines is either night-only or a typo;
        // either way this test cannot measure it and does not pretend to.
        if (!hex) return;

        if (INACTIVE.test(selectorFor(lines, index))) return;

        // A background declared in the same rule is the ground this text is
        // actually on, and beats any guess about the page.
        const ownGround = enclosingBlock(lines, index)
          .join("\n")
          .match(/background(?:-color|Color)?:\s*"?var\((--afh-[a-z0-9-]+)\)/i);

        const grounds =
          ownGround && resolvedHex(ownGround[1])
            ? [ownGround[1]]
            : token.startsWith("--afh-night-")
              ? [...NIGHT_SURFACES]
              : [...LIGHT_SURFACES];

        let best = 0;
        let ground = grounds[0];
        for (const surface of grounds) {
          const ratio = contrastRatio(hex, resolvedHex(surface)!);
          if (ratio > best) {
            best = ratio;
            ground = surface;
          }
        }

        uses.push({
          file: relative(REPO, file),
          line: index + 1,
          token,
          hex,
          ground,
          best,
        });
      });
    }
  }
  return uses;
}

describe("text colour contrast, swept rather than listed", () => {
  // The sweep is worthless if it walks nothing — a bad path or a tightened
  // extension filter would leave it green over an empty set, which is the
  // exact failure it exists to replace.
  // @req REQ-090
  it("actually finds text colour declarations to measure", () => {
    expect(textColorUses().length).toBeGreaterThan(20);
  });

  // @req REQ-090
  it("keeps every `color:` token AA-readable on at least one light surface", () => {
    const offenders = textColorUses()
      .filter((use) => use.best < AA_NORMAL_TEXT)
      .map(
        (use) =>
          `${use.file}:${use.line} — ${use.token} (${use.hex}) on ` +
          `${use.ground} reaches only ${use.best.toFixed(2)}:1, ` +
          `AA needs ${AA_NORMAL_TEXT}:1`
      );

    expect(
      offenders,
      `Text set in a token that clears neither --afh-color-bg nor ` +
        `--afh-color-card. Use --afh-fg-muted (#746557, 5.26:1) where the ` +
        `intent is quiet text; --afh-text-muted is for non-text marks only:\n` +
        offenders.join("\n")
    ).toEqual([]);
  });
});
