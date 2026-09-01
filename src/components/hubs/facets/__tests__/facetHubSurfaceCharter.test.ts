import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The hub reading is the page, not a document embedded in it.
 *
 * The three facets used to borrow `.afh-parchment`, the fiche surface, which
 * paints a flat `--afh-bg`. The page under it is a gradient running from
 * #faf8f5 down to #f3ece2, so the slab stayed pale while the ground around it
 * darkened: by the footer it was a lighter rectangle with two beige gutters
 * and a hard bottom edge, and the reading looked embedded — an iframe, in
 * effect. A fiche can carry that surface because the parchment *is* the
 * fiche; a listing is the page.
 *
 * Two things have to stay true for that not to come back, and neither is
 * visible from a rendered DOM: the reading paints no ground of its own, and
 * no facet reaches for the fiche surface again.
 */

const read = (path: string): string =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const FACET_PAGES = [
  "src/app/[lang]/atlas/peuples/page.tsx",
  "src/app/[lang]/atlas/familles/page.tsx",
  "src/app/[lang]/atlas/pays/page.tsx",
];

describe("The facet hub reading is the page's own ground (REQ-114)", () => {
  // @req REQ-114
  it("paints no ground of its own, so the page gradient runs through it", () => {
    const css = read("src/styles/facet-hub.css");
    const block = css.slice(
      css.indexOf(".afh-facet-reading {"),
      css.indexOf("}", css.indexOf(".afh-facet-reading {"))
    );

    expect(block).not.toMatch(/\bbackground\b/);
  });

  // @req REQ-114
  it("keeps no facet on the fiche parchment", () => {
    for (const page of FACET_PAGES) {
      expect(read(page)).not.toContain("afh-parchment");
    }
  });

  /**
   * One gutter for the whole hub. The title sat at 56px, the switcher at 36px
   * and the lede at 76px, and three left edges under one globe is most of
   * what read as a panel pasted onto the page.
   */
  // @req REQ-114
  it("leaves the horizontal gutter to the page, in the shell and in the reading", () => {
    expect(read("src/components/hubs/facets/FacetHubShell.tsx")).not.toMatch(
      /data-testid="facet-hub-head"[\s\S]{0,200}?className="[^"]*\bpx-/
    );
    expect(read("src/styles/facet-hub.css")).not.toMatch(
      /\.afh-facet-reading-head\s*\{[^}]*padding-left/
    );
  });
});
