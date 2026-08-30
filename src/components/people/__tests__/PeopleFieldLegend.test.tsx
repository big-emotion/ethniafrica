import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PeopleFieldLegend } from "@/components/people/PeopleFieldLegend";
import type { CountryDistribution } from "@/types/afrik";

const legendFor = (distribution: CountryDistribution[]) =>
  render(<PeopleFieldLegend distribution={distribution} />);

describe("PeopleFieldLegend (REQ-116/REQ-119)", () => {
  // The legend is where the halo stops being decoration: it states that the
  // gradient fades to nothing, which is the claim the encoding rests on.
  // @req REQ-116
  it("states that the field has no edge", () => {
    legendFor([{ country: "NGA", population: 45500000 }]);

    expect(screen.getByText(/bord nul/i)).toBeInTheDocument();
  });

  // The legend used to print the fiche's whole roll of declared presences —
  // every country, with its population — which is the same field, in full,
  // that "Répartition géographique" prints further down with the share, the
  // note, the link and the source line. The key belongs to the map; the roll
  // belongs to the section that can say more about it than a name and a count.
  // @req REQ-116
  it("keys the map without restating the roll of countries", () => {
    legendFor([
      { country: "BEN", population: 1800000 },
      { country: "NGA", population: 45500000 },
    ]);

    expect(screen.queryByText(/Nigeria/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bénin/)).not.toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  // 38 declared presences across 24 fiches sit outside the atlas's Africa
  // scope. The one thing the reader cannot learn from the map is what the map
  // left out, so that stays with the key rather than moving with the roll.
  // @req REQ-119
  it("names the presences the map cannot draw, and says the map is why", () => {
    legendFor([
      { country: "NGA", population: 45500000 },
      { country: "USA", population: 1200000 },
    ]);

    const offMap = screen.getByTestId("people-field-off-map");
    expect(offMap.textContent).toContain("USA");
    expect(offMap.textContent).not.toContain("NGA");
    expect(offMap.textContent).toMatch(/hors carte/i);
  });

  // @req REQ-119
  it("says nothing about off-map presences when the map draws them all", () => {
    legendFor([
      { country: "NGA", population: 45500000 },
      { country: "BEN", population: 1800000 },
    ]);

    expect(
      screen.queryByTestId("people-field-off-map")
    ).not.toBeInTheDocument();
  });

  // @req REQ-119
  it("renders nothing rather than an empty frame when the fiche declares no distribution", () => {
    const { container } = render(<PeopleFieldLegend distribution={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
