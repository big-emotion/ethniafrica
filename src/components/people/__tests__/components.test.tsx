import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ParagraphChipData } from "../ProseWithChip";
import { PeopleOriginBlock } from "../PeopleOriginBlock";
import { PeopleLanguageSection } from "../PeopleLanguageSection";
import { PeopleHistoryTimeline } from "../PeopleHistoryTimeline";
import { PeopleCultureGrid } from "../PeopleCultureGrid";
import { PeopleRelatedPeoplesSection } from "../PeopleRelatedPeoplesSection";
import { PeopleCountriesSection } from "../PeopleCountriesSection";
import type {
  PeopleOriginData,
  PeopleLanguageData,
  PeopleHistoryData,
  PeopleCultureData,
  PeopleRelatedData,
  PeopleCountriesData,
} from "@/lib/peopleDataTransformer";

// ==========================================
// PeopleFicheHead replaced PeopleHero: the mockup's fiche head is an
// overline, a title, a lede and two chips on parchment, where the old hero
// was a teal gradient card — teal is the country accent, and a people fiche
// is ocre (atlas-charter §2). Its own tests live in PeopleFicheHead.test.tsx.
// ==========================================

// ==========================================
// PeopleOriginBlock
// ==========================================

describe("PeopleOriginBlock", () => {
  it("returns null when all fields empty", () => {
    const empty: PeopleOriginData = {
      migrationRoutes: [],
      historicalSettlementZones: [],
    };
    const { container } = render(<PeopleOriginBlock data={empty} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders ancientOrigins when present", () => {
    const data: PeopleOriginData = {
      ancientOrigins: "Originaires du pays Yoruba au sud-ouest du Nigeria",
      migrationRoutes: [],
      historicalSettlementZones: [],
    };
    render(<PeopleOriginBlock data={data} />);
    expect(
      screen.getByText("Originaires du pays Yoruba au sud-ouest du Nigeria")
    ).toBeTruthy();
  });

  it("renders formationPeriod when present", () => {
    const data: PeopleOriginData = {
      formationPeriod: "VIIe–IXe siècle",
      migrationRoutes: [],
      historicalSettlementZones: [],
    };
    render(<PeopleOriginBlock data={data} />);
    expect(screen.getByText("VIIe–IXe siècle")).toBeTruthy();
  });

  it("renders migrationRoutes when non-empty", () => {
    const data: PeopleOriginData = {
      migrationRoutes: ["Ile-Ife vers la côte", "Expansions vers le Bénin"],
      historicalSettlementZones: [],
    };
    render(<PeopleOriginBlock data={data} />);
    expect(screen.getByText("Ile-Ife vers la côte")).toBeTruthy();
    expect(screen.getByText("Expansions vers le Bénin")).toBeTruthy();
  });

  it("renders historicalSettlementZones when non-empty", () => {
    const data: PeopleOriginData = {
      migrationRoutes: [],
      historicalSettlementZones: ["Oyo", "Lagos", "Ibadan"],
    };
    render(<PeopleOriginBlock data={data} />);
    expect(screen.getByText("Oyo")).toBeTruthy();
  });

  it("renders externalInfluences when present", () => {
    const data: PeopleOriginData = {
      migrationRoutes: [],
      historicalSettlementZones: [],
      externalInfluences: "Contacts avec les Hausa et les Fulani",
    };
    render(<PeopleOriginBlock data={data} />);
    expect(
      screen.getByText("Contacts avec les Hausa et les Fulani")
    ).toBeTruthy();
  });
});

// ==========================================
// PeopleLanguageSection
// ==========================================

describe("PeopleLanguageSection", () => {
  it("returns null when no language data", () => {
    const empty: PeopleLanguageData = {
      isoCodes: [],
      dialects: [],
    };
    const { container } = render(<PeopleLanguageSection data={empty} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders mainLanguage when present", () => {
    const data: PeopleLanguageData = {
      mainLanguage: "Yoruba",
      isoCodes: ["yor"],
      dialects: [],
    };
    render(<PeopleLanguageSection data={data} />);
    expect(screen.getByText("Yoruba")).toBeTruthy();
  });

  it("renders ISO codes as badges", () => {
    const data: PeopleLanguageData = {
      isoCodes: ["yor", "yor-NG"],
      dialects: [],
    };
    render(<PeopleLanguageSection data={data} />);
    expect(screen.getByText("yor")).toBeTruthy();
    expect(screen.getByText("yor-NG")).toBeTruthy();
  });

  it("renders dialects list when non-empty", () => {
    const data: PeopleLanguageData = {
      isoCodes: [],
      dialects: ["Ìjẹ̀bú", "Ẹ̀gbá"],
    };
    render(<PeopleLanguageSection data={data} />);
    expect(screen.getByText("Ìjẹ̀bú")).toBeTruthy();
    expect(screen.getByText("Ẹ̀gbá")).toBeTruthy();
  });

  it("renders vehicularRole when present", () => {
    const data: PeopleLanguageData = {
      isoCodes: [],
      dialects: [],
      vehicularRole: "Langue véhiculaire au Nigeria du Sud-Ouest",
    };
    render(<PeopleLanguageSection data={data} />);
    expect(
      screen.getByText("Langue véhiculaire au Nigeria du Sud-Ouest")
    ).toBeTruthy();
  });
});

// ==========================================
// PeopleHistoryTimeline
// ==========================================

describe("PeopleHistoryTimeline", () => {
  it("returns null when all fields empty", () => {
    const empty: PeopleHistoryData = {};
    const { container } = render(<PeopleHistoryTimeline data={empty} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders kingdomsOrChiefdoms when present", () => {
    const data: PeopleHistoryData = {
      kingdomsOrChiefdoms: "Empire d'Oyo (XIVe–XIXe siècle)",
    };
    render(<PeopleHistoryTimeline data={data} />);
    expect(screen.getByText("Empire d'Oyo (XIVe–XIXe siècle)")).toBeTruthy();
  });

  it("renders relationsWithNeighbors when present", () => {
    const data: PeopleHistoryData = {
      relationsWithNeighbors: "Relations commerciales avec les Hausa",
    };
    render(<PeopleHistoryTimeline data={data} />);
    expect(
      screen.getByText("Relations commerciales avec les Hausa")
    ).toBeTruthy();
  });

  it("renders conflictsOrAlliances when present", () => {
    const data: PeopleHistoryData = {
      conflictsOrAlliances: "Guerres civiles de l'empire d'Oyo (XIXe siècle)",
    };
    render(<PeopleHistoryTimeline data={data} />);
    expect(
      screen.getByText("Guerres civiles de l'empire d'Oyo (XIXe siècle)")
    ).toBeTruthy();
  });

  it("renders diaspora when present", () => {
    const data: PeopleHistoryData = {
      diaspora: "Forte communauté yoruba au Brésil (Candomblé)",
    };
    render(<PeopleHistoryTimeline data={data} />);
    expect(
      screen.getByText("Forte communauté yoruba au Brésil (Candomblé)")
    ).toBeTruthy();
  });
});

// ==========================================
// PeopleCultureGrid
// ==========================================

describe("PeopleCultureGrid", () => {
  // @req REQ-003
  it("returns null when the fiche declares no culture", () => {
    const { container } = render(<PeopleCultureGrid data={{}} />);
    expect(container.firstChild).toBeNull();
  });

  // The four fields every fiche in the corpus fills. Rendering fewer than
  // four is the defect this suite exists to catch.
  // @req REQ-003
  it("renders each of the four declared fields under its own label", () => {
    const data: PeopleCultureData = {
      majorRites: "Le culte des orisha structure la vie rituelle.",
      symbols: "Les tissus aso-oke et adire.",
      artsAndMusic: "Le dundun, tambour parlant.",
      spiritualities: "Aborisa reconnait Olodumare.",
    };
    render(<PeopleCultureGrid data={data} />);

    expect(screen.getByText("Rites majeurs")).toBeTruthy();
    expect(screen.getByText("Symboles")).toBeTruthy();
    expect(screen.getByText("Arts & musique")).toBeTruthy();
    expect(screen.getByText("Spiritualités")).toBeTruthy();

    expect(screen.getByText(/culte des orisha/)).toBeTruthy();
    expect(screen.getByText(/aso-oke/)).toBeTruthy();
    expect(screen.getByText(/dundun/)).toBeTruthy();
    expect(screen.getByText(/Olodumare/)).toBeTruthy();
  });

  // @req REQ-003
  it("omits the fields the fiche leaves empty, and keeps the rest", () => {
    render(<PeopleCultureGrid data={{ symbols: "Le masque gre." }} />);

    expect(screen.getByText("Symboles")).toBeTruthy();
    expect(screen.queryByText("Rites majeurs")).toBeNull();
    expect(screen.queryByText("Arts & musique")).toBeNull();
    expect(screen.queryByText("Spiritualités")).toBeNull();
  });
});

// ==========================================
// PeopleRelatedPeoplesSection
// ==========================================

describe("PeopleRelatedPeoplesSection", () => {
  it("returns null when all fields empty", () => {
    const empty: PeopleRelatedData = {
      ethnicities: [],
    };
    const { container } = render(
      <PeopleRelatedPeoplesSection language="fr" data={empty} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders ethnicities list when non-empty", () => {
    const data: PeopleRelatedData = {
      ethnicities: ["Ìjẹ̀bú", "Ẹ̀gbá", "Ọ̀yọ́"],
    };
    render(<PeopleRelatedPeoplesSection language="fr" data={data} />);
    expect(screen.getByText("Ìjẹ̀bú")).toBeTruthy();
    expect(screen.getByText("Ẹ̀gbá")).toBeTruthy();
    expect(screen.getByText("Ọ̀yọ́")).toBeTruthy();
  });

  it("renders politicalSystem when present", () => {
    const data: PeopleRelatedData = {
      ethnicities: [],
      politicalSystem: "Monarchie constitutionnelle sous un Oba",
    };
    render(<PeopleRelatedPeoplesSection language="fr" data={data} />);
    expect(
      screen.getByText("Monarchie constitutionnelle sous un Oba")
    ).toBeTruthy();
  });

  it("renders clanOrganization when present", () => {
    const data: PeopleRelatedData = {
      ethnicities: [],
      clanOrganization: "Clans patrilinéaires (idile)",
    };
    render(<PeopleRelatedPeoplesSection language="fr" data={data} />);
    expect(screen.getByText("Clans patrilinéaires (idile)")).toBeTruthy();
  });

  it("renders ageClassSystems when present", () => {
    const data: PeopleRelatedData = {
      ethnicities: [],
      ageClassSystems: "Système des grades d'âge (ẹgbẹ)",
    };
    render(<PeopleRelatedPeoplesSection language="fr" data={data} />);
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
    expect(screen.getByText("89%")).toBeTruthy();
    expect(screen.getByText("7%")).toBeTruthy();
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
  it("renders referenceYear on the source line rather than as a headline", () => {
    const data: PeopleCountriesData = {
      totalPopulation: 45000000,
      totalPopulationFormatted: "45M",
      referenceYear: 2025,
      source: "UNFPA",
      distributions: [{ country: "NGA", percentage: 89 }],
    };
    render(<PeopleCountriesSection language="fr" data={data} />);
    expect(screen.getByText(/UNFPA/)).toBeTruthy();
    expect(screen.getByText(/2025/)).toBeTruthy();
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

const sampleChip: ParagraphChipData = {
  chipId: "test-chip",
  confidenceScore: 82,
  sourceCount: 2,
  lastHumanAuditAt: "2025-03-10",
  assertionStatement: "Assertion de test.",
  sources: [],
};

describe("PeopleOriginBlock — chip integration", () => {
  it("renders chip (or fallback) for ancientOrigins when chip provided", async () => {
    render(
      <PeopleOriginBlock
        data={{
          ancientOrigins: "Texte origines.",
          migrationRoutes: [],
          historicalSettlementZones: [],
        }}
        chips={{ ancientOrigins: sampleChip }}
      />
    );
    expect(screen.getByText("Texte origines.")).toBeTruthy();
    await waitFor(() => {
      const btn = screen.queryByRole("button");
      const link = screen.queryByText("voir les sources");
      expect(btn ?? link).toBeTruthy();
    });
  });

  it("renders chip for formationPeriod when chip provided", async () => {
    render(
      <PeopleOriginBlock
        data={{
          formationPeriod: "VIIe siècle.",
          migrationRoutes: [],
          historicalSettlementZones: [],
        }}
        chips={{ formationPeriod: sampleChip }}
      />
    );
    expect(screen.getByText("VIIe siècle.")).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.queryByRole("button") ?? screen.queryByText("voir les sources")
      ).toBeTruthy();
    });
  });

  it("still renders without chips when no chips prop passed", () => {
    const { container } = render(
      <PeopleOriginBlock
        data={{
          ancientOrigins: "Sans chip.",
          migrationRoutes: [],
          historicalSettlementZones: [],
        }}
      />
    );
    expect(screen.getByText("Sans chip.")).toBeTruthy();
    expect(container.querySelector("p.people-section-body")).toBeTruthy();
  });
});

describe("PeopleHistoryTimeline — chip integration", () => {
  it("renders chip for kingdomsOrChiefdoms when chip provided", async () => {
    render(
      <PeopleHistoryTimeline
        data={{ kingdomsOrChiefdoms: "Empire d'Oyo." }}
        chips={{ kingdomsOrChiefdoms: sampleChip }}
      />
    );
    expect(screen.getByText("Empire d'Oyo.")).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.queryByRole("button") ?? screen.queryByText("voir les sources")
      ).toBeTruthy();
    });
  });

  it("renders chip for diaspora when chip provided", async () => {
    render(
      <PeopleHistoryTimeline
        data={{ diaspora: "Communauté au Brésil." }}
        chips={{ diaspora: sampleChip }}
      />
    );
    expect(screen.getByText("Communauté au Brésil.")).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.queryByRole("button") ?? screen.queryByText("voir les sources")
      ).toBeTruthy();
    });
  });
});

describe("PeopleCultureGrid — chip integration", () => {
  // @req REQ-003
  it("renders the source chip on arts and music when one is provided", async () => {
    render(
      <PeopleCultureGrid
        data={{ artsAndMusic: "Dundun, bata." }}
        chips={{ artsAndMusic: sampleChip }}
      />
    );
    expect(screen.getByText("Dundun, bata.")).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.queryByRole("button") ?? screen.queryByText("voir les sources")
      ).toBeTruthy();
    });
  });

  // @req REQ-003
  it("renders the source chip on major rites when one is provided", async () => {
    render(
      <PeopleCultureGrid
        data={{ majorRites: "Rites de passage." }}
        chips={{ majorRites: sampleChip }}
      />
    );
    expect(screen.getByText("Rites de passage.")).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.queryByRole("button") ?? screen.queryByText("voir les sources")
      ).toBeTruthy();
    });
  });
});

describe("PeopleLanguageSection — chip integration", () => {
  it("renders chip for vehicularRole when chip provided", async () => {
    render(
      <PeopleLanguageSection
        data={{
          isoCodes: [],
          dialects: [],
          vehicularRole: "Langue véhiculaire.",
        }}
        chips={{ vehicularRole: sampleChip }}
      />
    );
    expect(screen.getByText("Langue véhiculaire.")).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.queryByRole("button") ?? screen.queryByText("voir les sources")
      ).toBeTruthy();
    });
  });
});
