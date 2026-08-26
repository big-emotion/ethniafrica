import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PeopleFieldLegend } from "@/components/people/PeopleFieldLegend";
import type { CountryDistribution } from "@/types/afrik";

const legendFor = (distribution: CountryDistribution[]) =>
  render(<PeopleFieldLegend distribution={distribution} />);

describe("PeopleFieldLegend (REQ-116/REQ-119)", () => {
  // The legend is where the halo stops being decoration: it states that the
  // gradient fades to nothing, which is the claim the encoding rests on.
  // @req REQ-116
  it("states that the field has no edge before listing anything", () => {
    legendFor([{ country: "NGA", population: 45500000 }]);

    expect(screen.getByText(/bord nul/i)).toBeInTheDocument();
  });

  // @req REQ-116
  it("names each drawn country with its declared population, largest first", () => {
    legendFor([
      { country: "BEN", population: 1800000 },
      { country: "NGA", population: 45500000 },
    ]);

    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText(/Nigeria/)).toBeInTheDocument();
    expect(rows[0].textContent?.replace(/\s| | /g, "")).toContain("45500000");
    expect(within(rows[1]).getByText(/Bénin/)).toBeInTheDocument();
  });

  // 38 declared presences across 24 fiches sit outside the atlas's Africa
  // scope. Leaving them out would make the fiche's own country count disagree
  // with what the reader can see, which is how a gap turns into an error.
  // @req REQ-119
  it("lists a presence the map cannot draw, and says so", () => {
    legendFor([
      { country: "NGA", population: 45500000 },
      { country: "USA", population: 1200000 },
    ]);

    const offMap = screen
      .getAllByRole("listitem")
      .find((row) => row.textContent?.includes("USA"));
    expect(offMap).toBeDefined();
    expect(offMap?.textContent).toMatch(/hors carte/i);
  });

  // An off-map country has no French name in the admin-0 asset, so the ISO
  // code is all there is to show — and showing it beats showing nothing.
  // @req REQ-119
  it("puts every drawable country ahead of the ones it cannot place", () => {
    legendFor([
      { country: "USA", population: 90000000 },
      { country: "BEN", population: 1800000 },
    ]);

    const rows = screen.getAllByRole("listitem");
    expect(rows[0].textContent).toContain("Bénin");
    expect(rows[1].textContent).toContain("USA");
  });

  // @req REQ-119
  it("renders nothing rather than an empty frame when the fiche declares no distribution", () => {
    const { container } = render(<PeopleFieldLegend distribution={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
