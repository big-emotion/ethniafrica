import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PeoplesSection } from "../PeoplesSection";
import type {
  HeroData,
  PeoplesData,
  KingdomsData,
} from "@/lib/countryDataTransformer";
// ==========================================
// PeoplesSection
// ==========================================

describe("PeoplesSection", () => {
  // @req REQ-145
  it("renders demographic chrome in English", () => {
    const data: PeoplesData = {
      totalPopulation: 100,
      totalPopulationFormatted: "100",
      everyPeopleDeclaresPopulation: true,
      peopleCount: 2,
      rows: [
        {
          name: "A",
          percentage: 40,
          population: 40,
          populationFormatted: "40",
          colorIndex: 1,
        },
        {
          name: "B",
          percentage: 40,
          population: 40,
          populationFormatted: "40",
          colorIndex: 2,
        },
      ],
    };
    render(<PeoplesSection language="en" data={data} />);

    expect(screen.getByText("inhabitants")).toBeVisible();
    expect(screen.getByText("2 peoples")).toBeVisible();
    expect(
      screen.getByText(/represent 80% of the country's population/)
    ).toBeVisible();
  });

  it("returns null when rows list is empty", () => {
    const data: PeoplesData = {
      totalPopulation: 0,
      totalPopulationFormatted: undefined,
      everyPeopleDeclaresPopulation: false,
      peopleCount: 0,
      rows: [],
    };
    const { container } = render(<PeoplesSection language="fr" data={data} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders people row names and percentages", () => {
    const data: PeoplesData = {
      totalPopulation: 22000000,
      totalPopulationFormatted: "22M",
      everyPeopleDeclaresPopulation: true,
      peopleCount: 3,
      rows: [
        {
          name: "Mossi",
          percentage: 52,
          population: 11440000,
          populationFormatted: "11.4M",
          colorIndex: 1,
        },
        {
          name: "Fulani",
          percentage: 8,
          population: 1760000,
          populationFormatted: "1.8M",
          colorIndex: 2,
        },
      ],
    };
    render(<PeoplesSection language="fr" data={data} />);
    expect(screen.getByText("Mossi")).toBeTruthy();
    expect(screen.getByText("52%")).toBeTruthy();
    expect(screen.getByText("Fulani")).toBeTruthy();
    expect(screen.getByText("8%")).toBeTruthy();
  });

  // The exonym imposed on a people is named, not struck. Same reason as the
  // colonial name in HistoryTimeline: the strike was an unlabelled decoration
  // no screen reader conveyed. The warning tint carries the judgement.
  // @req REQ-092
  it("names a pejorative exonym without striking it through", () => {
    const data: PeoplesData = {
      totalPopulation: 1760000,
      totalPopulationFormatted: "1.8M",
      everyPeopleDeclaresPopulation: true,
      peopleCount: 1,
      rows: [
        {
          name: "Peul",
          percentage: 8,
          population: 1760000,
          populationFormatted: "1.8M",
          colorIndex: 2,
          pejorativeTerm: "Fellata",
        },
      ],
    };

    const { container } = render(<PeoplesSection language="fr" data={data} />);

    const exonym = screen.getByText("Fellata");
    expect(exonym.className).not.toMatch(/line-through/);
    expect(container.querySelector(".line-through")).toBeNull();
  });

  it("shows demographic bar segments for each row", () => {
    const data: PeoplesData = {
      totalPopulation: 22000000,
      totalPopulationFormatted: "22M",
      everyPeopleDeclaresPopulation: true,
      peopleCount: 2,
      rows: [
        {
          name: "Mossi",
          percentage: 52,
          population: 11440000,
          populationFormatted: "11.4M",
          colorIndex: 1,
        },
        {
          name: "Fulani",
          percentage: 8,
          population: 1760000,
          populationFormatted: "1.8M",
          colorIndex: 2,
        },
      ],
    };
    const { container } = render(<PeoplesSection language="fr" data={data} />);
    // The DemoBar renders one div per row with a title attribute
    const barSegments = container.querySelectorAll("[title]");
    expect(barSegments.length).toBe(2);
  });

  it("renders total population formatted", () => {
    const data: PeoplesData = {
      totalPopulation: 22000000,
      totalPopulationFormatted: "22M",
      everyPeopleDeclaresPopulation: true,
      peopleCount: 1,
      rows: [
        {
          name: "Mossi",
          percentage: 52,
          population: 11440000,
          populationFormatted: "11.4M",
          colorIndex: 1,
        },
      ],
    };
    render(<PeoplesSection language="fr" data={data} />);
    expect(screen.getByText("22M")).toBeTruthy();
  });

  // ETNI-382: endonym primacy (UX-DR49 rule 1) — the endonym must lead the
  // exonym visually and carry a lang attribute for correct pronunciation.
  // @req REQ-115
  it("gives the endonym typographic precedence over the exonym and a lang attribute", () => {
    const data: PeoplesData = {
      totalPopulation: 22000000,
      totalPopulationFormatted: "22M",
      everyPeopleDeclaresPopulation: true,
      peopleCount: 1,
      rows: [
        {
          name: "Yoruba",
          endonym: "Yorùbá",
          endonymLang: "yor",
          percentage: 21,
          population: 4620000,
          populationFormatted: "4.6M",
          colorIndex: 1,
        },
      ],
    };
    render(<PeoplesSection language="fr" data={data} />);

    const endonymEl = screen.getByText("Yorùbá");
    const exonymEl = screen.getByText("Yoruba");

    // Presence
    expect(endonymEl).toBeTruthy();
    expect(exonymEl).toBeTruthy();

    // Lang attribute for correct screen-reader pronunciation, in the shortest
    // form BCP 47 allows — the corpus stores the ISO 639-3 `yor`.
    expect(endonymEl).toHaveAttribute("lang", "yo");

    // Typographic precedence: bold and not smaller than the exonym, and not
    // italicised as a secondary annotation
    expect(endonymEl.className).toMatch(/font-bold/);
    expect(endonymEl.className).not.toMatch(/italic/);
    expect(exonymEl.className).not.toMatch(/font-bold/);
  });

  it("omits the lang attribute when no language code is available", () => {
    const data: PeoplesData = {
      totalPopulation: 22000000,
      totalPopulationFormatted: "22M",
      everyPeopleDeclaresPopulation: true,
      peopleCount: 1,
      rows: [
        {
          name: "Yoruba",
          endonym: "Yorùbá",
          percentage: 21,
          population: 4620000,
          populationFormatted: "4.6M",
          colorIndex: 1,
        },
      ],
    };
    render(<PeoplesSection language="fr" data={data} />);

    const endonymEl = screen.getByText("Yorùbá");
    expect(endonymEl).not.toHaveAttribute("lang");
  });
});
describe("PeoplesSection — what the bar admits (FR28)", () => {
  const peoples = (percentages: number[]) => ({
    totalPopulation: "220 M",
    peoplesCount: percentages.length,
    rows: percentages.map((percentage, index) => ({
      name: `Peuple ${index}`,
      percentage,
      population: "1 M",
      colorIndex: index,
    })),
  });

  // @req REQ-092
  it("sizes each segment as a share of the country, not of the rendered rows", () => {
    const { container } = render(
      <PeoplesSection language="fr" data={peoples([30, 20]) as never} />
    );

    const segments = Array.from(
      container.querySelectorAll("[data-demo-bar] > div")
    ) as HTMLElement[];

    // Stretched to fill, these would read 60% and 40%. They must read what
    // they actually are.
    expect(segments[0].style.width).toBe("30%");
    expect(segments[1].style.width).toBe("20%");
  });

  // @req REQ-092
  it("says how much of the country is accounted for when the splits fall short", () => {
    const { container } = render(
      <PeoplesSection language="fr" data={peoples([30, 20]) as never} />
    );

    const note = container.querySelector("[data-demo-coverage-note]");
    expect(note).not.toBeNull();
    expect(note!.textContent).toContain("50");
  });

  // @req REQ-092
  it("stays quiet when the splits do account for the whole country", () => {
    const { container } = render(
      <PeoplesSection language="fr" data={peoples([60, 40]) as never} />
    );

    expect(container.querySelector("[data-demo-coverage-note]")).toBeNull();
  });
});
