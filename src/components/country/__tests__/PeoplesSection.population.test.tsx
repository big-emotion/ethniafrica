import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PeoplesSection } from "../PeoplesSection";
import type { PeoplesData } from "@/lib/countryDataTransformer";

/**
 * ZAF and 24 other country fiches state a share for each people and a
 * population for none. The section summed those absences to zero and printed
 * "0 habitants · 2025" over a bar whose shares were perfectly valid — the
 * atlas asserting South Africa is uninhabited. Charter §4: the interface says
 * declared, derived or missing, and "missing" is never rendered as a value.
 */
describe("PeoplesSection — a population the fiche does not declare", () => {
  const undeclared: PeoplesData = {
    totalPopulation: 0,
    totalPopulationFormatted: undefined,
    everyPeopleDeclaresPopulation: false,
    peopleCount: 2,
    rows: [
      { name: "Africains noirs", percentage: 81.4, colorIndex: 1 },
      { name: "Blancs", percentage: 7.3, colorIndex: 2 },
    ],
  };

  // @req REQ-092
  it("never prints a zero where the corpus states no population", () => {
    const { container } = render(<PeoplesSection data={undeclared} />);
    expect(container.textContent).not.toMatch(/\b0\b(?!\s*%)/);
  });

  // @req REQ-092
  it("names the gap instead of the figure", () => {
    render(<PeoplesSection data={undeclared} />);
    expect(screen.getByText("Donnée manquante")).toBeTruthy();
  });

  // The shares are declared even where the headcounts are not, so the bar and
  // the percentages must survive the missing total.
  // @req REQ-092
  it("keeps the shares the fiche does declare", () => {
    render(<PeoplesSection data={undeclared} />);
    expect(screen.getByText("81.4%")).toBeTruthy();
    expect(screen.getByText("Africains noirs")).toBeTruthy();
  });

  // @req REQ-092
  it("qualifies a total summed over only part of the peoples", () => {
    const partial: PeoplesData = {
      totalPopulation: 7700000,
      totalPopulationFormatted: "7.7M",
      everyPeopleDeclaresPopulation: false,
      peopleCount: 2,
      rows: [
        { name: "Kikuyu", percentage: 17.1, colorIndex: 1 },
        {
          name: "Luhya",
          percentage: 14.3,
          population: 7700000,
          populationFormatted: "7.7M",
          colorIndex: 2,
        },
      ],
    };

    render(<PeoplesSection data={partial} />);
    expect(screen.getByText(/habitants documentés/)).toBeTruthy();
  });

  // @req REQ-092
  it("says plain habitants when every people is counted", () => {
    const complete: PeoplesData = {
      totalPopulation: 12700000,
      totalPopulationFormatted: "12.7M",
      everyPeopleDeclaresPopulation: true,
      peopleCount: 2,
      rows: [
        {
          name: "Mossi",
          percentage: 52,
          population: 11000000,
          populationFormatted: "11M",
          colorIndex: 1,
        },
        {
          name: "Peul",
          percentage: 8,
          population: 1700000,
          populationFormatted: "1.7M",
          colorIndex: 2,
        },
      ],
    };

    render(<PeoplesSection data={complete} />);
    expect(screen.getByText(/^habitants · 2025$/)).toBeTruthy();
  });
});
