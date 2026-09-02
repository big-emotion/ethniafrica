import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACCENT_BY_ACCESS_MODE,
  ACCESS_MODES,
  MODULE_DEFINITIONS,
  getNavModules,
} from "@/lib/hubs/moduleRegistry";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import { FICHE_BAND_BREAKPOINT_PX } from "@/components/fiche/FicheHeroBand";

/**
 * The atlas charter §3 describes the header as three intentions with the
 * modules behind the click. What a rendered header does is asserted in
 * SiteHeader.test.tsx; what is asserted here is the part a behavioural test
 * cannot see — that the menu is *generated* rather than transcribed, and
 * that the component still agrees with the document it implements.
 *
 * The bar it replaced is exactly what this guards against: nine
 * destinations, hand-listed, in two files that had already drifted apart.
 */
const SOURCE_PATH = join(process.cwd(), "src/components/layout/SiteHeader.tsx");
const CHARTER_PATH = join(process.cwd(), "docs/design/atlas-charter.md");

const source = () => readFileSync(SOURCE_PATH, "utf8");
const charter = () => readFileSync(CHARTER_PATH, "utf8");

/**
 * The header carries its dress in an inline `<style>`, so the only way to
 * assert a layout rule short of a real browser is to read the rule back out
 * of the component.
 *
 * Rules are matched at the start of their own line rather than after the
 * previous rule's `}`: most of this stylesheet's selectors are introduced
 * by a comment, and an anchor on `}` skips every one of them — silently,
 * returning an empty list that reads as "no such rule".
 */
