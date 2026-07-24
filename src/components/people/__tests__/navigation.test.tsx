import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PeopleCountriesSection } from "../PeopleCountriesSection";
import { PeopleLanguageSection } from "../PeopleLanguageSection";
import { PeopleRelatedPeoplesSection } from "../PeopleRelatedPeoplesSection";
import type {
  PeopleCountriesData,
  PeopleLanguageData,
  PeopleRelatedData,
} from "@/lib/peopleDataTransformer";

// ==========================================
// PeopleCountriesSection — navigation links
// ==========================================

describe("PeopleCountriesSection — navigation links", () => {
  const data: PeopleCountriesData = {
    totalPopulation: 45000000,
    totalPopulationFormatted: "45M",
    distributions: [
      { country: "NGA", percentage: 89, populationFormatted: "40M" },
      { country: "BEN", percentage: 7, populationFormatted: "3M" },
    ],
  };

  it("renders a link to the country fiche for each distribution row", () => {
    render(<PeopleCountriesSection data={data} />);
    const ngaLink = screen.getByRole("link", { name: /NGA/i });
    expect(ngaLink).toBeTruthy();
    expect(ngaLink.getAttribute("href")).toBe("/fr/pays/NGA");
  });

  it("renders links for all distribution countries", () => {
    render(<PeopleCountriesSection data={data} />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/fr/pays/NGA");
    expect(hrefs).toContain("/fr/pays/BEN");
  });

  it("returns null when distributions is empty (no links rendered)", () => {
    const empty: PeopleCountriesData = {
      totalPopulation: 0,
      totalPopulationFormatted: "0",
      distributions: [],
    };
    const { container } = render(<PeopleCountriesSection data={empty} />);
    expect(container.firstChild).toBeNull();
  });
});

// ==========================================
// PeopleLanguageSection — family fiche link
// ==========================================

describe("PeopleLanguageSection — family fiche link", () => {
  it("renders a link to the family fiche when languageFamilyId is provided", () => {
    const data: PeopleLanguageData = {
      mainLanguage: "Yoruba",
      isoCodes: ["yor"],
      dialects: [],
      languageFamilyId: "FLG_NIGER_CONGO",
      languageFamilyName: "Niger-Congo",
    };
    render(<PeopleLanguageSection data={data} />);
    const link = screen.getByRole("link", { name: /Niger-Congo/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/fr/familles/FLG_NIGER_CONGO");
  });

  it("does not render a family link when languageFamilyId is absent", () => {
    const data: PeopleLanguageData = {
      mainLanguage: "Yoruba",
      isoCodes: ["yor"],
      dialects: [],
    };
    render(<PeopleLanguageSection data={data} />);
    const links = screen.queryAllByRole("link");
    expect(links).toHaveLength(0);
  });

  it("falls back to languageFamilyId as link text when languageFamilyName is absent", () => {
    const data: PeopleLanguageData = {
      mainLanguage: "Yoruba",
      isoCodes: [],
      dialects: [],
      languageFamilyId: "FLG_NIGER_CONGO",
    };
    render(<PeopleLanguageSection data={data} />);
    const link = screen.getByRole("link", { name: /FLG_NIGER_CONGO/i });
    expect(link).toBeTruthy();
  });
});

// ==========================================
// PeopleRelatedPeoplesSection — card style
// ==========================================

describe("PeopleRelatedPeoplesSection — AutonymExonymHeading card style", () => {
  it("returns null when all fields empty", () => {
    const empty: PeopleRelatedData = { ethnicities: [] };
    const { container } = render(<PeopleRelatedPeoplesSection data={empty} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders each ethnicity as a card element", () => {
    const data: PeopleRelatedData = {
      ethnicities: ["Ìjẹ̀bú", "Ẹ̀gbá"],
    };
    render(<PeopleRelatedPeoplesSection data={data} />);
    expect(screen.getByText("Ìjẹ̀bú")).toBeTruthy();
    expect(screen.getByText("Ẹ̀gbá")).toBeTruthy();
  });

  it("renders ethnicities inside card elements (data-ethnicity-card attribute)", () => {
    const data: PeopleRelatedData = {
      ethnicities: ["Ìjẹ̀bú"],
    };
    const { container } = render(<PeopleRelatedPeoplesSection data={data} />);
    const cards = container.querySelectorAll("[data-ethnicity-card]");
    expect(cards.length).toBe(1);
  });

  it("still renders politicalSystem and clanOrganization when present", () => {
    const data: PeopleRelatedData = {
      ethnicities: [],
      politicalSystem: "Monarchie sous Oba",
      clanOrganization: "Clans patrilinéaires",
    };
    render(<PeopleRelatedPeoplesSection data={data} />);
    expect(screen.getByText("Monarchie sous Oba")).toBeTruthy();
    expect(screen.getByText("Clans patrilinéaires")).toBeTruthy();
  });
});
