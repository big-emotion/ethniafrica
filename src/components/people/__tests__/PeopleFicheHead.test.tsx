import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PeopleFicheHead } from "@/components/people/PeopleFicheHead";
import type {
  PeopleCountriesData,
  PeopleHeroData,
} from "@/lib/peopleDataTransformer";

const hero: PeopleHeroData = {
  peopleId: "PPL_YORUBA",
  nameMain: "Yoruba",
  exonyms: [],
  languageFamilyId: "FLG_BENOUECONGO",
  languageFamilyName: "Bénoué-Congo",
  currentCountries: ["NGA", "BEN"],
  historicalRegion: "Sud-Ouest du Nigeria, Yorubaland",
  ethnoLinguisticGroup: "Volta-Congo, Yoruboid",
};

const countries: PeopleCountriesData = {
  totalPopulation: 48482000,
  totalPopulationFormatted: "48.5M",
  referenceYear: 2025,
  distributions: [
    { country: "NGA", population: 45500000 },
    { country: "BEN", population: 1800000 },
  ],
};

describe("PeopleFicheHead (REQ-115)", () => {
  // @req REQ-115
  it("carries the fiche's own identifiers in its overline", () => {
    render(<PeopleFicheHead hero={hero} countries={countries} />);

    const eyebrow = screen.getByTestId("fiche-head-eyebrow");
    expect(eyebrow).toHaveTextContent("PPL_YORUBA");
    expect(eyebrow).toHaveTextContent("FLG_BENOUECONGO");
    expect(eyebrow).toHaveTextContent("Volta-Congo, Yoruboid");
  });

  // 25 of the corpus's 789 fiches declare no ethnoLinguisticGroup. Falling
  // back to the family keeps the overline a triple rather than trailing off
  // into an empty separator.
  // @req REQ-115
  it("falls back to the linguistic family when no ethnolinguistic group is declared", () => {
    render(
      <PeopleFicheHead
        hero={{ ...hero, ethnoLinguisticGroup: undefined }}
        countries={countries}
      />
    );

    const eyebrow = screen.getByTestId("fiche-head-eyebrow");
    expect(eyebrow).toHaveTextContent("Bénoué-Congo");
    expect(eyebrow.textContent).not.toMatch(/·\s*·/);
    expect(eyebrow.textContent?.trim()).not.toMatch(/·\s*$/);
  });

  // @req REQ-115
  it("states the population with the year it was declared for", () => {
    render(<PeopleFicheHead hero={hero} countries={countries} />);

    expect(screen.getByText(/48\s*482\s*000/)).toBeInTheDocument();
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  // @req REQ-115
  it("counts the countries of presence, not the fiche's currentCountries", () => {
    render(
      <PeopleFicheHead
        hero={{ ...hero, currentCountries: ["NGA"] }}
        countries={countries}
      />
    );

    // 75 fiches disagree between the two fields. The globe draws the
    // distribution, so the head has to count the same thing the reader sees.
    expect(screen.getByText(/2 pays de présence/)).toBeInTheDocument();
  });

  // @req REQ-115
  it("leads with the historical region the fiche declares", () => {
    render(<PeopleFicheHead hero={hero} countries={countries} />);

    expect(
      screen.getByText(/Sud-Ouest du Nigeria, Yorubaland/)
    ).toBeInTheDocument();
  });

  // @req REQ-115
  it("says nothing about a population the fiche never declared", () => {
    render(
      <PeopleFicheHead
        hero={hero}
        countries={{
          ...countries,
          totalPopulation: 0,
          referenceYear: undefined,
        }}
      />
    );

    expect(screen.queryByText(/personnes/)).not.toBeInTheDocument();
    expect(screen.getByText(/2 pays de présence/)).toBeInTheDocument();
  });
});
