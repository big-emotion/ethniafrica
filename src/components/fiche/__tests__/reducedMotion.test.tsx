/**
 * ETNI-941 · FR102 — a fiche must stand still for a visitor who asked the OS
 * to reduce motion.
 *
 * happy-dom does not evaluate CSS media queries, so nothing here can watch a
 * `motion-safe:` rule or an `@media (prefers-reduced-motion: reduce)` block
 * resolve; a computed-style assertion would pass whatever the panels did.
 * The two things this environment *can* check honestly are asserted instead:
 *
 *  1. JS-driven motion, which runs on real timers — a fiche rendered under
 *     the reduce preference must be byte-identical before and after the
 *     animation window elapses.
 *  2. The declarations themselves — the panel sources, and the motion.css
 *     contract those panels delegate their durations to.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { FicheSequence } from "../FicheSequence";
import { ScalePanel } from "../ScalePanel";
import type { FichePanelContext } from "../panelRegistry";
import { CHARTER_HOVER_LIFT } from "@/components/ui/charter-motion";
import {
  NIGER_CONGO,
  NIGER_CONGO_BRANCHES,
  NIGERIA,
  RELATIONS,
  YORUBA,
  YORUBA_DISTRIBUTIONS,
  YORUBA_FRAGMENTATION,
  YORUBA_NAMES_DOSSIER,
} from "./ficheContextFixtures";

const RECORD = <p>Dossier AFRIK complet</p>;

/** Longer than any motion a panel declares (ScalePanel's count-up is 800 ms). */
const ANIMATION_WINDOW_MS = 3_000;

const PEOPLE_CONTEXT: FichePanelContext = {
  entityType: "people",
  payload: YORUBA,
  namesDossier: YORUBA_NAMES_DOSSIER,
  distributions: YORUBA_DISTRIBUTIONS,
  fragmentation: YORUBA_FRAGMENTATION,
  relations: RELATIONS,
  hasOralNarratives: true,
};

const COUNTRY_CONTEXT: FichePanelContext = {
  entityType: "country",
  payload: NIGERIA,
  relations: RELATIONS,
};

const FAMILY_CONTEXT: FichePanelContext = {
  entityType: "language-family",
  payload: NIGER_CONGO,
  branches: NIGER_CONGO_BRANCHES,
  relations: RELATIONS,
};

function stubMotionPreference(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" && reduce,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

/**
 * Never settles. A resolving fetch would repaint the panels that load their
 * own content (VoicesPanel, TonguePanel) mid-window, and that repaint would
 * be indistinguishable from an animation frame.
 */
function stubPendingFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => new Promise(() => {}))
  );
}

const frFR = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(n).replace(/\s/g, " ");

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fiche · prefers-reduced-motion: reduce — nothing keeps moving", () => {
  // @req REQ-091
  it.each([
    ["people", PEOPLE_CONTEXT],
    ["country", COUNTRY_CONTEXT],
    ["language-family", FAMILY_CONTEXT],
  ] as const)(
    "%s: the fiche renders its final frame and never repaints again",
    (_entityType, context) => {
      stubMotionPreference(true);
      stubPendingFetch();
      vi.useFakeTimers();

      const { container } = render(
        <FicheSequence context={context} record={RECORD} />
      );
      const firstPaint = container.innerHTML;

      act(() => {
        vi.advanceTimersByTime(ANIMATION_WINDOW_MS);
      });

      expect(container.innerHTML).toBe(firstPaint);
    }
  );

  // @req REQ-091
  it("still counts up when no reduced-motion preference is expressed", () => {
    // Without this contrast the stability assertions above would also hold
    // for a fiche that simply never animates, and would stop proving that
    // the reduced-motion branch is what silenced it.
    // On a country fiche, because the count-up lives in ScalePanel and a
    // people fiche no longer composes one — its parchment carries the figure.
    stubMotionPreference(false);
    stubPendingFetch();
    vi.useFakeTimers();

    const { container } = render(
      <FicheSequence context={COUNTRY_CONTEXT} record={RECORD} />
    );
    const firstPaint = container.innerHTML;

    act(() => {
      vi.advanceTimersByTime(ANIMATION_WINDOW_MS);
    });

    expect(container.innerHTML).not.toBe(firstPaint);
  });
});

describe("ScalePanel · the magnitude count-up", () => {
  const totalPopulation = YORUBA.demography!.totalPopulation!;

  // @req REQ-091
  it("opens on the final magnitude under reduce, and ramps from zero without it", () => {
    stubMotionPreference(true);
    vi.useFakeTimers();
    render(
      <ScalePanel entityType="people" payload={YORUBA} size="md" side="left" />
    );

    expect(screen.getByText(frFR(totalPopulation))).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();

    vi.useRealTimers();
    vi.restoreAllMocks();

    stubMotionPreference(false);
    vi.useFakeTimers();
    const ramping = render(
      <ScalePanel entityType="people" payload={YORUBA} size="md" side="left" />
    );

    expect(
      ramping.container.querySelector("[data-scale-figure]")?.textContent
    ).toBe("0");
    act(() => {
      vi.advanceTimersByTime(ANIMATION_WINDOW_MS);
    });
    expect(
      ramping.container.querySelector("[data-scale-figure]")?.textContent
    ).toBe(new Intl.NumberFormat("fr-FR").format(totalPopulation));
  });
});

