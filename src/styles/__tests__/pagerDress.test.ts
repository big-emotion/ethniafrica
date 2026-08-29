import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The site pager's dress, asserted where it lives.
 *
 * Two things about `.afh-pager-page` are load-bearing and invisible from a
 * rendered DOM, because happy-dom applies no external stylesheet.
 *
 * The first is the 44px target. `facetPagination.test.tsx` asserts that every
 * control wears the class; this asserts what the class measures. Split that
 * way because the alternative — asserting `min-h-11` on the elements — pinned
 * Tailwind literals and went red the day the dress moved into CSS, without a
 * single target changing size.
 *
 * The second is the palette, and it is a bug that shipped. The facet pager
 * marked its resting pills with `--accent-tint` under text inheriting
 * `--afh-text`. The tint is the day wash whatever the theme — only
 * `--accent-ink` flips — so a night reader got #f1e7d8 on #f0d2c8: 1.16:1,
 * where AA asks 4.5:1, and the page numbers were effectively invisible. The
 * pager marks position with the page's own ink instead, which inverts with
 * the surface. Nothing here may reach for an accent again.
 */
const pagerCss = readFileSync(
  resolve(process.cwd(), "src/styles/pager.css"),
  "utf8"
);

const ruleFor = (selector: string): string => {
  const start = pagerCss.indexOf(selector);
  expect(start, `${selector} is missing from pager.css`).toBeGreaterThan(-1);
  return pagerCss.slice(start, pagerCss.indexOf("}", start));
};

describe("the site pager's dress (REQ-108)", () => {
  // @req REQ-108
  it("gives every control a 44px target", () => {
    const rule = ruleFor(".afh-pager-page,");

    expect(rule).toContain("min-width: 44px");
    expect(rule).toContain("height: 44px");
  });

  // @req REQ-108
  it("marks the current position in ink that inverts with the surface", () => {
    const rule = ruleFor('.afh-pager-page[aria-current="page"],');

    expect(rule).toContain("var(--afh-text)");
    expect(rule).toContain("var(--afh-bg)");
  });

  // @req REQ-108
  it("reaches for no accent, whose tint does not follow the night swap", () => {
    expect(pagerCss).not.toMatch(/^\s*[^/*\n]*var\(--accent/m);
  });
});
