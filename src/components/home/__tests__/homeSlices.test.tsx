import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DidYouKnow } from "@/components/home/DidYouKnow";
import { PurposeBlocks } from "@/components/home/PurposeBlocks";
import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import {
  getCountryRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";

const FACT: DidYouKnowFact = {
  id: "monrovia",
  headline: "La capitale du Liberia porte le nom d'un président américain.",
  body: ["Monrovia vient de James Monroe."],
  entities: [
    { kind: "country", id: "LBR", label: "Liberia" },
    {
      kind: "people",
      id: "PPL_AMERICANO_LIBERIENS",
      label: "Américano-Libériens",
    },
  ],
  tier: "referenced",
};

const SECOND_FACT: DidYouKnowFact = {
  id: "cameroun",
  headline: "Le Cameroun porte le nom d'un crustacé.",
  body: ["Rio dos Camarões signifie la rivière des crevettes."],
  entities: [{ kind: "country", id: "CMR", label: "Cameroun" }],
  tier: "referenced",
  sources: [
    {
      title: "Ministère des Relations extérieures du Cameroun — Histoire",
      url: "https://www.diplocam.cm/histoire/",
      tier: "official",
    },
  ],
};

describe("DidYouKnow — the anecdote that leads somewhere (REQ-113)", () => {
  /**
   * Half the bank illustrates with a drawn plate rather than a photograph, and
   * the home rendered nothing at all for those: 34 of 67 facts left their image
   * column empty next to a full column of prose. Asserted per kind, because the
   * defect was invisible in any draw that happened to land on a photograph.
   */
  // @req REQ-113
  it("illustrates a fact whichever register its picture comes from", () => {
    const photographed = { ...FACT, id: "monrovia" };
    const drawn = { ...FACT, id: "iteso-bakedi" };

    const { container } = render(
      <DidYouKnow language="fr" facts={[photographed, drawn]} />
    );

    const cards = container.querySelectorAll(".home-dyk-card");
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card.querySelector(".home-dyk-figure")).not.toBeNull();
    }
  });

  // @req REQ-113
  it("alternates which side the illustration takes", () => {
    const { container } = render(
      <DidYouKnow
        language="fr"
        facts={[
          { ...FACT, id: "monrovia" },
          { ...FACT, id: "iteso-bakedi" },
        ]}
      />
    );

    expect(
      container.querySelector(".home-dyk-card--image-start")
    ).not.toBeNull();
    expect(container.querySelector(".home-dyk-card--image-end")).not.toBeNull();
  });

  // @req REQ-113
  it("routes each chip to its own kind of fiche", () => {
    render(<DidYouKnow language="fr" facts={[FACT]} />);

    expect(screen.getByRole("link", { name: /Liberia/ })).toHaveAttribute(
      "href",
      getCountryRoute("fr", "LBR")
    );
    expect(
      screen.getByRole("link", { name: /Américano-Libériens/ })
    ).toHaveAttribute("href", getPeopleRoute("fr", "PPL_AMERICANO_LIBERIENS"));
  });

  // Every fiche states the authority of what it asserts; a fact on the home
  // asserts just as much and owes the same.
  // @req REQ-113
  it("states the tier of the source behind the fact", () => {
    render(<DidYouKnow language="fr" facts={[FACT]} />);

    expect(screen.getByText("Source référencée")).toBeInTheDocument();
  });

  // Rendering the heading over an empty bank would claim an anecdote the
  // atlas does not have.
  // @req REQ-113
  it("renders nothing at all when the bank has none to give", () => {
    const { container } = render(<DidYouKnow language="fr" facts={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  // The band is a hook, and a hook has no URL. Without this the anecdote is
  // the only place the bank exists and none of it can be shared.
  // @req REQ-113
  it("offers the reader the page holding the others", () => {
    render(<DidYouKnow language="fr" facts={[FACT]} />);

    expect(
      screen.getByRole("link", { name: "Lire d'autres anecdotes" })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "anecdotes"));
  });

  // The draw is the variation. A pager laid over it made the band assert a
  // fixed inventory — « 2 / 24 » — where the reader is handed a single card.
  // @req REQ-113
  it("carries no pager over the drawn fact", () => {
    render(<DidYouKnow language="fr" facts={[FACT]} />);

    expect(screen.queryByRole("button", { name: "Fait suivant" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Fait précédent" })).toBeNull();
    expect(screen.queryByText(/^\d+ \/ \d+$/)).toBeNull();
  });

  // The home is a two-card editorial preview, not the interactive anecdote
  // reader. The two documents alternate around their text from tablet width
  // upward while every phone keeps the image first in reading order.
  // @req REQ-113
  it("shows two illustrated facts with alternating image sides", () => {
    const { container } = render(
      <DidYouKnow language="fr" facts={[FACT, SECOND_FACT]} />
    );

    const cards = screen.getAllByTestId("home-dyk-fact");
    expect(cards).toHaveLength(2);
    expect(container.querySelectorAll("figure img")).toHaveLength(2);
    expect(cards[0]).toHaveClass("home-dyk-card--image-start");
    expect(cards[1]).toHaveClass("home-dyk-card--image-end");
  });

  // Controls belong to the dedicated reader. The home preview remains a
  // section in the page flow, with links to the corpus but no carousel or
  // reaction surface.
  // @req REQ-113
  it("does not import the anecdote reader's controls", () => {
    render(<DidYouKnow language="fr" facts={[FACT, SECOND_FACT]} />);

    for (const name of [
      "Suivant",
      "Cette anecdote est intéressante",
      "Je conteste cette anecdote",
      "Partager",
    ]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });
});

describe("PurposeBlocks — arguing by example (REQ-113)", () => {
  // @req REQ-113
  it("walks the reader through country, people and language family", () => {
    render(<PurposeBlocks language="fr" />);

    expect(screen.getByText("Un pays")).toBeInTheDocument();
    expect(screen.getByText("Un peuple")).toBeInTheDocument();
    expect(screen.getByText("Une famille de langues")).toBeInTheDocument();
  });

  // The heading led on « Autonyme, exonyme », two terms the section itself
  // only defines three blocks lower — so the first line of the one section
  // written to explain something to a reader who knows nothing assumed the
  // vocabulary it exists to teach. The games charter §8 states the rule for
  // quiz stems ("no term the fiche itself does not gloss"); it holds at
  // least as hard for a section title, which is read before the gloss and
  // cannot be skipped.
  //
  // The replacement names the three blocks in their own order, so the
  // heading is also the section's table of contents.
  // @req REQ-113
  it("opens on plain words rather than on the vocabulary it teaches below", () => {
    render(<PurposeBlocks language="fr" />);

    const heading = screen.getByTestId("home-purpose-heading");

    expect(heading.textContent).not.toMatch(/autonyme|exonyme/i);
    expect(heading).toHaveTextContent(/un pays, un peuple, une langue/i);
  });

  // CC BY-SA obliges the credit to travel with the image, not to sit in a
  // repo file the reader never opens.
  // @req REQ-113
  it("prints the licence credit under the image that requires one", () => {
    const { container } = render(<PurposeBlocks language="fr" />);
    const figures = container.querySelectorAll("figure");

    expect(
      Array.from(figures).some((figure) =>
        within(figure as HTMLElement).queryByText(/CC BY-SA 2\.0/)
      )
    ).toBe(true);
  });

  // @req REQ-113
  it("gives every illustration an alt that says what it shows", () => {
    const { container } = render(<PurposeBlocks language="fr" />);

    for (const image of Array.from(container.querySelectorAll("img"))) {
      expect(image.getAttribute("alt")?.length ?? 0).toBeGreaterThan(20);
    }
  });
});