/* ────────────────────────────────────────────────────────────────
   Architectural invariant — the repeatable form of the manual sweep
   ──────────────────────────────────────────────────────────────── */

const PROJECT_ROOT = process.cwd();
const FICHE_DIR = join(PROJECT_ROOT, "src/components/fiche");
const MOTION_CSS_PATH = join(PROJECT_ROOT, "src/styles/tokens/motion.css");

/**
 * A motion declaration is acceptable on exactly three routes. Anything else
 * plays for a visitor who opted out.
 */
const SANCTIONED_ROUTES = {
  /** Duration comes from a token motion.css collapses to 0.01 ms under reduce. */
  token: /--afh-(?:duration|transition|ease)-/,
  /** Tailwind emits the rule only under `prefers-reduced-motion: no-preference`. */
  motionSafeVariant: /^motion-(?:safe|reduce)$/,
  /** The code branches on the preference itself, in JS or in CSS. */
  explicitGate: /prefers-reduced-motion|reducedMotion|prefersReducedMotion/,
} as const;

const ROUTE_SUMMARY =
  "route it through an --afh-duration/--afh-transition/--afh-ease token, " +
  "prefix it with Tailwind's motion-safe: variant, or gate it on " +
  "prefers-reduced-motion";

/**
 * How far from a declaration the guard will look for its gate. A gate is
 * rarely on the declaration's own line (`@media` wraps it, a ternary sits
 * above it), and a whole-file search would let one gated animation vouch for
 * every ungated one in the same file.
 */
const GATE_PROXIMITY_LINES = 3;

const TAILWIND_MOTION_UTILITY =
  /^(?:transition(?:-[a-z]+)?|duration-.+|ease-.+|animate-.+)$/;
/**
 * `transition:`, `animationDuration:`, `animation-name:` … in CSS or style
 * objects. A bare `@keyframes` block is deliberately not a marker: it is an
 * inert definition until an `animation:` declaration plays it, and that
 * declaration is the one that carries the duration and needs the gate.
 */
