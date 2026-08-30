import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";

vi.mock("next/navigation", () => ({
  usePathname: () => "/fr",
}));

vi.mock("@/components/hubs/ModuleAvailabilityProvider", () => ({
  useModuleAvailability: () => null,
}));

const source = () =>
  readFileSync(
    join(process.cwd(), "src/components/layout/SiteHeader.tsx"),
    "utf8"
  );

/**
 * The masthead is the one thing on every page, and it was the smallest thing
 * on every page: a 26px mark beside a 16px wordmark, with nothing saying what
 * EthniAfrica is. Production says it — "Atlas des Peuples d'Afrique", beside
 * the mark, in the warm gradient — and the app had dropped it.
 *
 * The dress is asserted by reading the inline stylesheet back out of the
 * component, which is the pattern `navigationCharter.test.tsx` established:
 * the header keeps its rules in a `<style>` element that happy-dom does not
 * resolve, so `getComputedStyle` here would pass against any value at all.
 */
/**
 * Every body declared for a selector, joined — not the first.
 *
 * A selector is written more than once here on purpose: the tagline has a
 * plain colour at the top level and a gradient inside an `@supports`, and a
 * helper that stopped at the first match would report the fallback and call
 * the gradient missing.
 */
const ruleBody = (selector: string): string =>
  [
    ...source().matchAll(
      new RegExp(`^\\s*\\${selector}\\s*\\{([^}]*)\\}`, "gm")
    ),
  ]
    .map((match) => match[1])
    .join("\n");

describe("the brand lockup — the mark, the name, and what the site is (REQ-114)", () => {
  // @req REQ-114
  it("says what EthniAfrica is, beside the name", () => {
    render(<SiteHeader language="fr" />);

    const brand = screen.getByTestId("site-brand");

    expect(within(brand).getByText(PRODUCT_NAME)).toBeInTheDocument();
    expect(within(brand).getByText(PRODUCT_TAGLINE)).toBeInTheDocument();
  });

  /**
   * One link, one accessible name. The tagline qualifies the wordmark rather
   * than standing beside it as a second destination, so it must not add a
   * second focus stop or a second thing for a screen reader to announce as a
   * link.
   */
  // @req REQ-114
  it("keeps the lockup a single link", () => {
    render(<SiteHeader language="fr" />);

    const brand = screen.getByTestId("site-brand");

    expect(brand.tagName).toBe("A");
    expect(within(brand).queryByRole("link")).toBeNull();
  });

  // The tagline is the site's, not the page's: it is a permanent caption on
  // the mark, and a heading here would compete with the hero's h1 below it.
  // @req REQ-114
  it("raises no heading in the masthead", () => {
    render(<SiteHeader language="fr" />);

    expect(
      within(screen.getByTestId("site-brand")).queryByRole("heading")
    ).toBeNull();
  });

  // @req REQ-114
  it("gives the mark a size a reader can actually see", () => {
    const mark = ruleBody(".sh-brand-mark");
    const drawn = mark.match(/width:\s*(\d+)px/)?.[1];

    expect(Number(drawn)).toBeGreaterThanOrEqual(40);
  });

  /**
   * The wordmark and the nav both sat at `--afh-text-small`, the fixed 16px
   * interface step. The brief asks for the reference's proportions, where the
   * nav reads at 18px and the masthead is markedly larger than it — so both
   * move up a role rather than to a hand-picked pixel, which the typography
   * charter forbids outright.
   */
  // @req REQ-114
  it("sets the wordmark above the interface step", () => {
    expect(ruleBody(".sh-brand-name")).toMatch(
      /font-size:\s*var\(--afh-text-h3\)/
    );
  });

  // @req REQ-114
  it("sets the nav at reading size rather than at control size", () => {
    expect(ruleBody(".sh-axis-pill")).toMatch(
      /font-size:\s*var\(--afh-text-body\)/
    );
  });

  // Production sets the tagline in the warm gradient, and that gradient is
  // already declared once as `--gradient-warm`.
  // @req REQ-114
  it("takes the tagline's colour from the declared gradient", () => {
    expect(ruleBody(".sh-brand-tagline")).toMatch(/--gradient-warm/);
  });
});
