import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ParagraphChipData } from "../ProseWithChip";
import { AutonymExonymHeading } from "../AutonymExonymHeading";
import { PeopleHero } from "../PeopleHero";
import { PeopleOriginBlock } from "../PeopleOriginBlock";
import { PeopleLanguageSection } from "../PeopleLanguageSection";
import { PeopleHistoryTimeline } from "../PeopleHistoryTimeline";
import { PeopleCultureGrid } from "../PeopleCultureGrid";
import { PeopleRelatedPeoplesSection } from "../PeopleRelatedPeoplesSection";
import { PeopleCountriesSection } from "../PeopleCountriesSection";
import { PeopleSourcesFooter } from "../PeopleSourcesFooter";
import type {
  PeopleHeroData,
  PeopleOriginData,
  PeopleLanguageData,
  PeopleHistoryData,
  PeopleCultureData,
  PeopleRelatedData,
  PeopleCountriesData,
} from "@/lib/peopleDataTransformer";

// ==========================================
// AutonymExonymHeading
// ==========================================

describe("AutonymExonymHeading", () => {
  it("renders nameMain", () => {
    render(
      <AutonymExonymHeading nameMain="Yoruba" exonyms={[]} variant="hero" />
    );
    expect(screen.getByText("Yoruba")).toBeTruthy();
  });

  it("renders autonym when provided", () => {
    render(
      <AutonymExonymHeading
        nameMain="Yoruba"
        autonym="Ọmọ Oòduà"
        exonyms={[]}
        variant="hero"
      />
    );
    expect(screen.getByText("Ọmọ Oòduà")).toBeTruthy();
  });

  it("does not render autonym section when absent", () => {
    const { container } = render(
      <AutonymExonymHeading nameMain="Yoruba" exonyms={[]} variant="hero" />
    );
    expect(container.querySelector("[data-autonym]")).toBeNull();
  });

  it("renders exonyms as individual pills", () => {
    render(
      <AutonymExonymHeading
        nameMain="Yoruba"
        exonyms={["Yariba", "Ioruba"]}
        variant="hero"
      />
    );
    expect(screen.getByText("Yariba")).toBeTruthy();
    expect(screen.getByText("Ioruba")).toBeTruthy();
  });

  it("renders nothing for exonyms when list is empty", () => {
    const { container } = render(
      <AutonymExonymHeading nameMain="Yoruba" exonyms={[]} variant="section" />
    );
    expect(container.querySelector("[data-exonyms]")).toBeNull();
  });
});

// ==========================================
// PeopleHero
// ==========================================

