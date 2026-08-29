import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CountrySynthesisCard } from "@/components/home/CountrySynthesisCard";
import { DidYouKnow } from "@/components/home/DidYouKnow";
import { PurposeBlocks } from "@/components/home/PurposeBlocks";
import type { CountrySynthesis } from "@/lib/home/countrySynthesis";
import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import {
  getCountryRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";

const SYNTHESIS: CountrySynthesis = {
  id: "BFA",
  nameFr: "Burkina Faso",
  summary: "Le nom du Burkina Faso est composé dans deux langues nationales.",
  formerNames: ["Haute-Volta (1919-1960)"],
  peoples: [{ name: "Mossi", peopleId: "PPL_MOSSI" }, { name: "Bobo" }],
  kingdoms: ["Royaumes Mossi"],
  languages: ["Mooré", "Dioula"],
};

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
  id: "bantou",
  headline: "« Bantou » n'est pas un peuple : c'est une catégorie de 1862.",
  body: ["Wilhelm Bleek construit le terme à partir de ba- et -ntu."],
  entities: [{ kind: "family", id: "FLG_BANTU", label: "Langues bantoues" }],
  tier: "unverified",
};

const DECK: DidYouKnowFact[] = [FACT, SECOND_FACT];

describe("CountrySynthesisCard — showing what a fiche holds (REQ-113)", () => {
  // @req REQ-113
  it("sends the reader to the country's own fiche", () => {
    render(<CountrySynthesisCard language="fr" synthesis={SYNTHESIS} />);

    expect(
      screen.getByRole("link", { name: /Lire la fiche Burkina Faso/ })
    ).toHaveAttribute("href", getCountryRoute("fr", "BFA"));
  });

  // The former name is the line that makes a reader stop. A card that
  // dropped it would be a list of facts about a country they already knew.
  // @req REQ-113
  it("prints the former names the corpus records", () => {
    render(<CountrySynthesisCard language="fr" synthesis={SYNTHESIS} />);

    expect(screen.getByText("Haute-Volta (1919-1960)")).toBeInTheDocument();
  });

  // @req REQ-113
  it("links a people that has a fiche and leaves plain one that does not", () => {
    render(<CountrySynthesisCard language="fr" synthesis={SYNTHESIS} />);

    expect(screen.getByRole("link", { name: "Mossi" })).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_MOSSI")
    );
    expect(screen.queryByRole("link", { name: "Bobo" })).toBeNull();
    expect(screen.getByText(/Bobo/)).toBeInTheDocument();
  });

  // A dash where a value should be advertises an empty atlas. The card drops
  // the whole line instead, so what remains is true.
  // @req REQ-113
  it("omits a fact line the corpus cannot fill rather than dashing it", () => {
    render(
      <CountrySynthesisCard
        language="fr"
        synthesis={{ ...SYNTHESIS, formerNames: [], languages: [] }}
      />
    );

    expect(screen.queryByText("Anciens noms")).toBeNull();
    expect(screen.queryByText("Langues")).toBeNull();
    expect(screen.getByText("Peuples")).toBeInTheDocument();
  });
});

describe("DidYouKnow — the anecdote that leads somewhere (REQ-113)", () => {
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
  it("renders nothing at all when the bank is empty", () => {
    const { container } = render(<DidYouKnow language="fr" facts={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  // A one-card deck has nothing to page through. Arrows and dots that do
  // nothing tell the reader there is more behind them, and there is not.
  // The deck is a hook, and a hook has no URL. Without this the band is
  // the only place the anecdotes exist and none of them can be shared.
  // @req REQ-113
  it("offers the reader a page holding all of them", () => {
    render(<DidYouKnow language="fr" facts={DECK} />);

    expect(
      screen.getByRole("link", { name: "Lire les 2 anecdotes" })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "anecdotes"));
  });

  // @req REQ-113
  it("shows no controls when the bank holds a single fact", () => {
    render(<DidYouKnow language="fr" facts={[FACT]} />);

    expect(screen.queryByRole("button", { name: "Fait suivant" })).toBeNull();
    expect(screen.queryByText("1 / 1")).toBeNull();
  });
});

describe("DidYouKnow as a deck — paging the whole bank (REQ-113)", () => {
  // Only the fact on top is reachable. Chips of the cards behind it would
  // otherwise be five extra tab stops and five links a screen reader reads
  // out as if they belonged to the fact being shown.
  // @req REQ-113
  it("exposes the leading fact and keeps the rest out of reach", () => {
    render(<DidYouKnow language="fr" facts={DECK} />);

    expect(screen.getByRole("link", { name: /Liberia/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Langues bantoues/ })).toBeNull();
  });

  // @req REQ-113
  it("turns to the next fact when the reader asks for it", async () => {
    const user = userEvent.setup();
    render(<DidYouKnow language="fr" facts={DECK} />);

    await user.click(screen.getByRole("button", { name: "Fait suivant" }));

    expect(
      screen.getByRole("link", { name: /Langues bantoues/ })
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Liberia/ })).toBeNull();
  });

  // Wrapping rather than disabling: a six-card deck read to the end should
  // not dead-end on an arrow that has stopped responding.
  // @req REQ-113
  it("wraps to the last fact when the reader goes back from the first", async () => {
    const user = userEvent.setup();
    render(<DidYouKnow language="fr" facts={DECK} />);

    await user.click(screen.getByRole("button", { name: "Fait précédent" }));

    expect(
      screen.getByRole("link", { name: /Langues bantoues/ })
    ).toBeInTheDocument();
  });

  // @req REQ-113
  it("says how far into the deck the reader has come", async () => {
    const user = userEvent.setup();
    render(<DidYouKnow language="fr" facts={DECK} />);

    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fait suivant" }));

    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  // @req REQ-113
  it("lets the reader jump straight to a fact", async () => {
    const user = userEvent.setup();
    render(<DidYouKnow language="fr" facts={DECK} />);

    await user.click(screen.getByRole("button", { name: "Aller au fait 2" }));

    expect(
      screen.getByRole("link", { name: /Langues bantoues/ })
    ).toBeInTheDocument();
  });

  // The tier belongs to the fact, not to the section. A deck that kept the
  // first card's tier under the second would attribute an authority the
  // second fact does not claim.
  // @req REQ-113
  it("carries the tier of the fact on top, not of the deck", async () => {
    const user = userEvent.setup();
    render(<DidYouKnow language="fr" facts={DECK} />);

    await user.click(screen.getByRole("button", { name: "Fait suivant" }));

    expect(screen.getByText("Source non vérifiée")).toBeInTheDocument();
  });

  // The arrows move the deck; nothing tells a screen reader the page
  // changed under them unless the deck says so itself.
  // @req REQ-113
  it("announces the fact it has turned to", async () => {
    const user = userEvent.setup();
    render(<DidYouKnow language="fr" facts={DECK} />);

    await user.click(screen.getByRole("button", { name: "Fait suivant" }));

    expect(screen.getByText(/Fait 2 sur 2 :/)).toBeInTheDocument();
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
