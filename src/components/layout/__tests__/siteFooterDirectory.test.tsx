import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { getTranslation } from "@/lib/translations";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { getLocalizedRoute } from "@/lib/routing";

vi.mock("@/hooks/use-consent", () => ({
  useConsent: () => ({ setShowBanner: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, className }: { alt: string; className?: string }) => (
    <span
      role={alt ? "img" : "presentation"}
      aria-label={alt || undefined}
      className={className}
    />
  ),
}));

const { footer } = getTranslation("fr");

/**
 * The footer held nothing but the legal line. A reader who reached the bottom
 * of a fiche — which is where a reader who read the whole thing ends up — was
 * offered the mentions légales and the way out.
 *
 * The directory above the legal line answers that: the three rubrics the
 * atlas is actually made of, the two ways to talk back to it, and where the
 * project is followed. It is the footer of a site, not the footer of a
 * document.
 */
describe("the footer directory — the site's rubrics under the fiche (REQ-046)", () => {
  // @req REQ-046
  it("names the site without offering it as one more link", () => {
    render(<SiteFooter language="fr" />);

    const brand = screen.getByTestId("footer-brand");

    expect(brand).toHaveTextContent(PRODUCT_NAME);
    expect(within(brand).queryByRole("link")).toBeNull();
  });

  // @req REQ-046
  it("opens the three explorer rubrics", () => {
    render(<SiteFooter language="fr" />);

    const explorer = screen.getByRole("navigation", {
      name: footer.directory.explorerHeading,
    });

    expect(
      within(explorer).getByRole("link", { name: footer.directory.countries })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "countries"));
    expect(
      within(explorer).getByRole("link", { name: footer.directory.peoples })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "peoples"));
    expect(
      within(explorer).getByRole("link", { name: footer.directory.families })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "families"));
  });

  // @req REQ-046
  it("offers both ways to talk back to the corpus", () => {
    render(<SiteFooter language="fr" />);

    const participate = screen.getByRole("navigation", {
      name: footer.directory.participateHeading,
    });

    expect(
      within(participate).getByRole("link", {
        name: footer.directory.contribute,
      })
    ).toHaveAttribute("href", "/fr/contribute");
    expect(
      within(participate).getByRole("link", {
        name: footer.directory.reportError,
      })
    ).toHaveAttribute("href", "/fr/report-error");
  });

  /**
   * The three accounts are named before they exist. A network shown as a live
   * link that leads nowhere is worse than one shown as a mark: the reader
   * spends a click to learn the account is not open yet. So an entry with no
   * URL renders as an image with its network's name, and becomes a link the
   * day `SOCIAL_NETWORKS` carries one.
   */
  // @req REQ-046
  it("shows a network with no account yet as a mark, not a dead link", () => {
    render(<SiteFooter language="fr" />);

    const follow = screen.getByTestId("footer-follow");

    expect(
      within(follow).getByRole("img", {
        name: `LinkedIn — ${footer.directory.followPending}`,
      })
    ).toBeInTheDocument();
    expect(within(follow).queryByRole("link", { name: /LinkedIn/ })).toBeNull();
  });

  // @req REQ-046
  it("names every network the project intends to be followed on", () => {
    render(<SiteFooter language="fr" />);

    const follow = screen.getByTestId("footer-follow");

    for (const network of ["Facebook", "LinkedIn", "Instagram"]) {
      expect(
        within(follow).getByRole("img", { name: new RegExp(network) })
      ).toBeInTheDocument();
    }
  });

  /**
   * The directory sits above the legal line, not below it: the legal line is
   * the last thing on the page in every convention a reader already knows.
   */
  // @req REQ-046
  it("puts the directory above the legal line", () => {
    render(<SiteFooter language="fr" />);

    const directory = screen.getByTestId("footer-directory");
    const links = screen.getByTestId("footer-links");

    expect(
      directory.compareDocumentPosition(links) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

/**
 * Ownership and credit each held a line of their own, so the legal block ran
 * three lines deep under a directory that is already tall. They are the same
 * statement — who owns this, who built it — and they now share one line.
 */
describe("the legal line — two rows, centred (REQ-046)", () => {
  // @req REQ-046
  it("puts ownership and credit on one shared row", () => {
    render(<SiteFooter language="fr" />);

    const baseline = screen.getByTestId("footer-baseline");

    expect(
      within(baseline).getByTestId("footer-ownership")
    ).toBeInTheDocument();
    expect(within(baseline).getByTestId("footer-credit")).toBeInTheDocument();
  });

  // @req REQ-046
  it("centres the legal row and the baseline rather than ragging them left", () => {
    render(<SiteFooter language="fr" />);

    expect(screen.getByTestId("footer-links")).toHaveClass("justify-center");
    expect(screen.getByTestId("footer-baseline")).toHaveClass("justify-center");
  });
});

/**
 * The directory read as a mark stranded on the left and three rubrics bunched
 * against the right, because the rubrics sat inside a wrapper of their own:
 * `justify-between` was spreading two children, not four, so the whole gap
 * fell in one place. Flattening the wrapper is the entire fix — the four
 * blocks then space themselves across the shell, which is how the reference
 * footer this was modelled on distributes its own columns.
 *
 * The sizes follow from that width: a directory given the full measure can
 * afford the display face at the h1 role for the rubric a reader is scanning
 * for, and the lead role for the links under it. At `small` the whole étage
 * read as fine print, which is the opposite of what a directory is for.
 */
describe("the directory takes the full measure (REQ-046)", () => {
  // @req REQ-046
  it("spreads the mark and the three rubrics as one row of siblings", () => {
    render(<SiteFooter language="fr" />);

    const directory = screen.getByTestId("footer-directory");

    expect(Array.from(directory.children)).toHaveLength(4);
    expect(directory.children[0]).toBe(screen.getByTestId("footer-brand"));
    expect(directory).toHaveClass("md:justify-between");
  });

  // @req REQ-046
  it("sets each rubric heading in the display face, above its links", () => {
    render(<SiteFooter language="fr" />);

    const explorer = screen.getByRole("navigation", {
      name: footer.directory.explorerHeading,
    });
    const heading = within(explorer).getByText(
      footer.directory.explorerHeading
    );

    expect(heading).toHaveClass("font-afh-display", "text-afh-h1");
    expect(explorer.querySelector("ul")).toHaveClass("text-afh-lead");
  });
});

/**
 * The mark was a 44px favicon beside a name, saying only which site this is —
 * something the masthead 8000 pixels above already said. What it never said is
 * what the site *is*. The qualifier the masthead carries belongs here too, at
 * the one size in the page where there is room for it, in the spectrum the
 * mark is drawn in rather than a flat ink.
 */
describe("the footer mark names what the atlas is (REQ-046)", () => {
  // @req REQ-046
  it("carries the qualifier under the product name", () => {
    render(<SiteFooter language="fr" />);

    const brand = screen.getByTestId("footer-brand");

    expect(brand).toHaveTextContent(PRODUCT_NAME);
    expect(brand).toHaveTextContent(PRODUCT_TAGLINE);
  });

  // @req REQ-046
  it("sets the qualifier in the brand spectrum, not in flat ink", () => {
    render(<SiteFooter language="fr" />);

    expect(screen.getByTestId("footer-tagline")).toHaveClass(
      "afh-brand-spectrum"
    );
  });

  // @req REQ-046
  it("draws the mark large enough to read as a continent", () => {
    render(<SiteFooter language="fr" />);

    const mark = within(screen.getByTestId("footer-brand")).getByRole(
      "presentation"
    );

    expect(mark).toHaveClass("h-20", "w-20");
  });
});
