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
    render(<PageHero title="Choisis ton parcours" />);

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
    const { container } = render(<PageHero title="Mentions légales" />);

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
    render(<PageHero title="Quiz" subtitle="Huit questions." trail={trail} />);

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
});

/**
 * A fiche's head is not a string.
 *
 * A people fiche names its subject with the autonym beside the exonym and the
 * `lang` attribute that makes the pair readable — a treatment an ESLint rule
 * makes mandatory. A country fiche prints the corpus identifier and the
 * reference year, and, when the reader came from a people, the way back.
 * Flattening any of that into `title` + `subtitle` would lose it, so the plate
 * takes a head the page composed instead.
 */
describe("the page hero — a head the page composed itself (REQ-115)", () => {
  const ficheHead = (
    <header data-testid="fiche-head">
      <p>BEN · fiche pays</p>
      <h1>Bénin</h1>
    </header>
  );

  // @req REQ-115
  it("fills the plate with the head a page hands it", () => {
    render(<PageHero head={ficheHead} />);

    const plate = screen.getByTestId("page-hero-plate");
    expect(plate).toContainElement(screen.getByTestId("fiche-head"));
    expect(within(plate).getByRole("heading", { level: 1 })).toHaveTextContent(
      "Bénin"
    );
  });

  /**
   * One h1 per page. A head that brings its own title and a band that composes
   * a second one is the fault the fiches passed `hideHeader` to avoid, back
   * when the only way to keep one heading was to raise no band at all.
   */
  // @req REQ-115
  it("composes no title of its own beside the head", () => {
    const { container } = render(<PageHero head={ficheHead} title="Pays" />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.querySelector(".afh-hero-title")).toBeNull();
  });

  // @req REQ-115
  it("still hangs the trail under the head", () => {
    render(<PageHero head={ficheHead} trail={trail} />);

    const plate = screen.getByTestId("page-hero-plate");
    const head = within(plate).getByTestId("fiche-head");
    const crumbs = within(plate).getByLabelText("Fil d'ariane");

    expect(
      head.compareDocumentPosition(crumbs) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
