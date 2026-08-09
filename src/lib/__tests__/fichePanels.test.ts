import { describe, it, expect } from "vitest";
import { derivePanelSequence, PANEL_TABLE } from "@/lib/fichePanels";
import type {
  PeopleDetail,
  CountryDetail,
  LanguageFamilyDetail,
} from "@/types/afrik-frontend";

// Minimal payloads carrying only the fields every entity always has,
// with no optional AFRIK sections populated.
const MINIMAL_PEOPLE: PeopleDetail = {
  id: "PPL_TEST",
  nameMain: "Test People",
  languageFamilyId: "FLG_TEST",
  currentCountries: [],
};

const MINIMAL_COUNTRY: CountryDetail = {
  id: "TST",
  nameFr: "Testland",
  nameCommonFr: "Testland",
};

const MINIMAL_LANGUAGE_FAMILY: LanguageFamilyDetail = {
  id: "FLG_TEST",
  nameFr: "Famille Test",
};

const FULL_PEOPLE: PeopleDetail = {
  ...MINIMAL_PEOPLE,
  appellations: { mainName: "Test People", selfAppellation: "Autonyme" },
  ethnicities: ["Sous-groupe A", "Sous-groupe B"],
  origins: { ancientOrigins: "Region X" },
  organization: { traditionalPoliticalSystem: "Clanique" },
  languages: { mainLanguage: "swa" },
  culture: { ritesAndPractices: { otherMajorRites: ["Rite A"] } },
  historicalRole: { kingdomsOrChiefdoms: "Role" },
  demography: { totalPopulation: 1000 },
  sources: ["https://example.org"],
};

const FULL_COUNTRY: CountryDetail = {
  ...MINIMAL_COUNTRY,
  historicalNames: { precolonial: "Old Name" },
  kingdoms: [{ name: "Kingdom X" }],
  majorPeoples: [{ name: "Test People", peopleId: "PPL_TEST" }],
  culture: { culturalTraditions: "Culture" },
  historicalFacts: { ancientPeriods: "Facts" },
  sources: ["https://example.org"],
  demographics: { peoples: [{ name: "Test People", population: 1000 }] },
};

const FULL_LANGUAGE_FAMILY: LanguageFamilyDetail = {
  ...MINIMAL_LANGUAGE_FAMILY,
  generalInfo: {
    branches: ["Branch A", "Branch B"],
    geographicArea: "West Africa",
    numberOfLanguages: 12,
    totalSpeakers: 5000,
  },
  associatedPeoples: [{ name: "Test People", peopleId: "PPL_TEST" }],
  linguisticCharacteristics: { typology: "SVO" },
  historyAndOrigins: { probableOrigin: "Region Y" },
  distribution: { totalSpeakers: 5000, distributionByCountry: { TST: 5000 } },
  sources: ["https://example.org"],
};

