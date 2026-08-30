import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { getTranslation } from "@/lib/translations";

vi.mock("@/hooks/use-consent", () => ({
  useConsent: () => ({ setShowBanner: vi.fn() }),
}));

const { footer } = getTranslation("fr");

/**
 * The footer was one wrapping flex row holding three unrelated groups, so
 * what a reader saw depended entirely on the window: at one width the
 * copyright sat between two links, at another it led the line. Declared rows
 * say the same thing at every width — what the site offers, who owns it, who
 * built it — in that order. Ownership and credit now share the last one, but
 * the order they read in is the invariant, not the row count.
 *
 * All of it was set at `--afh-text-caption`, the 13px role the charter
 * reserves for figure captions and source lines. A whole landmark at caption
 * size is a landmark the reader is being told not to read.
 */
describe("the footer — declared rows, and a size worth reading (REQ-046)", () => {
  // @req REQ-046
  it("keeps the links, the ownership and the credit each addressable", () => {
    render(<SiteFooter language="fr" />);

    expect(screen.getByTestId("footer-links")).toBeInTheDocument();
    expect(screen.getByTestId("footer-ownership")).toBeInTheDocument();
    expect(screen.getByTestId("footer-credit")).toBeInTheDocument();
  });

  // @req REQ-046
  it("reads links, then ownership, then credit", () => {
    render(<SiteFooter language="fr" />);

    const links = screen.getByTestId("footer-links");
    const ownership = screen.getByTestId("footer-ownership");
    const credit = screen.getByTestId("footer-credit");

    expect(
      links.compareDocumentPosition(ownership) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      ownership.compareDocumentPosition(credit) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  /**
   * The ownership line is the one thing in the footer that is not a
   * destination. Putting it in the link row is what made a reader hunt for
   * which of six similar-looking strings could be clicked.
   */
  // @req REQ-046
  it("keeps the ownership line free of links", () => {
    render(<SiteFooter language="fr" />);

    const ownership = screen.getByTestId("footer-ownership");

    expect(ownership).toHaveTextContent(footer.copyright);
    expect(within(ownership).queryByRole("link")).toBeNull();
    expect(within(ownership).queryByRole("button")).toBeNull();
  });

  // @req REQ-046
  it("keeps the credit a link out to the studio", () => {
    render(<SiteFooter language="fr" />);

    const credit = within(screen.getByTestId("footer-credit")).getByRole(
      "link"
    );

    expect(credit).toHaveAttribute("href", "https://big-emotion.com/");
    expect(credit).toHaveAccessibleName(new RegExp(footer.attribution));
  });

  // @req REQ-046
  it("leaves no part of the footer at caption size", () => {
    const { container } = render(<SiteFooter language="fr" />);

    expect(container.querySelector(".text-afh-caption")).toBeNull();
  });

  /**
   * The directory and the legal block are two étages, not four consecutive
   * rows. The column's own `gap` is the rhythm *inside* an étage; running it
   * across the rule as well made the reader meet eight blocks in a queue
   * instead of two groups. The rule carries the separation itself.
   */
  // @req REQ-046
  it("separates the directory from the legal block by more than the column gap", () => {
    render(<SiteFooter language="fr" />);

    const rule = screen.getByTestId("footer-rule");
    const column = screen.getByTestId("footer-content");

    expect(column).toHaveClass("gap-afh-lg");
    expect(rule).toHaveClass("my-afh-5xl");
  });

  // The links row still holds both landmarks it held before: the legal nav
  // keeps its accessible name, and « À propos » stays out of it because it is
  // editorial and would make that name inaccurate.
  // @req REQ-046
  it("keeps the legal navigation a named landmark beside the editorial links", () => {
    render(<SiteFooter language="fr" />);

    const row = screen.getByTestId("footer-links");
    const legal = within(row).getByRole("navigation", {
      name: footer.legalNavigationLabel,
    });

    expect(within(legal).queryByText(footer.about)).toBeNull();
    expect(within(row).getByText(footer.about)).toBeInTheDocument();
  });
});
