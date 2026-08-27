import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACCENT_BY_ACCESS_MODE,
  ACCESS_MODES,
  MODULE_DEFINITIONS,
  getNavModules,
} from "@/lib/hubs/moduleRegistry";
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
});

describe("atlas charter §3 — the menu is generated, never hand-listed", () => {
  // A module name written into the component is a name that can go stale
  // the day the registry renames it, which is how the previous bar came to
  // promise « Colonisation » from two files and the registry from none.
  // @req REQ-114
  it("writes no module name into the component", () => {
    const text = source();
    const transcribed = MODULE_DEFINITIONS.filter((def) =>
      text.includes(def.name)
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
