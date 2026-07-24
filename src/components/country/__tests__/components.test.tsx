import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CountryHero } from "../CountryHero";
import { EtymologyBlock } from "../EtymologyBlock";
import { OriginBanner } from "../OriginBanner";
import { HistoryTimeline } from "../HistoryTimeline";
import { PeoplesSection } from "../PeoplesSection";
import { KingdomsSection } from "../KingdomsSection";
import { LanguagesSection } from "../LanguagesSection";
import { CultureGrid } from "../CultureGrid";
import { SourcesFooter } from "../SourcesFooter";
import { HistoricalFactsSection } from "../HistoricalFactsSection";
import type {
  HeroData,
  EtymologyData,
  OriginData,
  TimelineData,
  PeoplesData,
  KingdomsData,
  LanguagesData,
  CultureGridData,
  HistoricalFactsData,
} from "@/lib/countryDataTransformer";

// ==========================================
// CountryHero
// ==========================================

describe("CountryHero", () => {
  const baseHero: HeroData = {
    countryName: "Burkina Faso",
    nameOfficial: "Burkina Faso",
    iso: "BFA",
    flag: "🇧🇫",
    year: "1984",
    meaningQuote: "patrie des hommes intègres",
    meaningLangs: "mooré · dioula",
    isUncertain: false,
  };

  it("renders country name", () => {
    render(<CountryHero data={baseHero} />);
    expect(screen.getByText("Burkina Faso")).toBeTruthy();
  });

  it("renders flag emoji", () => {
    render(<CountryHero data={baseHero} />);
    expect(screen.getByText("🇧🇫")).toBeTruthy();
  });

  it("renders ISO badge", () => {
    render(<CountryHero data={baseHero} />);
    expect(screen.getByText("BFA")).toBeTruthy();
  });

  // The quote is rendered inside the guillemets alongside the highlight span,
  // so it is never a text node of its own — getByText, which matches against a
  // single element's whole text, cannot see it. Assert on the rendered text as
  // a reader perceives it instead.
  it("renders meaning quote when present", () => {
    const { container } = render(<CountryHero data={baseHero} />);
    expect(container.textContent).toContain("patrie des hommes intègres");
  });

  it("does not render meaning block when meaningQuote is absent", () => {
    const heroNoMeaning: HeroData = { ...baseHero, meaningQuote: undefined };
    const { container } = render(<CountryHero data={heroNoMeaning} />);
    expect(container.textContent).not.toContain("patrie des hommes intègres");
  });
});

// ==========================================
// EtymologyBlock
// ==========================================

describe("EtymologyBlock", () => {
  it("renders split variant with two words", () => {
    const data: EtymologyData = {
      variant: "split",
      words: [
        { word: "Burkina", lang: "Mooré", definition: "intègres" },
        { word: "Faso", lang: "Dioula", definition: "patrie" },
      ],
    };
    render(<EtymologyBlock data={data} />);
    expect(screen.getByText("Burkina")).toBeTruthy();
    expect(screen.getByText("Faso")).toBeTruthy();
    expect(screen.getByText("Mooré")).toBeTruthy();
    expect(screen.getByText("Dioula")).toBeTruthy();
  });

  it("renders single variant with one word", () => {
    const data: EtymologyData = {
      variant: "single",
      words: [{ word: "Niger", lang: "Latin", definition: "fleuve noir" }],
    };
    render(<EtymologyBlock data={data} />);
    expect(screen.getByText("Niger")).toBeTruthy();
    expect(screen.getByText("Latin")).toBeTruthy();
  });

  it("returns null when no words provided in single variant", () => {
    const data: EtymologyData = {
      variant: "single",
      words: [],
    };
    const { container } = render(<EtymologyBlock data={data} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders uncertain variant with hypotheses", () => {
    const data: EtymologyData = {
      variant: "uncertain",
      words: [{ word: "Sénégal", lang: "Origine débattue", definition: "" }],
      hypotheses: [
        "Hypothèse 1 : du wolof « sunuu gaal ».",
        "Hypothèse 2 : du portugais.",
      ],
    };
    render(<EtymologyBlock data={data} />);
    expect(screen.getByText("Sénégal")).toBeTruthy();
    expect(screen.getByText("Origine débattue")).toBeTruthy();
    expect(screen.getByText("Hypothèse 1")).toBeTruthy();
  });
});

// ==========================================
// OriginBanner
// ==========================================

describe("OriginBanner", () => {
  const baseOrigin: OriginData = {
    personName: "Thomas Sankara",
    initials: "TS",
    date: "1984",
    description: "Le nom a été adopté lors de la révolution de 1984.",
    tonality: "revolution",
  };

  it("renders person name and initials", () => {
    render(<OriginBanner data={baseOrigin} />);
    expect(screen.getByText("Thomas Sankara")).toBeTruthy();
    expect(screen.getByText("TS")).toBeTruthy();
  });

  it("renders old name with strikethrough class when present", () => {
    const dataWithOldName: OriginData = {
      ...baseOrigin,
      oldName: "Haute-Volta",
    };
    const { container } = render(<OriginBanner data={dataWithOldName} />);
    // The old name span has line-through class
    const strikeThroughEl = container.querySelector(".line-through");
    expect(strikeThroughEl).toBeTruthy();
    expect(strikeThroughEl?.textContent).toContain("Haute-Volta");
  });

  it("renders colonial tonality style without error", () => {
    const colonialData: OriginData = {
      personName: "Lord Lugard",
      initials: "LL",
      tonality: "colonial",
    };
    render(<OriginBanner data={colonialData} />);
    expect(screen.getByText("Lord Lugard")).toBeTruthy();
  });

  it("renders neutral tonality style without error", () => {
    const neutralData: OriginData = {
      personName: "Ahmed Sékou Touré",
      initials: "AS",
      tonality: "neutral",
    };
    render(<OriginBanner data={neutralData} />);
    expect(screen.getByText("Ahmed Sékou Touré")).toBeTruthy();
  });
});

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

  it("renders item notes when provided", () => {
    const data: TimelineData = {
      items: [
        {
          type: "kingdom",
          era: "XIIe siècle",
          name: "Empire Mossi",
          note: "Fondé par Ouédraogo",
        },
      ],
      gradientStops: { goldEnd: 100, colonialEnd: 100 },
    };
    render(<HistoryTimeline data={data} />);
    expect(screen.getByText("Fondé par Ouédraogo")).toBeTruthy();
  });
});