describe("PeopleHero", () => {
  const baseHero: PeopleHeroData = {
    peopleId: "PPL_YORUBA",
    nameMain: "Yoruba",
    selfAppellation: "Ọmọ Oòduà",
    exonyms: ["Yariba"],
    languageFamilyId: "FLG_NIGER_CONGO",
    languageFamilyName: "Niger-Congo",
    currentCountries: ["NGA", "BEN", "TGO"],
    classificationStatus: null,
  };

  it("renders nameMain in hero", () => {
    render(<PeopleHero data={baseHero} />);
    expect(screen.getByText("Yoruba")).toBeTruthy();
  });

  it("renders selfAppellation when provided", () => {
    render(<PeopleHero data={baseHero} />);
    expect(screen.getByText("Ọmọ Oòduà")).toBeTruthy();
  });

  it("renders exonyms", () => {
    render(<PeopleHero data={baseHero} />);
    expect(screen.getByText("Yariba")).toBeTruthy();
  });

  it("renders languageFamilyName badge when provided", () => {
    render(<PeopleHero data={baseHero} />);
    expect(screen.getByText("Niger-Congo")).toBeTruthy();
  });

  it("renders country count badge", () => {
    render(<PeopleHero data={baseHero} />);
    expect(screen.getByText(/3 pays/)).toBeTruthy();
  });

  it("shows confidence fallback link when no confidence data", () => {
    render(
      <PeopleHero
        data={baseHero}
        confidenceScore={null}
        sourceCount={null}
        lastHumanAuditAt={null}
      />
    );
    expect(screen.getByText("voir les sources")).toBeTruthy();
  });

  it("renders flag CTA button when onFlagCtaClick provided", () => {
    render(<PeopleHero data={baseHero} onFlagCtaClick={() => {}} />);
    expect(screen.getByRole("button", { name: /signaler/i })).toBeTruthy();
  });

  it("renders back button when onBack provided", () => {
    render(<PeopleHero data={baseHero} onBack={() => {}} />);
    expect(screen.getByRole("button", { name: /retour/i })).toBeTruthy();
  });
});

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
  it("returns null when all fields empty", () => {
    const empty: PeopleCultureData = {
      intermediates: [],
      symbols: [],
    };
    const { container } = render(<PeopleCultureGrid data={empty} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders supremeDeity when present", () => {
    const data: PeopleCultureData = {
      supremeDeity: "Olódùmarè",
      intermediates: [],
      symbols: [],
    };
    render(<PeopleCultureGrid data={data} />);
    expect(screen.getByText("Olódùmarè")).toBeTruthy();
  });

  it("renders intermediates list when non-empty", () => {
    const data: PeopleCultureData = {
      intermediates: ["Obàtálá", "Ṣàngó", "Ọ̀ṣun"],
      symbols: [],
    };
    render(<PeopleCultureGrid data={data} />);
    expect(screen.getByText("Obàtálá")).toBeTruthy();
    expect(screen.getByText("Ṣàngó")).toBeTruthy();
    expect(screen.getByText("Ọ̀ṣun")).toBeTruthy();
  });

  it("renders symbols list when non-empty", () => {
    const data: PeopleCultureData = {
      intermediates: [],
      symbols: ["Àdìrẹ cloth", "Ìlẹkẹ̀ beads"],
    };
    render(<PeopleCultureGrid data={data} />);
    expect(screen.getByText("Àdìrẹ cloth")).toBeTruthy();
    expect(screen.getByText("Ìlẹkẹ̀ beads")).toBeTruthy();
  });

  it("renders christianityPercentage and islamPercentage when present", () => {
    const data: PeopleCultureData = {
      intermediates: [],
      symbols: [],
      christianityPercentage: 45,
      islamPercentage: 50,
    };
    render(<PeopleCultureGrid data={data} />);
    expect(screen.getByText(/45/)).toBeTruthy();
    expect(screen.getByText(/50/)).toBeTruthy();
  });

  it("renders music when present", () => {
    const data: PeopleCultureData = {
      intermediates: [],
      symbols: [],
      music: "Dundun, bata",
    };
    render(<PeopleCultureGrid data={data} />);
    expect(screen.getByText("Dundun, bata")).toBeTruthy();
  });

  it("renders gastronomy when present", () => {
    const data: PeopleCultureData = {
      intermediates: [],
      symbols: [],
      gastronomy: "Egusi soup, jollof rice",
    };
    render(<PeopleCultureGrid data={data} />);
    expect(screen.getByText("Egusi soup, jollof rice")).toBeTruthy();
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
    const { container } = render(<PeopleRelatedPeoplesSection data={empty} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders ethnicities list when non-empty", () => {
    const data: PeopleRelatedData = {
      ethnicities: ["Ìjẹ̀bú", "Ẹ̀gbá", "Ọ̀yọ́"],
    };
    render(<PeopleRelatedPeoplesSection data={data} />);
    expect(screen.getByText("Ìjẹ̀bú")).toBeTruthy();
    expect(screen.getByText("Ẹ̀gbá")).toBeTruthy();
    expect(screen.getByText("Ọ̀yọ́")).toBeTruthy();
  });

  it("renders politicalSystem when present", () => {
    const data: PeopleRelatedData = {
      ethnicities: [],
      politicalSystem: "Monarchie constitutionnelle sous un Oba",
    };
    render(<PeopleRelatedPeoplesSection data={data} />);
    expect(
      screen.getByText("Monarchie constitutionnelle sous un Oba")
    ).toBeTruthy();
  });

  it("renders clanOrganization when present", () => {
    const data: PeopleRelatedData = {
      ethnicities: [],
      clanOrganization: "Clans patrilinéaires (idile)",
    };
    render(<PeopleRelatedPeoplesSection data={data} />);
    expect(screen.getByText("Clans patrilinéaires (idile)")).toBeTruthy();
  });

  it("renders ageClassSystems when present", () => {
    const data: PeopleRelatedData = {
      ethnicities: [],
      ageClassSystems: "Système des grades d'âge (ẹgbẹ)",
    };
    render(<PeopleRelatedPeoplesSection data={data} />);
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
    const { container } = render(<PeopleCountriesSection data={empty} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders totalPopulationFormatted", () => {
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
    render(<PeopleCountriesSection data={data} />);
    expect(screen.getByText("45M")).toBeTruthy();
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
    render(<PeopleCountriesSection data={data} />);
    expect(screen.getByText("NGA")).toBeTruthy();
    expect(screen.getByText("BEN")).toBeTruthy();
    expect(screen.getByText("89%")).toBeTruthy();
    expect(screen.getByText("7%")).toBeTruthy();
  });

  it("renders referenceYear when provided", () => {
    const data: PeopleCountriesData = {
      totalPopulation: 45000000,
      totalPopulationFormatted: "45M",
      referenceYear: 2025,
      distributions: [{ country: "NGA", percentage: 89 }],
    };
    render(<PeopleCountriesSection data={data} />);
    expect(screen.getByText(/2025/)).toBeTruthy();
  });
});

// ==========================================
// PeopleSourcesFooter
// ==========================================

describe("PeopleSourcesFooter", () => {
  it("returns null when sources string is empty", () => {
    const { container } = render(<PeopleSourcesFooter sources="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders sources text", () => {
    render(
      <PeopleSourcesFooter sources="SIL Ethnologue 2025 · UNFPA 2024 · CIA World Factbook" />
    );
    expect(
      screen.getByText("SIL Ethnologue 2025 · UNFPA 2024 · CIA World Factbook")
    ).toBeTruthy();
  });

  it("renders section header label", () => {
    render(<PeopleSourcesFooter sources="SIL Ethnologue 2025" />);
    expect(screen.getByText("Sources & Références")).toBeTruthy();
  });
});

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
  it("renders chip for music when chip provided", async () => {
    render(
      <PeopleCultureGrid
        data={{ intermediates: [], symbols: [], music: "Dundun, bata." }}
        chips={{ music: sampleChip }}
      />
    );
    expect(screen.getByText("Dundun, bata.")).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.queryByRole("button") ?? screen.queryByText("voir les sources")
      ).toBeTruthy();
    });
  });

  it("renders chip for initiation when chip provided", async () => {
    render(
      <PeopleCultureGrid
        data={{
          intermediates: [],
          symbols: [],
          initiation: "Rites masculins.",
        }}
        chips={{ initiation: sampleChip }}
      />
    );
    expect(screen.getByText("Rites masculins.")).toBeTruthy();
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
