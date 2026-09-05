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

  // The languages and patronymes index pages (ETNI-1795) ship in the same
  // rubric as pays/peuples/familles — a page nobody can navigate to is not
  // browsable (ETNI-1801).
  // @req REQ-139
  it("adds the languages and patronymes index pages to the explorer rubric", () => {
    render(<SiteFooter language="fr" />);

    const explorer = screen.getByRole("navigation", {
      name: footer.directory.explorerHeading,
    });

    expect(
      within(explorer).getByRole("link", { name: footer.directory.languages })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "languages"));
    expect(
      within(explorer).getByRole("link", {
        name: footer.directory.patronymes,
      })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "patronymes"));
  });

  /**
   * Doctrine, À propos and Sources describe the project, not the corpus, so
   * no access mode lists them. The footer is where a page about the project
   * belongs — and the only place a reader can now reach the doctrine or the
   * source bibliography from the chrome.
   */
  // @req REQ-132
  it("gathers the pages about the project itself under one rubric", () => {
    render(<SiteFooter language="fr" />);

    const project = screen.getByRole("navigation", {
      name: footer.directory.projectHeading,
    });

    expect(
      within(project).getByRole("link", { name: footer.directory.doctrine })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "doctrine"));
    expect(
      within(project).getByRole("link", { name: footer.directory.about })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "about"));
    expect(
      within(project).getByRole("link", { name: footer.directory.sources })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "sources"));
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
   * An account is named before it exists. A network shown as a live link that
   * leads nowhere is worse than one shown as a mark: the reader spends a click
   * to learn the account is not open yet. So an entry with no URL renders as
   * an image with its network's name, and becomes a link the day
   * `SOCIAL_NETWORKS` carries one.
   */
  // @req REQ-046
  it("shows a network with no account yet as a mark, not a dead link", () => {
    render(<SiteFooter language="fr" />);

    const follow = screen.getByTestId("footer-follow");

    expect(
      within(follow).getByRole("img", {
        name: `Facebook — ${footer.directory.followPending}`,
      })
    ).toBeInTheDocument();
    expect(within(follow).queryByRole("link", { name: /Facebook/ })).toBeNull();
  });

  /**
   * LinkedIn is the account that is open, so it is the one entry that carries
   * a URL. It opens in its own tab: the footer sits at the bottom of a fiche,
   * and a reader sent off-site from there loses their place in the corpus.
   */
  // @req REQ-046
  it("opens the LinkedIn mark on the project's page", () => {
    render(<SiteFooter language="fr" />);

    const linkedin = within(screen.getByTestId("footer-follow")).getByRole(
      "link",
      { name: "LinkedIn" }
    );

    expect(linkedin).toHaveAttribute(
      "href",
      "https://www.linkedin.com/company/dictionnaire-des-ethnies-d%E2%80%99afrique/"
    );
    expect(linkedin).toHaveAttribute("target", "_blank");
    expect(linkedin).toHaveAttribute("rel", "noopener noreferrer");
  });

  /**
   * Matched on the accessible name rather than the role: a network is named
   * whether its account is open (a link) or still pending (a mark).
   */
  // @req REQ-046
  it("names every network the project intends to be followed on", () => {
    render(<SiteFooter language="fr" />);

    const follow = screen.getByTestId("footer-follow");

    for (const network of [
      "Facebook",
      "LinkedIn",
      "Instagram",
      "TikTok",
      "YouTube",
    ]) {
      expect(
        within(follow).getByLabelText(new RegExp(network))
      ).toBeInTheDocument();
    }
  });

  /**
   * Instagram, TikTok and YouTube opened after LinkedIn — each becomes a live
   * link the same way LinkedIn did, opening off-site rather than losing the
   * reader's place in the corpus.
   */
  // @req REQ-046
  it.each([
    ["Instagram", "https://www.instagram.com/ethniafrica/"],
    ["TikTok", "https://www.tiktok.com/@ethniafrica"],
    ["YouTube", "https://www.youtube.com/channel/UCcJiwOQJ7-ajWnYFTDTOt0A"],
  ])("opens the %s mark on the project's account", (name, href) => {
    render(<SiteFooter language="fr" />);

    const link = within(screen.getByTestId("footer-follow")).getByRole("link", {
      name,
    });

    expect(link).toHaveAttribute("href", href);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
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
  it("spreads the mark and every rubric as one row of siblings", () => {
    render(<SiteFooter language="fr" />);

    const directory = screen.getByTestId("footer-directory");

    expect(Array.from(directory.children)).toHaveLength(5);
    expect(directory.children[0]).toBe(screen.getByTestId("footer-brand"));
    expect(directory).toHaveClass("md:justify-between");
  });

  /**
   * The rubric heading is a card title, not a page title: display family at
   * body size, per typography-charter §4. It shipped at `h1` — the role the
   * fiche's own title takes — so three navigation labels outweighed the
   * heading of the document they sit under, at 40px on desktop.
   */
  // @req REQ-046
  it("sets each rubric heading in the display face, above its links", () => {
    render(<SiteFooter language="fr" />);

    const explorer = screen.getByRole("navigation", {
      name: footer.directory.explorerHeading,
    });
    const heading = within(explorer).getByText(
      footer.directory.explorerHeading
    );

    expect(heading).toHaveClass("font-afh-display", "text-afh-body");
    expect(heading).not.toHaveClass("text-afh-h1");
  });

  /**
   * A footer link is a control label, so it takes `small` — the role
   * typography-charter §1 files control labels under, and the size the two
   * rows below the directory already run at. At `lead` it outran its own
   * rubric heading.
   */
  // @req REQ-046
  it("sets the rubric links below their heading, at control-label size", () => {
    render(<SiteFooter language="fr" />);

    const explorer = screen.getByRole("navigation", {
      name: footer.directory.explorerHeading,
    });

    expect(explorer.querySelector("ul")).not.toHaveClass("text-afh-lead");
    expect(screen.getByTestId("footer-content")).toHaveClass("text-afh-small");
  });

  /**
   * A rubric is a list a reader scans, so its links need to be separable at a
   * glance. At the 4px gap they shipped with, three underlined labels fused
   * into one grey block and the rubric read as a paragraph. The heading takes
   * more space above its list than the list leaves between its own items, so
   * the heading binds to what it names rather than to the block above it.
   */
  // @req REQ-046
  it("spaces the links apart, and its heading further apart still", () => {
    render(<SiteFooter language="fr" />);

    const explorer = screen.getByRole("navigation", {
      name: footer.directory.explorerHeading,
    });
    const links = explorer.querySelector("ul");

    expect(links).toHaveClass("gap-afh-lg", "mt-afh-5xl");
    expect(links).not.toHaveClass("gap-afh-xs");
  });
});

