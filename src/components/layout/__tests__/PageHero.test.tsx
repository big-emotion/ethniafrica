import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHero } from "@/components/layout/PageHero";

/**
 * The hero is the one band every page opens on, so what it owes the reader is
 * an order, not a decoration: the page says what it is, then qualifies it,
 * then says where it sits in the atlas.
 *
 * The trail arrives as a slot rather than being mounted here, because the
 * component that derives it reads the router. Passing it in keeps the hero a
 * plain function of its props and lets this file assert the order for real
 * instead of against a mock.
 */
const trail = <nav aria-label="Fil d'ariane">Accueil › Jouer › Quiz</nav>;

describe("the page hero — the plate, and what it carries (REQ-115)", () => {
  // @req REQ-115
  it("names the page in the one h1 the band raises", () => {
    render(<PageHero variant="compact" title="Choisis ton parcours" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Choisis ton parcours");
  });

  /**
   * `PageLayout` has accepted a `subtitle` since it was written and rendered
   * nothing with it — eleven call sites pass one into a void. The plate is
   * where it lands.
   */
  // @req REQ-115
  it("renders the subtitle the shell used to swallow", () => {
    render(
      <PageHero
        variant="compact"
        title="Choisis ton parcours"
        subtitle="Huit questions, tirées du corpus."
      />
    );

    expect(
      screen.getByText("Huit questions, tirées du corpus.")
    ).toBeInTheDocument();
  });

  // @req REQ-115
  it("raises no subtitle element when the page gives none", () => {
    const { container } = render(
      <PageHero variant="compact" title="Mentions légales" />
    );

    expect(
      container.querySelector("[data-testid='page-hero-subtitle']")
    ).toBeNull();
  });

  /**
   * The order is the request: a trail read before the title tells the reader
   * where they are before saying what they are looking at.
   */
  // @req REQ-115
  it("puts the trail below the title and the subtitle, inside the plate", () => {
    render(
      <PageHero
        variant="compact"
        title="Quiz"
        subtitle="Huit questions."
        trail={trail}
      />
    );

    const plate = screen.getByTestId("page-hero-plate");
    const heading = within(plate).getByRole("heading", { level: 1 });
    const subtitle = within(plate).getByTestId("page-hero-subtitle");
    const crumbs = within(plate).getByLabelText("Fil d'ariane");

    expect(
      heading.compareDocumentPosition(subtitle) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      subtitle.compareDocumentPosition(crumbs) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  /**
   * The two variants differ by height alone, and the height is a class rather
   * than a style so the viewport unit stays in the stylesheet where a media
   * query can reach it.
   */
  // @req REQ-115
  it("marks which of the two bands it is", () => {
    const { rerender } = render(<PageHero variant="immersive" title="Jouer" />);
    expect(screen.getByTestId("page-hero")).toHaveAttribute(
      "data-hero-variant",
      "immersive"
    );

    rerender(<PageHero variant="compact" title="Quiz" />);
    expect(screen.getByTestId("page-hero")).toHaveAttribute(
      "data-hero-variant",
      "compact"
    );
  });

  /**
   * The immersive band is the only one that takes a visual, and it must not
   * announce it: the picture argues the copy beside it, so a screen reader
   * that reads the copy has already had the argument.
   */
  // @req REQ-115
  it("carries a visual only when one is given", () => {
    const { rerender } = render(
      <PageHero variant="immersive" title="EthniAfrica" />
    );
    expect(screen.queryByTestId("page-hero-media")).toBeNull();

    rerender(
      <PageHero
        variant="immersive"
        title="EthniAfrica"
        media={<img src="/x.jpg" alt="" />}
      />
    );
    expect(screen.getByTestId("page-hero-media")).toBeInTheDocument();
  });
});
