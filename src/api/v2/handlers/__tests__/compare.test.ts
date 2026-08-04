import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/peopleService", () => ({
  getPeopleById: vi.fn(),
}));
vi.mock("../../services/countryService", () => ({
  getCountryById: vi.fn(),
}));
vi.mock("../../services/languageFamilyService", () => ({
  getLanguageFamilyById: vi.fn(),
}));

import { getPeopleById } from "../../services/peopleService";
import { getCountryById } from "../../services/countryService";
import { getLanguageFamilyById } from "../../services/languageFamilyService";
import { assembleComparison } from "../compare";
import type { People, Country, LanguageFamily } from "@/types/afrik";

const SHONA: People = {
  id: "PPL_SHONA",
  nameMain: "Shona",
  languageFamilyId: "FLG_BANTU",
  currentCountries: ["ZWE"],
  content: {
    appellations: { autonym: "VaShona" } as never,
    origins: { summary: "Bantu migration" } as never,
  },
};

const ZULU: People = {
  id: "PPL_ZULU",
  nameMain: "Zulu",
  languageFamilyId: "FLG_BANTU",
  currentCountries: ["ZAF"],
  content: {
    appellations: { autonym: "AmaZulu" } as never,
  },
};

const ZWE: Country = {
  id: "ZWE",
  nameFr: "Zimbabwe",
  content: {
    historicalNames: { previous: ["Rhodesia"] } as never,
    culture: { summary: "..." } as never,
  },
};

const MOZ: Country = {
  id: "MOZ",
  nameFr: "Mozambique",
  content: {},
};

const FLG_BANTU: LanguageFamily = {
  id: "FLG_BANTU",
  nameFr: "Bantou",
  content: {
    decolonialHeader: { note: "..." } as never,
    generalInfo: { numberOfLanguages: 500 },
  },
};

const FLG_NILOTIC: LanguageFamily = {
  id: "FLG_NILOTIC",
  nameFr: "Nilotique",
  content: {},
};

describe("assembleComparison", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-084
  it("assembles peoples entities with explicit null sections", async () => {
    vi.mocked(getPeopleById).mockImplementation(async (id: string) =>
      id === "PPL_SHONA" ? SHONA : id === "PPL_ZULU" ? ZULU : null
    );

    const result = await assembleComparison({
      entityType: "peoples",
      ids: ["PPL_SHONA", "PPL_ZULU"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entityType).toBe("peoples");
    expect(result.entities).toEqual([
      {
        type: "peuple",
        id: "PPL_SHONA",
        label: "Shona",
        appellations: { autonym: "VaShona" },
        origins: { summary: "Bantu migration" },
        organization: null,
        languages: null,
        culture: null,
        historicalRole: null,
        demography: null,
      },
      {
        type: "peuple",
        id: "PPL_ZULU",
        label: "Zulu",
        appellations: { autonym: "AmaZulu" },
        origins: null,
        organization: null,
        languages: null,
        culture: null,
        historicalRole: null,
        demography: null,
      },
    ]);
  });

  // @req REQ-084
  it("assembles countries entities with explicit null sections", async () => {
    vi.mocked(getCountryById).mockImplementation(async (id: string) =>
      id === "ZWE" ? ZWE : id === "MOZ" ? MOZ : null
    );

    const result = await assembleComparison({
      entityType: "countries",
      ids: ["ZWE", "MOZ"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entityType).toBe("countries");
    expect(result.entities).toEqual([
      {
        type: "pays",
        id: "ZWE",
        label: "Zimbabwe",
        historicalNames: { previous: ["Rhodesia"] },
        kingdoms: null,
        majorPeoples: null,
        culture: { summary: "..." },
        historicalFacts: null,
        demographics: null,
      },
      {
        type: "pays",
        id: "MOZ",
        label: "Mozambique",
        historicalNames: null,
        kingdoms: null,
        majorPeoples: null,
        culture: null,
        historicalFacts: null,
        demographics: null,
      },
    ]);
  });

  // @req REQ-084
  it("assembles language-families entities with explicit null sections", async () => {
    vi.mocked(getLanguageFamilyById).mockImplementation(async (id: string) =>
      id === "FLG_BANTU" ? FLG_BANTU : id === "FLG_NILOTIC" ? FLG_NILOTIC : null
    );

    const result = await assembleComparison({
      entityType: "language-families",
      ids: ["FLG_BANTU", "FLG_NILOTIC"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entityType).toBe("language-families");
    expect(result.entities).toEqual([
      {
        type: "famille",
        id: "FLG_BANTU",
        label: "Bantou",
        decolonialHeader: { note: "..." },
        generalInfo: { numberOfLanguages: 500 },
        associatedPeoples: null,
        linguisticCharacteristics: null,
        historyAndOrigins: null,
        distribution: null,
      },
      {
        type: "famille",
        id: "FLG_NILOTIC",
        label: "Nilotique",
        decolonialHeader: null,
        generalInfo: null,
        associatedPeoples: null,
        linguisticCharacteristics: null,
        historyAndOrigins: null,
        distribution: null,
      },
    ]);
  });

  // @req REQ-084
  it("surfaces the missing id when one entity is unknown", async () => {
    vi.mocked(getPeopleById).mockImplementation(async (id: string) =>
      id === "PPL_SHONA" ? SHONA : null
    );

    const result = await assembleComparison({
      entityType: "peoples",
      ids: ["PPL_SHONA", "PPL_UNKNOWN"],
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.code).toBe("NOT_FOUND");
      expect(result.message).toContain("PPL_UNKNOWN");
    }
  });

  // @req REQ-084
  it("stops at the first missing id without calling the service for the rest", async () => {
    vi.mocked(getPeopleById).mockImplementation(async (id: string) =>
      id === "PPL_UNKNOWN" ? null : SHONA
    );

    const result = await assembleComparison({
      entityType: "peoples",
      ids: ["PPL_UNKNOWN", "PPL_SHONA"],
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.message).toContain("PPL_UNKNOWN");
    }
  });
});