/**
 * The mark was a 44px favicon beside a name, saying only which site this is —
 * something the masthead 8000 pixels above already said. What it never said is
 * what the site *is*. The qualifier the masthead carries belongs here too, in
 * the same gradient rather than a flat ink.
 *
 * It used to be painted in a five-hue ramp sampled off the mark, while the
 * masthead painted the identical string in the two-stop brand gradient. One
 * lockup cannot have two colour treatments: the reader meets the same words
 * twice on one page and reads them as two different things. Brand charter
 * §5.3 scopes `--afh-gradient-brand` to the lockup, and the footer is one.
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
  it("sets the qualifier in the masthead's brand gradient, not in flat ink", () => {
    render(<SiteFooter language="fr" />);

    const tagline = screen.getByTestId("footer-tagline");

    expect(tagline).toHaveClass("afh-brand-tagline");
    expect(tagline).not.toHaveClass("afh-brand-spectrum");
  });

  /**
   * The lockup is the masthead's, one step up because the mark beside it is
   * 80px rather than 44px — never the page's own `h1` role, which belongs to
   * the fiche the reader just finished.
   */
  // @req REQ-046
  it("sets the wordmark below the page-title role", () => {
    render(<SiteFooter language="fr" />);

    const wordmark = within(screen.getByTestId("footer-brand")).getByText(
      PRODUCT_NAME
    );

    expect(wordmark).toHaveClass("font-afh-display", "text-afh-h2");
    expect(wordmark).not.toHaveClass("text-afh-h1");
  });

  // @req REQ-046
  it("draws the mark large enough to read as a continent", () => {
    render(<SiteFooter language="fr" />);

    const mark = within(screen.getByTestId("footer-brand")).getByRole(
      "presentation"
    );

    expect(mark).toHaveClass("h-20", "w-20");
  });

  /**
   * The lockup is the masthead's geometry at twice the size: the mark to the
   * left of the name, the qualifier under the name. Stacked in one column —
   * mark, then name, then qualifier — the three parts sat at three different
   * heights and read as three things rather than one mark, and the block was
   * narrow enough that the rubrics beside it started at a quarter of the
   * measure instead of a third.
   */
  // @req REQ-046
  it("sets the mark beside the wordmark, and the qualifier under it", () => {
    render(<SiteFooter language="fr" />);

    const brand = screen.getByTestId("footer-brand");
    const [mark, text] = Array.from(brand.children);

    expect(mark).toBe(within(brand).getByRole("presentation"));
    expect(brand).not.toHaveClass("flex-col");
    expect(text).toHaveClass("flex-col");
    expect(text.children[0]).toHaveTextContent(PRODUCT_NAME);
    expect(text.children[1]).toBe(screen.getByTestId("footer-tagline"));
  });
});