function ruleBodies(css: string, selector: string): string[] {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^\\s*${escaped}\\s*\\{([^{}]*)\\}`, "gm");

  return [...css.matchAll(pattern)].map((match) => match[1]);
}

/**
 * The body of the first `@media` whose condition contains `condition`.
 * A substring, not the whole condition, because the breakpoint reaches the
 * stylesheet as a template expression — matching on the pixel figure finds
 * nothing in the source text.
 *
 * That same expression is why the block's opening brace is found by hand:
 * `${NAV_BREAKPOINT_PX + 1}px` opens a brace of its own inside the
 * condition, and taking the first `{` after `@media` returns the
 * interpolation instead of the rule set.
 *
 * Brace-counting rather than `[^}]*`: a media query holds nested rules, and
 * a lazy match stops at the first inner closing brace.
 */
function mediaBlock(css: string, condition: string): string {
  const opener = new RegExp(`@media[^{]*${condition}`).exec(css);
  if (!opener) return "";

  let cursor = opener.index + opener[0].length;
  while (
    cursor < css.length &&
    !(css[cursor] === "{" && css[cursor - 1] !== "$")
  ) {
    cursor += 1;
  }

  cursor += 1;
  const start = cursor;
  let depth = 1;

  while (cursor < css.length && depth > 0) {
    if (css[cursor] === "{") depth += 1;
    else if (css[cursor] === "}") depth -= 1;
    cursor += 1;
  }

  return css.slice(start, cursor - 1);
}

describe("atlas charter §3 — three intentions, not ten modules", () => {
  // @req REQ-114
  it("gives the header exactly the three access modes", () => {
    expect(ACCESS_MODES).toHaveLength(3);
    for (const mode of ACCESS_MODES) {
      expect(charter()).toMatch(new RegExp(`_?${mode}_?`, "i"));
    }
  });

  // The charter reserves terre for the family fiche, so no axis may wear it
  // — an axis and an entity sharing a colour read as the same scope.
  // @req REQ-114
  it("keeps the axis accents off the fiche-level accent", () => {
    const accents = ACCESS_MODES.map((mode) => ACCENT_BY_ACCESS_MODE[mode]);

    expect(accents).toEqual([
      "afh-accent-ocre",
      "afh-accent-teal",
      "afh-accent-perv",
    ]);
  });

  // @req REQ-114
  it("makes each access mode a non-navigating group of direct module links", () => {
    const text = charter();

    expect(text).toMatch(/access-mode label is a non-navigating heading/i);
    expect(text).toMatch(/direct module\s+links sit beneath it/i);
    expect(text).toMatch(
      /live module is exactly one click away from the global\s+navigation/i
    );
    expect(text).toMatch(/unavailable\s+entries stay inert/i);
    for (const mode of ACCESS_MODES) {
      expect(text).toContain(`${getAxisHubRoute("fr", mode)}/`);
    }
    expect(text).not.toMatch(/hub needs an entry of its own inside the panel/i);
    expect(text).not.toMatch(/axis leads with its own hub/i);
  });
});

describe("atlas charter §3 — the menu is generated, never hand-listed", () => {
  // A module name written into the component is a name that can go stale
  // the day the registry renames it, which is how the previous bar came to
  // promise « Colonisation » from two files and the registry from none.
  /**
   * Matched on word boundaries, not as a substring.
   *
   * DEC-038 renamed a module to « Nom », three letters, and a comment in the
   * component says « Nommer dossier now holds this map » — so `includes()`
   * reported a transcribed module name where there is none. Neither the name
   * nor the comment is at fault; the substring test was. `axisModuleVocabulary`
   * hit the identical trap on the same rename and answers it the same way.
   */
  // @req REQ-114
  it("writes no module name into the component", () => {
    const text = source();
    const transcribed = MODULE_DEFINITIONS.filter((def) =>
      new RegExp(
        `\\b${def.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`
      ).test(text)
    );

    expect(transcribed.map((def) => def.name)).toEqual([]);
  });

  // @req REQ-114
  it("writes no module route into the component", () => {
    const text = source();
    const transcribed = MODULE_DEFINITIONS.map((def) =>
      getModuleHref(def, "fr")
    ).filter((href): href is string => href !== null && text.includes(href));

    expect(transcribed).toEqual([]);
  });

  // The axis labels and their sentences are content, so they live with the
  // rest of the site's copy rather than inside the bar that shows them.
  // @req REQ-114
  it("reads its labels off the registry and the translations", () => {
    const text = source();

    expect(text).toContain("getNavModules");
    expect(text).toContain("getModuleHref");
    expect(text).toContain("ACCESS_MODES");
    expect(text).toContain("getTranslation");
  });
});

describe("atlas charter §2 — the bar reads on both surfaces", () => {
  // --accent-tint is the accent over parchment, and no night scope rebinds
  // it. Painting a state with it put the open module's card at #f1d9ae
  // under night's cream ink — 1.05:1. Any state colour here has to be one
  // that follows the surface, which is what the wash and the ink pair are.
  // @req REQ-115
  it("paints no state with the parchment-only accent tint", () => {
    expect(source()).not.toContain("var(--accent-tint)");
  });

  // The full-strength accent is a fill, never an ink (color.css §-ink
  // variants), so accent-coloured text takes --accent-ink on both surfaces.
  // @req REQ-115
  it("colours its accent text with the readable half of the pair", () => {
    expect(source()).toContain("color: var(--accent-ink)");
  });
});

describe("atlas charter §3 — the menu never offers an unresolved route", () => {
  // @req REQ-106
  it("resolves a route for every module it may list, or calls it unbuilt", () => {
    for (const mode of ACCESS_MODES) {
      for (const def of getNavModules(mode)) {
        if (getModuleHref(def, "fr") === null) {
          expect(def.availability).toBe("unavailable");
        }
      }
    }
  });
});

describe("atlas charter §3 — one breakpoint for the header and the band", () => {
  // The charter names 760px, and the band that opens directly under the
  // header switches at the same figure. Two numbers here would show as a
  // seam between the bar and the globe below it.
  // @req REQ-116
  it("switches to the tray at the width the charter and the band both use", () => {
    expect(charter()).toContain("760");
    expect(source()).toContain(
      `NAV_BREAKPOINT_PX = ${FICHE_BAND_BREAKPOINT_PX}`
    );
  });
});

/**
 * Below the breakpoint the bar holds two things — the mark and the controls
 * — and the charter's §3 reading of the header is that they sit at opposite
 * ends of it. The free space between them is what tells a reader the bar is
 * the full width of the phone rather than a group of icons that happens to
 * start at the left margin.
 */
describe("atlas charter §3 — the phone bar reaches both edges", () => {
  // The gap used to be opened by `.sh-axes { margin-left: auto }`. A
  // `display: none` element contributes no margin, so once the axes were
  // withdrawn the controls slid up against the mark and the right half of
  // the bar was empty.
  // @req REQ-114
  it("pushes the controls to the far edge once the axes are withdrawn", () => {
    const [phoneRule] = ruleBodies(source(), ".sh-controls");

    expect(phoneRule).toMatch(/margin-left:\s*auto/);
  });

  // Two auto margins in one flex row split the free space between them,
  // which would pull the axes away from the controls and into the middle of
  // the bar. Above the breakpoint the axes own the gap again.
  // @req REQ-114
  it("hands the gap back to the axes above the breakpoint", () => {
    const wide = mediaBlock(source(), "min-width");

    expect(ruleBodies(wide, ".sh-controls")[0]).toMatch(/margin-left:\s*0/);
    expect(ruleBodies(source(), ".sh-axes")[0]).toMatch(/margin-left:\s*auto/);
  });
});

/**
 * The tray is the only way into the menu on a phone, so anything it cuts
 * off is a destination the phone reader cannot reach.
 */
describe("atlas charter §3 — the tray shows what it holds", () => {
  // A grid item's implicit minimum is its content, so a long module label can
  // widen the fold's column past the tray and push the cards' right edge off
  // the screen. `minmax(0, …)` is what lets the column stay within the tray.
  // @req REQ-114
  it("keeps its entries inside the tray however wide their contents are", () => {
    const [foldBody] = ruleBodies(source(), ".sh-fold-body");

    expect(foldBody).toMatch(/grid-template-columns:\s*minmax\(\s*0/);
  });

  // Facets are direct module entries now. Keeping the retired nested facet
  // row would reintroduce a second navigation level below the access mode.
  // @req REQ-114
  it("contains no retired hub or facet sub-navigation", () => {
    expect(source()).not.toMatch(/axisHubEntry|sh-hub|sh-facets/);
  });
});