describe("fichePanels — panel composition engine (FR98)", () => {
  // @req REQ-091
  it("exposes a panel table with 8 stably-ordered panels and mandatory markers on 1, 2 and 8", () => {
    expect(PANEL_TABLE).toHaveLength(8);

    const byOrder = [...PANEL_TABLE].sort((a, b) => a.order - b.order);
    expect(byOrder.map((panel) => panel.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);

    const mandatoryOrders = PANEL_TABLE.filter((panel) => panel.mandatory).map(
      (panel) => panel.order
    );
    expect(mandatoryOrders.sort((a, b) => a - b)).toEqual([1, 2, 8]);
  });

  describe("mandatory-panel invariant", () => {
    // @req REQ-091
    it("keeps only identity(1), scale(2) and record(8) for a minimal people payload", () => {
      expect(derivePanelSequence("people", MINIMAL_PEOPLE)).toEqual([
        "identity",
        "scale",
        "record",
      ]);
    });

    // @req REQ-091
    it("keeps only identity(1), scale(2) and record(8) for a minimal country payload", () => {
      expect(derivePanelSequence("country", MINIMAL_COUNTRY)).toEqual([
        "identity",
        "scale",
        "record",
      ]);
    });

    // @req REQ-091
    it("keeps only identity(1), scale(2) and record(8) for a minimal language-family payload", () => {
      expect(
        derivePanelSequence("language-family", MINIMAL_LANGUAGE_FAMILY)
      ).toEqual(["identity", "scale", "record"]);
    });
  });

  describe("per-entity inventories", () => {
    // @req REQ-091
    it("derives the full 8-panel people inventory from a fully-populated payload", () => {
      expect(derivePanelSequence("people", FULL_PEOPLE)).toEqual([
        "identity",
        "scale",
        "territory",
        "tongue",
        "fragmentation",
        "links",
        "voices",
        "record",
      ]);
    });

    // @req REQ-091
    it("derives the 7-panel country inventory (no tongue) from a fully-populated payload", () => {
      expect(derivePanelSequence("country", FULL_COUNTRY)).toEqual([
        "identity",
        "scale",
        "territory",
        "fragmentation",
        "links",
        "voices",
        "record",
      ]);
    });

    // @req REQ-091
    it("never includes tongue for country even when every other section is populated", () => {
      const sequence = derivePanelSequence("country", FULL_COUNTRY);
      expect(sequence).not.toContain("tongue");
    });

    // @req REQ-091
    it("derives the full 8-panel language-family inventory from a fully-populated payload", () => {
      expect(
        derivePanelSequence("language-family", FULL_LANGUAGE_FAMILY)
      ).toEqual([
        "identity",
        "scale",
        "territory",
        "tongue",
        "fragmentation",
        "links",
        "voices",
        "record",
      ]);
    });
  });

  describe("progressive data-gating", () => {
    // @req REQ-091
    it("adds territory only once origins is present (people)", () => {
      const withOrigins: PeopleDetail = {
        ...MINIMAL_PEOPLE,
        origins: { ancientOrigins: "Region X" },
      };
      expect(derivePanelSequence("people", withOrigins)).toEqual([
        "identity",
        "scale",
        "territory",
        "record",
      ]);
    });

    // @req REQ-091
    it("adds tongue only once languages is present (people)", () => {
      const withLanguages: PeopleDetail = {
        ...MINIMAL_PEOPLE,
        languages: { mainLanguage: "swa" },
      };
      expect(derivePanelSequence("people", withLanguages)).toEqual([
        "identity",
        "scale",
        "tongue",
        "record",
      ]);
    });

    // @req REQ-091
    it("adds fragmentation only once ethnicities is non-empty (people)", () => {
      const withEthnicities: PeopleDetail = {
        ...MINIMAL_PEOPLE,
        ethnicities: ["Sous-groupe A"],
      };
      expect(derivePanelSequence("people", withEthnicities)).toEqual([
        "identity",
        "scale",
        "fragmentation",
        "record",
      ]);
    });

    // @req REQ-091
    it("does not gate fragmentation in when ethnicities is an empty array (people)", () => {
      const withEmptyEthnicities: PeopleDetail = {
        ...MINIMAL_PEOPLE,
        ethnicities: [],
      };
      expect(derivePanelSequence("people", withEmptyEthnicities)).toEqual([
        "identity",
        "scale",
        "record",
      ]);
    });

    // @req REQ-091
    it("adds links only once historicalFacts is present (country)", () => {
      const withFacts: CountryDetail = {
        ...MINIMAL_COUNTRY,
        historicalFacts: { ancientPeriods: "Facts" },
      };
      expect(derivePanelSequence("country", withFacts)).toEqual([
        "identity",
        "scale",
        "links",
        "record",
      ]);
    });

    // @req REQ-091
    it("adds fragmentation only once branches is non-empty (language-family)", () => {
      const withBranches: LanguageFamilyDetail = {
        ...MINIMAL_LANGUAGE_FAMILY,
        generalInfo: { branches: ["Branch A"] },
      };
      expect(derivePanelSequence("language-family", withBranches)).toEqual([
        "identity",
        "scale",
        "fragmentation",
        "record",
      ]);
    });
  });

  describe("stable ordering and determinism", () => {
    // @req REQ-091
    it("returns panels in ascending numeric order regardless of payload field insertion order", () => {
      const reorderedPeople: PeopleDetail = {
        sources: FULL_PEOPLE.sources,
        demography: FULL_PEOPLE.demography,
        historicalRole: FULL_PEOPLE.historicalRole,
        culture: FULL_PEOPLE.culture,
        languages: FULL_PEOPLE.languages,
        organization: FULL_PEOPLE.organization,
        origins: FULL_PEOPLE.origins,
        ethnicities: FULL_PEOPLE.ethnicities,
        appellations: FULL_PEOPLE.appellations,
        ...MINIMAL_PEOPLE,
      };
      expect(derivePanelSequence("people", reorderedPeople)).toEqual(
        derivePanelSequence("people", FULL_PEOPLE)
      );
    });

    // @req REQ-091
    it("is deterministic across repeated calls with identical input", () => {
      const first = derivePanelSequence("people", FULL_PEOPLE);
      const second = derivePanelSequence("people", FULL_PEOPLE);
      expect(first).toEqual(second);
    });
  });
});
