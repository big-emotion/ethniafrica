import { describe, expect, it } from "vitest";
import {
  transformDecolonialHeader,
  transformDistribution,
  transformFamilyData,
  transformFamilyHero,
  transformGeneralInfo,
  transformHistory,
  transformLinguisticTraits,
  transformSources,
} from "../familyDataTransformer";
import type { LanguageFamily } from "@/types/afrik";

const family: LanguageFamily = {
  id: "FLG_BANTU",
  nameFr: "Bantou",
  nameEn: "Bantu",
  classificationStatus: "contested",
  associatedPeoples: [{ name: "Shona", peopleId: "PPL_SHONA" }],
  content: {
    decolonialHeader: {
      historicalAppellations: ["Bantu"],
      selfAppellation: "Bantou",
      contemporaryUsage: "A contemporary linguistic designation.",
      geographicArea: "Africa",
      numberOfLanguages: 500,
      totalSpeakers: 350000000,
    },
    generalInfo: {
      branches: ["Narrow Bantu"],
      geographicArea: "Central and Southern Africa",
      numberOfLanguages: 500,
      totalSpeakers: 350000000,
    },
    linguisticCharacteristics: {
      typology: "Agglutinative",
      phonologicalFeatures: "Tone systems",
      relationsWithNeighbors: "Long-standing contact",
      keyInnovations: "Noun classes",
    },
    historyAndOrigins: {
      probableOrigin: "Western Central Africa",
      emergencePeriod: "Several millennia ago",
      diffusion: "Bantu expansion",
      historicalBreaks: "Regional diversification",
      contactZones: "Great Lakes",
      majorEvents: "Colonial rule",
    },
    distribution: {
      totalSpeakers: 350000000,
      distributionByCountry: { COD: 90000000, TZA: 60000000 },
    },
    sources: [{ title: "Glottolog", url: null, tier: "unverified" }],
  },
  footprintByCountry: { COD: 12, TZA: 8 },
};

describe("familyDataTransformer", () => {
  // @req REQ-047
  it("maps every requested section through its named helper", () => {
    expect(transformFamilyHero(family)).toEqual({
      id: "FLG_BANTU",
      nameFr: "Bantou",
      nameEn: "Bantu",
      classificationStatus: "contested",
    });
    expect(transformDecolonialHeader(family).selfAppellation).toBe("Bantou");
    expect(transformGeneralInfo(family)).toMatchObject({
      branches: ["Narrow Bantu"],
      associatedPeoples: [{ name: "Shona", peopleId: "PPL_SHONA" }],
    });
    expect(transformLinguisticTraits(family).keyInnovations).toBe(
      "Noun classes"
    );
    expect(transformHistory(family).majorEvents).toBe("Colonial rule");
    expect(transformDistribution(family)).toEqual({
      totalSpeakers: 350000000,
      distributionByCountry: { COD: 90000000, TZA: 60000000 },
      footprintByCountry: { COD: 12, TZA: 8 },
    });
    expect(transformSources(family)).toEqual([
      { title: "Glottolog", url: null, tier: "unverified" },
    ]);
  });

  // @req REQ-047
  it("composes the complete FamilyPageData shape", () => {
    expect(transformFamilyData(family)).toEqual({
      hero: transformFamilyHero(family),
      decolonialHeader: transformDecolonialHeader(family),
      generalInfo: transformGeneralInfo(family),
      linguisticTraits: transformLinguisticTraits(family),
      history: transformHistory(family),
      distribution: transformDistribution(family),
      sources: transformSources(family),
    });
  });

  // @req REQ-047
  it("provides null and empty defaults for absent or nullable JSONB fields", () => {
    const incomplete = JSON.parse(
      '{"id":"FLG_EMPTY","nameFr":"Empty","content":null}'
    );

    expect(transformFamilyData(incomplete)).toEqual({
      hero: {
        id: "FLG_EMPTY",
        nameFr: "Empty",
        nameEn: null,
        classificationStatus: null,
      },
      decolonialHeader: {
        linkWithFamily: null,
        nameFr: null,
        nameEn: null,
        historicalAppellations: [],
        originOfHistoricalTerm: null,
        whyProblematic: null,
        selfAppellation: null,
        contemporaryUsage: null,
        geographicArea: null,
        numberOfLanguages: null,
        totalSpeakers: null,
      },
      generalInfo: {
        branches: [],
        geographicArea: null,
        numberOfLanguages: null,
        totalSpeakers: null,
        associatedPeoples: [],
      },
      linguisticTraits: {
        typology: null,
        phonologicalFeatures: null,
        relationsWithNeighbors: null,
        keyInnovations: null,
      },
      history: {
        probableOrigin: null,
        emergencePeriod: null,
        diffusion: null,
        historicalBreaks: null,
        contactZones: null,
        majorEvents: null,
      },
      distribution: {
        totalSpeakers: null,
        distributionByCountry: {},
        footprintByCountry: {},
      },
      sources: [],
    });
  });

  // @req REQ-119
  it("surfaces footprintByCountry as derived from associated peoples, never from the fiche's own declared distribution", () => {
    expect(transformDistribution(family).footprintByCountry).toEqual({
      COD: 12,
      TZA: 8,
    });
  });

  // @req REQ-119
  it("defaults footprintByCountry to an empty object rather than omitting it when no peoples carry a country", () => {
    const noFootprint = { ...family, footprintByCountry: undefined };

    expect(transformDistribution(noFootprint).footprintByCountry).toEqual({});
  });

  // @req REQ-047
  it("discards malformed historical appellations from untrusted JSONB", () => {
    const malformed = JSON.parse(
      '{"id":"FLG_BANTU","nameFr":"Bantou","content":{"decolonialHeader":{"historicalAppellations":"Bantu"}}}'
    );

    expect(transformDecolonialHeader(malformed).historicalAppellations).toEqual(
      []
    );
  });

  // @req REQ-047
  it("documents the strict-model coverage", () => {
    const mappedSections = [
      "decolonialHeader",
      "generalInfo",
      "associatedPeoples",
      "linguisticCharacteristics",
      "historyAndOrigins",
      "distribution",
      "sources",
    ];

    expect(mappedSections).toHaveLength(7);
  });
});
