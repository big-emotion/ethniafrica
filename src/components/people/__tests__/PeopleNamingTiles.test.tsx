import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PeopleNamingTiles } from "@/components/people/PeopleNamingTiles";

const naming = {
  nameMain: "Yoruba",
  selfAppellation: "Yorùbá",
  exonyms: ["Nago", "Aku"],
  originOfExonyms: "Nago vient d'un usage voisin documenté.",
  whyProblematic: "Nago peut réduire des identités distinctes.",
  contemporaryUsage: "Yorùbá est aujourd'hui revendiqué.",
  isoCode: "yor",
};

describe("PeopleNamingTiles", () => {
  // @req REQ-153
  it("gives each of the four naming fields a fact-bearing tile", () => {
    const { container } = render(<PeopleNamingTiles {...naming} />);
    const tiles = [...container.querySelectorAll("[data-fiche-tile]")];

    expect(tiles).toHaveLength(4);
    expect(tiles[0]).toHaveTextContent("Auto-appellation");
    expect(tiles[0]).toHaveTextContent("Yorùbá");
    expect(tiles[1].querySelector("[data-closed-fact]")).toHaveTextContent(
      "2 noms relevés"
    );
    expect(tiles[2].querySelector("[data-closed-fact]")).toHaveTextContent(
      "Nago vient d'un usage voisin documenté."
    );
    expect(tiles[3].querySelector("[data-closed-fact]")).toHaveTextContent(
      "Yorùbá est aujourd'hui revendiqué."
    );
    expect(
      screen.getByText("Nago peut réduire des identités distinctes.")
    ).toBeInTheDocument();
  });

  // @req REQ-115
  it("keeps the autonym visible and language-tagged before any tile is opened", () => {
    const { container } = render(<PeopleNamingTiles {...naming} />);
    const selfTile = container.querySelector("[data-fiche-tile]")!;

    expect(
      selfTile.querySelector('[data-closed-fact] [lang="yo"]')
    ).toHaveTextContent("Yorùbá");
  });

  // @req REQ-153
  it("omits empty optional fields without replacing them with claims", () => {
    const { container } = render(
      <PeopleNamingTiles
        nameMain="Yoruba"
        exonyms={[]}
        originOfExonyms={null}
        whyProblematic={null}
        contemporaryUsage={null}
      />
    );

    expect(container.querySelectorAll("[data-fiche-tile]")).toHaveLength(1);
    expect(screen.queryByText("Exonymes")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Pourquoi ces noms posent problème/)
    ).not.toBeInTheDocument();
  });

  // @req REQ-145
  it("uses English field labels and count for an English fiche", () => {
    render(<PeopleNamingTiles {...naming} language="en" />);

    expect(screen.getAllByText("Self-designation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Exonyms").length).toBeGreaterThan(0);
    expect(screen.getByText("2 names recorded")).toBeInTheDocument();
  });
});
