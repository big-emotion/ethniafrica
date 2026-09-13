import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PeopleCountriesSection } from "../PeopleCountriesSection";
import { FicheTileChapter } from "@/components/fiche/FicheTileChapter";
import { peopleLanguageTiles } from "@/lib/fiche/languages";
import { PeopleRelatedPeoplesSection } from "../PeopleRelatedPeoplesSection";
import type {
  PeopleCountriesData,
  PeopleLanguageData,
  PeopleRelatedData,
} from "@/lib/peopleDataTransformer";
import { getCountryRoute, getFamilyRoute } from "@/lib/routing";
import { resolveAssociatedPeoples } from "@/lib/people/associatedPeopleLinks";

/** The corpus entries of a fiche, none of which names a people the index holds. */
const unmatchedGroups = (related: PeopleRelatedData) =>
  resolveAssociatedPeoples(related.ethnicities, []);

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
    render(<PeopleCountriesSection language="fr" data={data} />);
    const ngaLink = screen.getByRole("link", { name: /NGA/i });
    expect(ngaLink).toBeTruthy();
    expect(ngaLink.getAttribute("href")).toBe(getCountryRoute("fr", "NGA"));
  });

  it("renders links for all distribution countries", () => {
    render(<PeopleCountriesSection language="fr" data={data} />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain(getCountryRoute("fr", "NGA"));
    expect(hrefs).toContain(getCountryRoute("fr", "BEN"));
  });

  it("returns null when distributions is empty (no links rendered)", () => {
    const empty: PeopleCountriesData = {
      totalPopulation: 0,
      totalPopulationFormatted: "0",
      distributions: [],
    };
    const { container } = render(
      <PeopleCountriesSection language="fr" data={empty} />
    );
    expect(container.firstChild).toBeNull();
  });
});

// ==========================================
// Language tiles — family fiche link
// ==========================================

describe("language tiles — family fiche link", () => {
  // @req REQ-091
  it("links to the family fiche by the family's name", () => {
    const data: PeopleLanguageData = {
      mainLanguage: "Yoruba",
      isoCodes: ["yor"],
      dialects: [],
      languageFamilyId: "FLG_NIGER_CONGO",
    };
    render(
      <FicheTileChapter
        tiles={peopleLanguageTiles(data, "Niger-Congo", "fr")}
        language="fr"
      />
    );
    const link = screen.getByRole("link", { name: /Niger-Congo/i });
    expect(link.getAttribute("href")).toBe(
      getFamilyRoute("fr", "FLG_NIGER_CONGO")
    );
  });

  // @req REQ-091
  it("offers no family link when the record names no family", () => {
    const data: PeopleLanguageData = {
      mainLanguage: "Yoruba",
      isoCodes: ["yor"],
      dialects: [],
    };
    render(
      <FicheTileChapter
        tiles={peopleLanguageTiles(data, undefined, "fr")}
        language="fr"
      />
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  // A family key is not a word a reader is owed. Without a name the family
  // stays unlinked rather than printing "FLG_NIGER_CONGO".
  // @req REQ-091
  it("never shows the family key as the link text", () => {
    const data: PeopleLanguageData = {
      mainLanguage: "Yoruba",
      isoCodes: [],
      dialects: [],
      languageFamilyId: "FLG_NIGER_CONGO",
    };
    const { container } = render(
      <FicheTileChapter
        tiles={peopleLanguageTiles(data, undefined, "fr")}
        language="fr"
      />
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(container.textContent).not.toMatch(/FLG_/);
  });
});

// ==========================================
// PeopleRelatedPeoplesSection — card style
// ==========================================

describe("PeopleRelatedPeoplesSection — AutonymExonymHeading card style", () => {
  it("returns null when all fields empty", () => {
    const empty: PeopleRelatedData = { ethnicities: [] };
    const { container } = render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={empty}
        associatedGroups={unmatchedGroups(empty)}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders each ethnicity as a card element", () => {
    const data: PeopleRelatedData = {
      ethnicities: ["Ìjẹ̀bú", "Ẹ̀gbá"],
    };
    render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={data}
        associatedGroups={unmatchedGroups(data)}
      />
    );
    expect(screen.getByText("Ìjẹ̀bú")).toBeTruthy();
    expect(screen.getByText("Ẹ̀gbá")).toBeTruthy();
  });

  it("renders ethnicities inside card elements (data-ethnicity-card attribute)", () => {
    const data: PeopleRelatedData = {
      ethnicities: ["Ìjẹ̀bú"],
    };
    const { container } = render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={data}
        associatedGroups={unmatchedGroups(data)}
      />
    );
    const cards = container.querySelectorAll("[data-ethnicity-card]");
    expect(cards.length).toBe(1);
  });

  it("still renders politicalSystem and clanOrganization when present", () => {
    const data: PeopleRelatedData = {
      ethnicities: [],
      politicalSystem: "Monarchie sous Oba",
      clanOrganization: "Clans patrilinéaires",
    };
    render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={data}
        associatedGroups={unmatchedGroups(data)}
      />
    );
    expect(screen.getByText("Monarchie sous Oba")).toBeTruthy();
    expect(screen.getByText("Clans patrilinéaires")).toBeTruthy();
  });
});