const INLINE_MOTION_PROPERTY =
  /(?:^|[\s{;'"`])(?:transition|animation)(?:[A-Z][A-Za-z]*|-[a-z-]+)?\s*:/;
const FRAME_SCHEDULER = /requestAnimationFrame|setInterval\(|\.animate\(/;

const CLASS_TOKEN = /[A-Za-z][A-Za-z0-9_:\-[\]().%/=]*/g;

interface MotionSite {
  file: string;
  line: number;
  /** What a reader should look for on that line. */
  declaration: string;
  variants: string[];
  /** Text the token routes are matched against. */
  scope: string;
}

/** Blanks comments while preserving line numbers, so prose cannot trip the sweep. */
function withoutComments(source: string): string {
  const blank = (text: string) => text.replace(/[^\n]/g, " ");
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(?<!:)\/\/[^\n]*/g, blank);
}

/** Splits `motion-safe:hover:shadow-[4px_4px]` into its variants and utility. */
function splitVariants(token: string): { variants: string[]; utility: string } {
  const withoutArbitraryValues = token.replace(/\[[^\]]*\]/g, (value) =>
    " ".repeat(value.length)
  );
  const cut = withoutArbitraryValues.lastIndexOf(":");
  if (cut === -1) return { variants: [], utility: token };
  return {
    variants: token.slice(0, cut).split(":"),
    utility: token.slice(cut + 1),
  };
}

function motionSitesIn(file: string): MotionSite[] {
  const lines = withoutComments(readFileSync(file, "utf8")).split("\n");
  const sites: MotionSite[] = [];

  lines.forEach((text, index) => {
    for (const raw of text.match(CLASS_TOKEN) ?? []) {
      const { variants, utility } = splitVariants(raw);
      if (!TAILWIND_MOTION_UTILITY.test(utility)) continue;
      sites.push({
        file,
        line: index + 1,
        declaration: raw,
        variants,
        scope: raw,
      });
    }

    for (const [marker, pattern] of [
      ["inline motion property", INLINE_MOTION_PROPERTY],
      ["animation frame scheduler", FRAME_SCHEDULER],
    ] as const) {
      if (!pattern.test(text)) continue;
      sites.push({
        file,
        line: index + 1,
        declaration: `${marker} — ${text.trim()}`,
        variants: [],
        scope: text,
      });
    }
  });

  return sites;
}

function gateNear(site: MotionSite, lines: string[]): boolean {
  const from = Math.max(0, site.line - 1 - GATE_PROXIMITY_LINES);
  const to = Math.min(lines.length, site.line + GATE_PROXIMITY_LINES);
  return SANCTIONED_ROUTES.explicitGate.test(lines.slice(from, to).join("\n"));
}

function isSanctioned(site: MotionSite, lines: string[]): boolean {
  return (
    SANCTIONED_ROUTES.token.test(site.scope) ||
    site.variants.some((variant) =>
      SANCTIONED_ROUTES.motionSafeVariant.test(variant)
    ) ||
    gateNear(site, lines)
  );
}

/**
 * The panel modules, plus the components they import directly.
 *
 * One hop is the boundary of what a chapter puts on screen itself: a Badge
 * inside ScalePanel is the panel's own motion, whereas a modal three levels
 * below FragmentationView belongs to that component's own contract.
 */
function ficheMotionSurface(): string[] {
  const panels = readdirSync(FICHE_DIR)
    .filter((name) => name.endsWith(".tsx") && !name.endsWith(".stories.tsx"))
    .map((name) => join(FICHE_DIR, name));

  const surface = new Set(panels);
  for (const panel of panels) {
    const source = readFileSync(panel, "utf8");
    for (const [, spec] of source.matchAll(
      /from\s+"(@\/components\/[^"]+)"/g
    )) {
      const base = join(PROJECT_ROOT, "src", spec.slice(2));
      const resolved = [`${base}.tsx`, `${base}.ts`].find(existsSync);
      if (resolved) surface.add(resolved);
    }
  }
  return [...surface].sort();
}

describe("fiche motion surface · every animation takes a sanctioned route", () => {
  const surface = ficheMotionSurface();

  // @req REQ-091
  it("covers the panel modules and what they render directly", () => {
    expect(surface).toContain(join(FICHE_DIR, "ScalePanel.tsx"));
    expect(surface).toContain(join(FICHE_DIR, "FichePanel.tsx"));
    expect(surface).toContain(
      join(PROJECT_ROOT, "src/components/ui/badge.tsx")
    );
  });

  // @req REQ-091
  it.each(surface.map((file) => [file.replace(`${PROJECT_ROOT}/`, ""), file]))(
    "%s declares no ungated motion",
    (_label, file) => {
      const lines = withoutComments(readFileSync(file, "utf8")).split("\n");
      const offenders = motionSitesIn(file)
        .filter((site) => !isSanctioned(site, lines))
        .map(
          (site) =>
            `${site.file.replace(`${PROJECT_ROOT}/`, "")}:${site.line} — ` +
            `${site.declaration}`
        );

      expect(
        offenders,
        `Ungated motion reaches a fiche panel. For each site below, ` +
          `${ROUTE_SUMMARY}.\n${offenders.join("\n")}`
      ).toEqual([]);
    }
  );

  // @req REQ-091
  it("keeps the shared hover lift gated on motion-safe, effect included", () => {
    // FichePanel's only motion. The shadow is gated alongside the transition:
    // ungating the shadow would make the lift snap into place under reduce.
    const tokens = CHARTER_HOVER_LIFT.split(/\s+/);
    expect(tokens.length).toBeGreaterThan(0);
    for (const token of tokens) {
      expect(token, `${token} escapes the motion-safe gate`).toMatch(
        /^motion-safe:/
      );
    }
  });
});

describe("motion.css · the reduced-motion contract panels delegate to", () => {
  const css = readFileSync(MOTION_CSS_PATH, "utf8");
  const reduceBlocks = css.split(
    /@media\s*\(prefers-reduced-motion:\s*reduce\)/
  );

  // @req REQ-091
  it("declares exactly one reduced-motion override block", () => {
    expect(reduceBlocks).toHaveLength(2);
  });

  const [baseCss, reducedCss] = reduceBlocks;

  function declarationsIn(source: string): Map<string, string> {
    return new Map(
      [...source.matchAll(/(--afh-[\w-]+)\s*:\s*([^;]+);/g)].map(
        ([, name, value]) => [name, value.replace(/\s+/g, " ").trim()]
      )
    );
  }

  const base = declarationsIn(baseCss);
  const reduced = declarationsIn(reducedCss);

  // @req REQ-091
  it("collapses every duration token to 0.01ms", () => {
    const durations = [...base.keys()].filter((name) =>
      name.startsWith("--afh-duration-")
    );
    expect(durations.length).toBeGreaterThan(0);
    for (const name of durations) {
      expect(reduced.get(name), `${name} is not overridden under reduce`).toBe(
        "0.01ms"
      );
    }
  });

  // @req REQ-091
  it("reduces every composed transition to opacity alone", () => {
    const transitions = [...base.keys()].filter((name) =>
      name.startsWith("--afh-transition-")
    );
    expect(transitions.length).toBeGreaterThan(0);
    for (const name of transitions) {
      const value = reduced.get(name);
      expect(value, `${name} is not overridden under reduce`).toBeDefined();
      expect(
        value,
        `${name} still animates a property other than opacity`
      ).toMatch(/^opacity 0\.01ms [\w-]+$/);
    }
  });
});
