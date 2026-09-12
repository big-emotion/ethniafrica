import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PeopleRelatedPeoplesSection } from "../PeopleRelatedPeoplesSection";
import { PeopleCountriesSection } from "../PeopleCountriesSection";
import type {
  PeopleRelatedData,
  PeopleCountriesData,
} from "@/lib/peopleDataTransformer";
import { resolveAssociatedPeoples } from "@/lib/people/associatedPeopleLinks";

/** The corpus entries of a fiche, none of which names a people the index holds. */
const unmatchedGroups = (related: PeopleRelatedData) =>
  resolveAssociatedPeoples(related.ethnicities, []);

// ==========================================
// PeopleFicheHead replaced PeopleHero: the mockup's fiche head is an
// overline, a title, a lede and two chips on parchment, where the old hero
// was a teal gradient card — teal is the country accent, and a people fiche
// is ocre (atlas-charter §2). Its own tests live in PeopleFicheHead.test.tsx.
// ==========================================

// ==========================================
// PeopleRelatedPeoplesSection
// ==========================================

describe("PeopleRelatedPeoplesSection", () => {
  it("returns null when all fields empty", () => {
    const empty: PeopleRelatedData = {
      ethnicities: [],
    };
    const { container } = render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={empty}
        associatedGroups={unmatchedGroups(empty)}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders ethnicities list when non-empty", () => {
    const data: PeopleRelatedData = {
      ethnicities: ["Ìjẹ̀bú", "Ẹ̀gbá", "Ọ̀yọ́"],
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
    expect(screen.getByText("Ọ̀yọ́")).toBeTruthy();
  });

  it("renders politicalSystem when present", () => {
    const data: PeopleRelatedData = {
      ethnicities: [],
      politicalSystem: "Monarchie constitutionnelle sous un Oba",
    };
    render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={data}
        associatedGroups={unmatchedGroups(data)}
      />
    );
    expect(
      screen.getByText("Monarchie constitutionnelle sous un Oba")
    ).toBeTruthy();
  });

  it("renders clanOrganization when present", () => {
    const data: PeopleRelatedData = {
      ethnicities: [],
      clanOrganization: "Clans patrilinéaires (idile)",
    };
    render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={data}
        associatedGroups={unmatchedGroups(data)}
      />
    );
    expect(screen.getByText("Clans patrilinéaires (idile)")).toBeTruthy();
  });

  it("renders ageClassSystems when present", () => {
    const data: PeopleRelatedData = {
      ethnicities: [],
      ageClassSystems: "Système des grades d'âge (ẹgbẹ)",
    };
    render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={data}
        associatedGroups={unmatchedGroups(data)}
      />
    );
    expect(screen.getByText("Système des grades d'âge (ẹgbẹ)")).toBeTruthy();
  });
});

// ==========================================
// PeopleCountriesSection
// ==========================================

