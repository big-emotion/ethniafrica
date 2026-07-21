import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PeoplesSection } from "../PeoplesSection";
import type { PeoplesData } from "@/lib/countryDataTransformer";

describe("PeoplesSection — navigation links to people fiches", () => {
  const baseData: PeoplesData = {
    totalPopulation: 50000000,
    totalPopulationFormatted: "50M",
    peopleCount: 2,
    rows: [
      {
        name: "Yoruba",
        endonym: "Ọmọ Oòduà",
        percentage: 21,
        population: 10500000,
        populationFormatted: "10.5M",
        colorIndex: 1,
        peopleId: "PPL_YORUBA",
      },
      {
        name: "Igbo",
        percentage: 18,
        population: 9000000,
        populationFormatted: "9M",
        colorIndex: 2,
        peopleId: "PPL_IGBO",
      },
    ],
  };

  it("renders a link to the people fiche when peopleId is present", () => {
    render(<PeoplesSection data={baseData} />);
    const link = screen.getByRole("link", { name: /Yoruba/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/fr/peuples/PPL_YORUBA");
  });

  it("renders links for all rows that have peopleId", () => {
    render(<PeoplesSection data={baseData} />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/fr/peuples/PPL_YORUBA");
    expect(hrefs).toContain("/fr/peuples/PPL_IGBO");
  });

  it("does not render a link for rows without peopleId", () => {
    const dataWithoutId: PeoplesData = {
      ...baseData,
      rows: [
        {
          name: "Autres",
          percentage: 5,
          population: 2500000,
          populationFormatted: "2.5M",
          colorIndex: 0,
          isOther: true,
        },
      ],
    };
    render(<PeoplesSection data={dataWithoutId} />);
    const links = screen.queryAllByRole("link");
    expect(links).toHaveLength(0);
  });

  it("returns null when rows is empty", () => {
    const empty: PeoplesData = {
      totalPopulation: 0,
      totalPopulationFormatted: "0",
      peopleCount: 0,
      rows: [],
    };
    const { container } = render(<PeoplesSection data={empty} />);
    expect(container.firstChild).toBeNull();
  });
});
