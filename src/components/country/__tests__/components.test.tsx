import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HistoryTimeline } from "../HistoryTimeline";
import { PeoplesSection } from "../PeoplesSection";
import { LanguagesSection } from "../LanguagesSection";
import { CultureGrid } from "../CultureGrid";
import { SourcesFooter } from "../SourcesFooter";
import { HistoricalFactsSection } from "../HistoricalFactsSection";
import type {
  HeroData,
  TimelineData,
  PeoplesData,
  KingdomsData,
  LanguagesData,
  CultureGridData,
  HistoricalFactsData,
} from "@/lib/countryDataTransformer";
// ==========================================
// HistoryTimeline
// ==========================================

describe("HistoryTimeline", () => {
  it("returns null when items list is empty", () => {
    const data: TimelineData = {
      items: [],
      gradientStops: { goldEnd: 100, colonialEnd: 100 },
    };
    const { container } = render(<HistoryTimeline data={data} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders timeline item names", () => {
    const data: TimelineData = {
      items: [
        { type: "kingdom", era: "XIIe siècle", name: "Empire Mossi" },
        { type: "colonial", era: "1919", name: "Haute-Volta" },
        { type: "sovereign", era: "1984", name: "Burkina Faso" },
      ],
      gradientStops: { goldEnd: 33, colonialEnd: 66 },
    };
    render(<HistoryTimeline data={data} />);
    expect(screen.getByText("Empire Mossi")).toBeTruthy();
    expect(screen.getByText("Haute-Volta")).toBeTruthy();
    expect(screen.getByText(/Burkina Faso/)).toBeTruthy();
  });

  it("marks colonial items with data-type attribute", () => {
    const data: TimelineData = {
      items: [{ type: "colonial", era: "1919", name: "Haute-Volta" }],
      gradientStops: { goldEnd: 0, colonialEnd: 100 },
    };
    const { container } = render(<HistoryTimeline data={data} />);
    const colonialItem = container.querySelector('[data-type="colonial"]');
    expect(colonialItem).toBeTruthy();
  });

  // A colonial name is shown, never struck. The strike read as a rendering
  // fault rather than an editorial verdict — the same name sits unstruck in
  // KingdomsTimeline two blocks above — and it carried no accessible text, so
  // the nuance existed for sighted readers only. The era colour, the dot and
  // the gradient still mark the regime.
  // @req REQ-092
  it("shows a colonial name without striking it through", () => {
    const data: TimelineData = {
      items: [
        { type: "colonial", era: "1830-1962", name: "Algérie française" },
      ],
      gradientStops: { goldEnd: 0, colonialEnd: 100 },
    };

    render(<HistoryTimeline data={data} />);

    const name = screen.getByText("Algérie française");
    expect(name.style.textDecoration).toBe("");
  });

  // An era the fiche writes as prose carries no name to crown, so it is
  // rendered as the paragraph it is, in full.
  // @req REQ-092
  it("renders an untitled era as its full prose", () => {
    const prose =
      "Mosaïque de royaumes et chefferies autonomes : royaumes mossi (Wogodogo, Yatenga, Tenkodogo, Fada N'Gourma), chefferies gourmantché et peuples lobi.";
    const data: TimelineData = {
      items: [{ type: "kingdom", era: "Époque précoloniale", prose }],
      gradientStops: { goldEnd: 100, colonialEnd: 100 },
    };

    render(<HistoryTimeline data={data} />);

    expect(screen.getByText(prose)).toBeTruthy();
  });
});

// ==========================================
// PeoplesSection
// ==========================================

describe("PeoplesSection", () => {
  it("returns null when rows list is empty", () => {
    const data: PeoplesData = {
      totalPopulation: 0,
      totalPopulationFormatted: undefined,
      everyPeopleDeclaresPopulation: false,
      peopleCount: 0,
      rows: [],
    };
    const { container } = render(<PeoplesSection data={data} />);
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
    render(<PeoplesSection data={data} />);
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

    const { container } = render(<PeoplesSection data={data} />);

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
    const { container } = render(<PeoplesSection data={data} />);
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
    render(<PeoplesSection data={data} />);
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
    render(<PeoplesSection data={data} />);

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
    render(<PeoplesSection data={data} />);

    const endonymEl = screen.getByText("Yorùbá");
    expect(endonymEl).not.toHaveAttribute("lang");
  });
});
// ==========================================
// LanguagesSection
// ==========================================

describe("LanguagesSection", () => {
  it("returns null when bubbles list is empty", () => {
    const data: LanguagesData = {
      bubbles: [],
      totalCount: 0,
      overflowCount: 0,
    };
    const { container } = render(<LanguagesSection data={data} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders language bubble names", () => {
    const data: LanguagesData = {
      bubbles: [
        { name: "Français", isOfficial: true, size: "big", code: "fra" },
        { name: "Mooré", isOfficial: false, size: "regular", code: "mos" },
      ],
      totalCount: 2,
      overflowCount: 0,
    };
    render(<LanguagesSection data={data} />);
    // Official language gets a building emoji prepended
    expect(screen.getByText(/Français/)).toBeTruthy();
    expect(screen.getByText("Mooré")).toBeTruthy();
  });

  it("renders official language with building icon prefix", () => {
    const data: LanguagesData = {
      bubbles: [{ name: "Français", isOfficial: true, size: "big" }],
      totalCount: 1,
      overflowCount: 0,
    };
    render(<LanguagesSection data={data} />);
    // The component renders `🏛 Français` for official languages
    const bubble = screen.getByText(/🏛.*Français/);
    expect(bubble).toBeTruthy();
  });

  it("shows overflow count pill when overflowCount > 0", () => {
    const data: LanguagesData = {
      bubbles: [{ name: "Français", isOfficial: true, size: "big" }],
      totalCount: 16,
      overflowCount: 4,
    };
    render(<LanguagesSection data={data} />);
    expect(screen.getByText(/\+ 4 autres langues/)).toBeTruthy();
  });

  it("renders ISO code badge when code is provided", () => {
    const data: LanguagesData = {
      bubbles: [
        { name: "Mooré", isOfficial: false, size: "regular", code: "mos" },
      ],
      totalCount: 1,
      overflowCount: 0,
    };
    render(<LanguagesSection data={data} />);
    expect(screen.getByText("mos")).toBeTruthy();
  });
});

// ==========================================
// CultureGrid
// ==========================================

describe("CultureGrid", () => {
  it("returns null when items list is empty", () => {
    const data: CultureGridData = { items: [] };
    const { container } = render(<CultureGrid data={data} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders 4 grid items with labels and icons", () => {
    const data: CultureGridData = {
      items: [
        {
          slot: "religion",
          icon: "🙏",
          label: "Religions",
          keywords: ["Islam", "Christianisme"],
        },
        {
          slot: "economy",
          icon: "🌾",
          label: "Économie",
          keywords: ["Agriculture", "Élevage"],
        },
        {
          slot: "social",
          icon: "👑",
          label: "Organisation",
          keywords: ["Chefferies", "Clans"],
        },
        {
          slot: "relations",
          icon: "🌍",
          label: "Relations",
          keywords: ["CEDEAO", "UA"],
        },
      ],
    };
    render(<CultureGrid data={data} />);
    expect(screen.getByText("Religions")).toBeTruthy();
    expect(screen.getByText("Économie")).toBeTruthy();
    expect(screen.getByText("Organisation")).toBeTruthy();
    expect(screen.getByText("Relations")).toBeTruthy();
  });

  it("renders keywords joined by comma", () => {
    const data: CultureGridData = {
      items: [
        {
          slot: "religion",
          icon: "🙏",
          label: "Religions",
          keywords: ["Islam", "Christianisme", "Animisme"],
        },
      ],
    };
    render(<CultureGrid data={data} />);
    expect(screen.getByText("Islam, Christianisme, Animisme")).toBeTruthy();
  });

  it("renders icons", () => {
    const data: CultureGridData = {
      items: [
        {
          slot: "economy",
          icon: "🌾",
          label: "Économie",
          keywords: ["Agriculture"],
        },
      ],
    };
    render(<CultureGrid data={data} />);
    expect(screen.getByText("🌾")).toBeTruthy();
  });
});

// ==========================================
// HistoricalFactsSection
// ==========================================

describe("HistoricalFactsSection", () => {
  it("renders all period labels and content", () => {
    const data: HistoricalFactsData = {
      periods: [
        { label: "Colonisation", content: "Colonisation française 1880-1960" },
        {
          label: "Période post-indépendance",
          content: "Indépendance proclamée le 5 août 1960",
        },
      ],
    };
    render(<HistoricalFactsSection data={data} />);
    expect(screen.getByText("Colonisation")).toBeTruthy();
    expect(screen.getByText("Colonisation française 1880-1960")).toBeTruthy();
    expect(screen.getByText("Période post-indépendance")).toBeTruthy();
    expect(
      screen.getByText("Indépendance proclamée le 5 août 1960")
    ).toBeTruthy();
  });

  it("renders nothing when periods list is empty", () => {
    const data: HistoricalFactsData = { periods: [] };
    const { container } = render(<HistoricalFactsSection data={data} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a single period correctly", () => {
    const data: HistoricalFactsData = {
      periods: [
        {
          label: "Périodes anciennes",
          content: "Grandes migrations bantoues",
        },
      ],
    };
    render(<HistoricalFactsSection data={data} />);
    expect(screen.getByText("Périodes anciennes")).toBeTruthy();
    expect(screen.getByText("Grandes migrations bantoues")).toBeTruthy();
  });
});

// ==========================================
// SourcesFooter
// ==========================================

describe("SourcesFooter", () => {
  const entry = (
    label: string,
    standing: "official" | "referenced" | "unverified" | "needs_review"
  ) => ({ label, url: null, standing });

  // @req REQ-092
  it("returns null when there is no source at all", () => {
    const { container } = render(<SourcesFooter sources={[]} />);
    expect(container.firstChild).toBeNull();
  });

  // @req REQ-092
  it("renders every source", () => {
    render(
      <SourcesFooter
        sources={[
          entry("UN 2025", "official"),
          entry("UNFPA 2024", "official"),
          entry("CIA World Factbook", "referenced"),
        ]}
      />
    );
    expect(screen.getByText("UN 2025")).toBeTruthy();
    expect(screen.getByText("CIA World Factbook")).toBeTruthy();
  });

  // @req REQ-092
  it("renders the section header label", () => {
    render(<SourcesFooter sources={[entry("UNESCO", "official")]} />);
    expect(screen.getByText("Sources & Références")).toBeTruthy();
  });

  // @req REQ-092
  it("shows each source's own standing rather than one verdict over the list", () => {
    render(
      <SourcesFooter
        sources={[entry("UN 2025", "official"), entry("Un blog", "unverified")]}
      />
    );
    expect(screen.getByText("Officielle")).toBeTruthy();
    expect(screen.getByText("Non vérifiée")).toBeTruthy();
  });

  // @req REQ-092
  it("says a pending source is awaiting review, never that it is unverified", () => {
    render(<SourcesFooter sources={[entry("À trancher", "needs_review")]} />);

    expect(screen.getByText("En attente d'examen")).toBeTruthy();
    expect(screen.queryByText("Non vérifiée")).toBeNull();
  });

  // @req REQ-092
  it("never prints the retired Tier vocabulary", () => {
    const { container } = render(
      <SourcesFooter sources={[entry("UN 2025", "official")]} />
    );
    expect(container.textContent).not.toContain("Tier 1");
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
      <PeoplesSection data={peoples([30, 20]) as never} />
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
      <PeoplesSection data={peoples([30, 20]) as never} />
    );

    const note = container.querySelector("[data-demo-coverage-note]");
    expect(note).not.toBeNull();
    expect(note!.textContent).toContain("50");
  });

  // @req REQ-092
  it("stays quiet when the splits do account for the whole country", () => {
    const { container } = render(
      <PeoplesSection data={peoples([60, 40]) as never} />
    );

    expect(container.querySelector("[data-demo-coverage-note]")).toBeNull();
  });
});

/**
 * The mockup frames four sections — Étymologie, Peuples, Royaumes,
 * Sources — but its own note says it follows the order of the eight real
 * ones. The four it does not draw are out of frame, not deleted, and this
 * is what stops a later restyle from quietly dropping them.
 */
describe("the country fiche keeps all eight sections", () => {
  // @req REQ-092
  it("still exports the four sections the mockup leaves out of frame", async () => {
    const country = await import("@/components/country");

    expect(country.HistoryTimeline).toBeDefined();
    expect(country.HistoricalFactsSection).toBeDefined();
    expect(country.LanguagesSection).toBeDefined();
    expect(country.CultureGrid).toBeDefined();
  });
});