describe("PeopleCountriesSection", () => {
  it("returns null when distributions empty", () => {
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

  // The section opened on the same figure the fiche head states above the
  // globe — "45M personnes · réf. 2025" there, "45M habitants · 2025" here,
  // set in the display face so it read as a second headline for the same
  // fact. The head is where a fiche states its scale; the rows below carry
  // their own populations.
  // @req REQ-115
  it("leaves the headline population to the fiche head", () => {
    const data: PeopleCountriesData = {
      totalPopulation: 45000000,
      totalPopulationFormatted: "45M",
      referenceYear: 2025,
      distributions: [
        {
          country: "NGA",
          population: 40000000,
          populationFormatted: "40M",
          percentage: 89,
        },
      ],
    };
    render(<PeopleCountriesSection language="fr" data={data} />);
    expect(screen.queryByText("45M")).toBeNull();
    expect(screen.queryByText(/habitants/)).toBeNull();
  });

  it("renders country distribution rows", () => {
    const data: PeopleCountriesData = {
      totalPopulation: 45000000,
      totalPopulationFormatted: "45M",
      distributions: [
        {
          country: "NGA",
          population: 40000000,
          populationFormatted: "40M",
          percentage: 89,
        },
        {
          country: "BEN",
          population: 3000000,
          populationFormatted: "3M",
          percentage: 7,
        },
      ],
    };
    render(<PeopleCountriesSection language="fr" data={data} />);
    expect(screen.getByText("NGA")).toBeTruthy();
    expect(screen.getByText("BEN")).toBeTruthy();
    expect(screen.getByText("89 %")).toBeTruthy();
    expect(screen.getByText("7 %")).toBeTruthy();
  });

  // The roll moved here from the field legend beside the globe, and it must
  // arrive with what the legend was carrying: the country's French name, and
  // the mark on a presence the atlas's Africa scope cannot draw. A row that
  // printed only "USA" would state the presence and hide that the map omits
  // it, which is how the fiche's own country count comes to disagree with
  // what the reader sees.
  // @req REQ-115
  it("names each country, and marks the ones the map cannot draw", () => {
    const data: PeopleCountriesData = {
      totalPopulation: 45000000,
      totalPopulationFormatted: "45M",
      distributions: [
        { country: "NGA", percentage: 89 },
        { country: "USA", percentage: 3 },
      ],
    };
    const { container } = render(
      <PeopleCountriesSection language="fr" data={data} />
    );

    expect(screen.getByText("Nigeria")).toBeTruthy();

    const offMap = container.querySelector('[data-off-map="true"]');
    expect(offMap?.textContent).toContain("USA");
    expect(offMap?.textContent).toMatch(/hors carte/i);
    expect(container.querySelectorAll('[data-off-map="true"]')).toHaveLength(1);
  });

  // @req REQ-115
  it("renders referenceYear on the footer line", () => {
    const data: PeopleCountriesData = {
      totalPopulation: 45000000,
      totalPopulationFormatted: "45M",
      referenceYear: 2025,
      distributions: [{ country: "NGA", percentage: 89 }],
    };
    render(<PeopleCountriesSection language="fr" data={data} />);
    expect(screen.getByText(/2025/)).toBeTruthy();
  });

  // `demography.source` is a research note, not a citation — on the Abahutu
  // record it runs several lines and names Wikipedia twice. The reader is
  // owed the atlas's own provenance, never the workshop's working note.
  // @req REQ-155
  it("never prints the demography research note, even when one is recorded", () => {
    const data: PeopleCountriesData = {
      totalPopulation: 45000000,
      totalPopulationFormatted: "45M",
      referenceYear: 2025,
      source:
        "Voir Wikipédia (fr) et Wikipédia (en) pour le recoupement des chiffres.",
      distributions: [{ country: "NGA", percentage: 89 }],
    };
    render(<PeopleCountriesSection language="fr" data={data} />);
    expect(screen.queryByText(/Wikip/)).toBeNull();
    expect(screen.getByText(/2025/)).toBeTruthy();
  });

  // The sentence used to print once per row, identically, regardless of
  // whether the rows agreed on where their share came from.
  // @req REQ-155
  it("states the provenance once for the chapter when every row's share is derived", () => {
    const data: PeopleCountriesData = {
      totalPopulation: 18065000,
      totalPopulationFormatted: "18M",
      distributions: [
        {
          country: "BDI",
          population: 12200000,
          share: { value: 67.5, provenance: "derived", from: ["x"] },
        },
        {
          country: "RWA",
          population: 5865000,
          share: { value: 32.5, provenance: "derived", from: ["x"] },
        },
      ],
    };
    render(<PeopleCountriesSection language="fr" data={data} />);
    expect(screen.getAllByText(/Dérivé/)).toHaveLength(1);
  });

  // @req REQ-155
  it("keeps a marker on every derived row when the rows' provenance differs", () => {
    const data: PeopleCountriesData = {
      totalPopulation: 20065000,
      totalPopulationFormatted: "20M",
      distributions: [
        {
          country: "BDI",
          population: 12200000,
          share: { value: 61, provenance: "derived", from: ["x"] },
        },
        {
          country: "RWA",
          population: 5865000,
          share: { value: 29.3, provenance: "derived", from: ["x"] },
        },
        {
          country: "COD",
          population: 2000000,
          share: { value: 32, provenance: "declared" },
        },
      ],
    };
    render(<PeopleCountriesSection language="fr" data={data} />);
    expect(screen.getAllByText(/Dérivé/)).toHaveLength(2);
  });

  // Five countries must fit a 430px screen, not a screen and a half: the
  // identifier, the name with its population and note, and the share sit in
  // three cells, with the progress track spanning beneath as a fourth.
  // @req REQ-155
  it("renders a compact three-column row with the track spanning beneath", () => {
    const data: PeopleCountriesData = {
      totalPopulation: 45000000,
      totalPopulationFormatted: "45M",
      distributions: [
        {
          country: "NGA",
          population: 40000000,
          populationFormatted: "40M",
          percentage: 89,
          note: "Sud-ouest : Lagos, Ibadan.",
        },
      ],
    };
    const { container } = render(
      <PeopleCountriesSection language="fr" data={data} />
    );
    const row = container.querySelector('[data-country-row="NGA"]');
    expect(row).toBeTruthy();
    expect(row!.children).toHaveLength(4);

    const nameCell = row!.children[1];
    expect(nameCell.textContent).toContain("Nigeria");
    expect(nameCell.textContent).toContain("40M");
    expect(nameCell.textContent).toContain("Sud-ouest");

    const shareCell = row!.children[2];
    expect(shareCell.textContent).toContain("89");

    const track = row!.children[3];
    expect(track.className).toMatch(/col-span-3/);
  });
});

// ==========================================
// The sources footer is shared across the three fiches and tested at
// src/components/country/__tests__/components.test.tsx — one footer and one
// suite, rather than a people-shaped copy of each.
// ==========================================

// ==========================================
// Inline chip integration (ETNI-36, Story 2.4)
// ==========================================
