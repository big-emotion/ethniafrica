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
  culture: { majorRites: "Rite A" },
  historicalRole: { kingdomsOrChiefdoms: "Role" },
  demography: { totalPopulation: 1000 },
  sources: [{ title: "https://example.org", url: null, tier: "unverified" }],
};

const FULL_COUNTRY: CountryDetail = {
  ...MINIMAL_COUNTRY,
  historicalNames: { precolonial: "Old Name" },
  kingdoms: [{ name: "Kingdom X" }],
  majorPeoples: [{ name: "Test People", peopleId: "PPL_TEST" }],
  culture: { culturalTraditions: "Culture" },
  historicalFacts: { ancientPeriods: "Facts" },
  sources: [{ title: "https://example.org", url: null, tier: "unverified" }],
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
  sources: [{ title: "https://example.org", url: null, tier: "unverified" }],
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
    it("keeps a minimal people payload to its record alone", () => {
      expect(derivePanelSequence("people", MINIMAL_PEOPLE)).toEqual(["record"]);
    });

    // @req REQ-091
    it("keeps only the record for a minimal country payload", () => {
      expect(derivePanelSequence("country", MINIMAL_COUNTRY)).toEqual([
        "record",
      ]);
    });

    // @req REQ-091
    it("keeps only the record for a minimal language-family payload", () => {
      expect(
        derivePanelSequence("language-family", MINIMAL_LANGUAGE_FAMILY)
      ).toEqual(["record"]);
    });
  });

  describe("per-entity inventories", () => {
    // The people fiche is the globe and the parchment: every chapter the
    // sequence used to add above that parchment either restated it or
    // competed with it, so a people's inventory is now the record alone and a
    // fully-populated payload adds nothing to it.
    // @req REQ-091
    it("derives the record alone for a people, however full the payload", () => {
      expect(derivePanelSequence("people", FULL_PEOPLE)).toEqual(["record"]);
    });

    // However full the payload, a country fiche is one globe and one
    // parchment: the parchment reads every section a chapter used to claim.
    // @req REQ-091
    it("keeps the country inventory at the record however populated the payload", () => {
      expect(derivePanelSequence("country", FULL_COUNTRY)).toEqual(["record"]);
    });

    // @req REQ-091
    it("includes no chapter kind for country beyond the record", () => {
      const sequence = derivePanelSequence("country", FULL_COUNTRY);
      for (const kind of [
        "identity",
        "scale",
        "tongue",
        "territory",
        "fragmentation",
        "links",
        "voices",
      ] as const) {
        expect(sequence).not.toContain(kind);
      }
    });

    // The family fiche is the last of the three to become one globe and one
    // parchment. Its two surviving chapters both restated the parchment: the
    // scale figure is `generalInfo.numberOfLanguages`, which the head chip and
    // the "Langues" stat card already print, and the tongue chapter was the
    // very tree FamilyClassificationTreeSection renders, off the same
    // `tree.branches` the route builds once.
    // @req REQ-091
    it("keeps the language-family inventory at the record however populated the payload", () => {
      expect(
        derivePanelSequence("language-family", FULL_LANGUAGE_FAMILY)
      ).toEqual(["record"]);
    });

    // @req REQ-091
    it("includes no chapter kind for a language-family beyond the record", () => {
      const sequence = derivePanelSequence(
        "language-family",
        FULL_LANGUAGE_FAMILY
      );
      for (const kind of [
        "identity",
        "scale",
        "tongue",
        "territory",
        "fragmentation",
        "links",
        "voices",
      ] as const) {
        expect(sequence).not.toContain(kind);
      }
    });
  });

  describe("progressive data-gating", () => {
    // A people has no gated chapter left to open, so filling the very
    // sections that used to gate one — origins, languages, ethnicities — must
    // leave the sequence where it was. This is the guard against a chapter
    // creeping back above the parchment through the gate table.
    // @req REQ-091
    it("gates no chapter in for a people, whichever section is filled", () => {
      const filled: PeopleDetail[] = [
        { ...MINIMAL_PEOPLE, origins: { ancientOrigins: "Region X" } },
        { ...MINIMAL_PEOPLE, languages: { mainLanguage: "swa" } },
        { ...MINIMAL_PEOPLE, ethnicities: ["Sous-groupe A"] },
        { ...MINIMAL_PEOPLE, ethnicities: [] },
      ];

      for (const payload of filled) {
        expect(derivePanelSequence("people", payload)).toEqual(["record"]);
      }
    });

    // The country gates keyed on fields unrelated to what their panels read —
    // `links` on historicalFacts, when no country relation source exists at
    // all. With the inventory down to the record there is nothing to gate.
    // @req REQ-091
    it("adds no chapter for a country however its sections fill up", () => {
      const withFacts: CountryDetail = {
        ...MINIMAL_COUNTRY,
        historicalFacts: { ancientPeriods: "Facts" },
      };
      expect(derivePanelSequence("country", withFacts)).toEqual(["record"]);
    });

    // The family gates keyed on the sections its parchment already reads —
    // branches, linguistic characteristics, associated peoples. Filling any of
    // them must not open a chapter back above the parchment.
    // @req REQ-091
    it("gates no chapter in for a language-family, whichever section is filled", () => {
      const filled: LanguageFamilyDetail[] = [
        { ...MINIMAL_LANGUAGE_FAMILY, generalInfo: { branches: ["Branch A"] } },
        {
          ...MINIMAL_LANGUAGE_FAMILY,
          linguisticCharacteristics: { typology: "SVO" },
        },
        {
          ...MINIMAL_LANGUAGE_FAMILY,
          associatedPeoples: [{ name: "Test People", peopleId: "PPL_TEST" }],
        },
        {
          ...MINIMAL_LANGUAGE_FAMILY,
          historyAndOrigins: { probableOrigin: "Y" },
        },
      ];

      for (const payload of filled) {
        expect(derivePanelSequence("language-family", payload)).toEqual([
          "record",
        ]);
      }
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
