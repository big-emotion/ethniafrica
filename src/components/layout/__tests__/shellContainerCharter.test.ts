import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * One measure for the whole shell.
 *
 * The bar, the hero, the body and the footer each used to carry their own
 * width and their own gutter: 1240 px at 16→22 px for the bar, 1400 px at a
 * flat 16 px for the body, 1280 px at 20→24→32 px for the footer. On a wide
 * window that put the logo, the page title and the copyright line on three
 * different verticals — the reader sees the misalignment long before they
 * could name it.
 *
 * The reference this was calibrated against (grande-chancellerie.ci) runs a
 * single 1200 px box at a flat 24 px gutter, which is why its logo, its h1,
 * its trail and its body all land on the same left edge.
 *
 * These are source-reading assertions rather than rendered ones because the
 * bar keeps its dress in an inline `<style>` and the gutter is a CSS custom
 * property: happy-dom resolves neither, so a `getComputedStyle` test here
 * would pass against any value at all.
 */
const read = (relative: string) =>
  readFileSync(join(process.cwd(), relative), "utf8");

const SHELL_CSS = "src/styles/shell.css";
const SPACE_TOKENS = "src/styles/tokens/space.css";
const HEADER = "src/components/layout/SiteHeader.tsx";
const FOOTER = "src/components/layout/SiteFooter.tsx";
const PAGE_LAYOUT = "src/components/layout/PageLayout.tsx";

describe("the shell container — one measure for bar, hero, body and footer (REQ-115)", () => {
  // @req REQ-115
  it("declares the shell width as a token rather than a literal", () => {
    expect(read(SPACE_TOKENS)).toMatch(/--afh-shell-max:\s*1240px;/);
  });

  // @req REQ-115
  it("builds the shell from the width token and the page gutter token", () => {
    const css = read(SHELL_CSS);

    expect(css).toMatch(/\.afh-shell\s*\{/);
    expect(css).toMatch(/max-width:\s*var\(--afh-shell-max\)/);
    expect(css).toMatch(/padding-inline:\s*var\(--afh-page-padding\)/);
    expect(css).toMatch(/margin-inline:\s*auto/);
  });

  // @req REQ-115
  it("is loaded by the stylesheet the root layout imports", () => {
    expect(read("src/index.css")).toMatch(
      /@import\s+"\.\/styles\/shell\.css";/
    );
  });

  // @req REQ-115
  it("gives the bar the shell measure instead of its own", () => {
    const header = read(HEADER);

    expect(header).toMatch(/max-width:\s*var\(--afh-shell-max\)/);
    expect(header).not.toMatch(/max-width:\s*1240px/);
  });

  // @req REQ-115
  it("gives the footer the shell measure instead of its own", () => {
    const footer = read(FOOTER);

    expect(footer).toMatch(/afh-shell/);
    expect(footer).not.toMatch(/max-w-7xl/);
  });

  // @req REQ-115
  it("gives the body the shell measure instead of Tailwind's container", () => {
    const layout = read(PAGE_LAYOUT);

    expect(layout).toMatch(/afh-shell/);
    expect(layout).not.toMatch(/container mx-auto px-4/);
  });

  /**
   * The gutter is the half of the pair a reader actually feels: two surfaces
   * can share a max-width and still part company on a phone, which is the
   * only width where the box is never reached.
   */
  // @req REQ-115
  it("leaves no surface setting its own horizontal gutter", () => {
    expect(read(HEADER)).not.toMatch(/padding:\s*8px\s+22px/);
    expect(read(FOOTER)).not.toMatch(/px-5|sm:px-6|xl:px-8/);
  });
});