// ==========================================
// PeoplesSection
// ==========================================

describe("PeoplesSection", () => {
  it("returns null when rows list is empty", () => {
    const data: PeoplesData = {
      totalPopulation: 0,
      totalPopulationFormatted: "0",
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

  it("shows demographic bar segments for each row", () => {
    const data: PeoplesData = {
      totalPopulation: 22000000,
      totalPopulationFormatted: "22M",
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
  it("gives the endonym typographic precedence over the exonym and a lang attribute", () => {
    const data: PeoplesData = {
      totalPopulation: 22000000,
      totalPopulationFormatted: "22M",
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

    // Lang attribute for correct screen-reader pronunciation
    expect(endonymEl).toHaveAttribute("lang", "yor");

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
// KingdomsSection
// ==========================================

describe("KingdomsSection", () => {
  it("returns null when cards list is empty", () => {
    const data: KingdomsData = {
      title: "Royaumes & Civilisations",
      cards: [],
      layout: "stack",
    };
    const { container } = render(<KingdomsSection data={data} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders kingdom card names", () => {
    const data: KingdomsData = {
      title: "Royaumes & Civilisations",
      cards: [
        {
          name: "Empire Mossi",
          period: "XIIe–XVe siècle",
          peoples: "Mossi",
          tags: ["Ouagadougou"],
        },
        {
          name: "Royaume de Dagomba",
          period: "XVe siècle",
          peoples: "Dagomba",
          tags: [],
        },
      ],
      layout: "scroll",
    };
    render(<KingdomsSection data={data} />);
    expect(screen.getByText("Empire Mossi")).toBeTruthy();
    expect(screen.getByText("Royaume de Dagomba")).toBeTruthy();
  });

  it("renders section title", () => {
    const data: KingdomsData = {
      title: "Royaumes & Civilisations",
      cards: [{ name: "Empire Mossi", tags: [] }],
      layout: "stack",
    };
    render(<KingdomsSection data={data} />);
    expect(screen.getByText("Royaumes & Civilisations")).toBeTruthy();
  });

  it("renders kingdom tags when present", () => {
    const data: KingdomsData = {
      title: "Royaumes & Civilisations",
      cards: [
        {
          name: "Empire Mossi",
          period: "XIIe–XVe siècle",
          tags: ["Ouagadougou", "Yatenga"],
        },
      ],
      layout: "stack",
    };
    render(<KingdomsSection data={data} />);
    expect(screen.getByText("Ouagadougou")).toBeTruthy();
    expect(screen.getByText("Yatenga")).toBeTruthy();
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
  it("returns null when sources string is empty", () => {
    const { container } = render(<SourcesFooter sources="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders sources text", () => {
    render(
      <SourcesFooter sources="UN 2025 · UNFPA 2024 · CIA World Factbook" />
    );
    expect(
      screen.getByText("UN 2025 · UNFPA 2024 · CIA World Factbook")
    ).toBeTruthy();
  });

  it("renders the section header label", () => {
    render(<SourcesFooter sources="UNESCO · SIL Ethnologue" />);
    expect(screen.getByText("Sources & Références")).toBeTruthy();
  });
});
