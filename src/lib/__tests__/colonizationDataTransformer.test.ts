import { describe, it, expect } from "vitest";

import {
  transformColonizationModuleData,
  type RawColonizationModuleData,
  type RawColonizationTimelineEvent,
} from "../colonizationDataTransformer";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";

const eweFragmentation: PeopleFragmentation = {
  peopleId: "PPL_EWE",
  autonym: "Eʋe",
  exonym: "Ewe",
  countryCount: 2,
  countries: [
    {
      iso3: "GHA",
      nameFr: "Ghana",
      populationShare: 0.62,
      assertionId: "aaaaaaaa-1111-1111-1111-111111111111",
    },
    { iso3: "TGO", nameFr: "Togo", populationShare: 0.38, assertionId: null },
  ],
  borderPairs: [{ a: "GHA", b: "TGO" }],
};

const undocumentedFragmentation: PeopleFragmentation = {
  peopleId: "PPL_LONE",
  autonym: null,
  exonym: null,
  countryCount: 2,
  countries: [
    { iso3: "NGA", nameFr: "Nigeria", populationShare: 1, assertionId: null },
  ],
  borderPairs: [],
};

// @req REQ-091 FR90
describe("transformColonizationModuleData (Epic 13, Story 13.9, ETNI-533)", () => {
  // @req REQ-091 FR90
  it("always assembles the doctrine intro pointing at the live heritage-colonial doctrine", () => {
    const result = transformColonizationModuleData({ fragmentations: [] });
    expect(result.doctrine).toEqual({ slug: "heritage-colonial" });
  });

  // @req REQ-091 FR90
  it("builds a fragmentation index entry per people with >= 2 countries", () => {
    const raw: RawColonizationModuleData = {
      fragmentations: [eweFragmentation],
    };
    const result = transformColonizationModuleData(raw);
    expect(result.fragmentation).toEqual([
      { peopleId: "PPL_EWE", fragmentation: eweFragmentation },
    ]);
  });

  // @req REQ-091 FR90
  it("omits the fragmentation section entirely when no input is fragmented", () => {
    const result = transformColonizationModuleData({ fragmentations: [] });
    expect(result.fragmentation).toBeNull();
  });

  // @req REQ-091 FR90
  it("drops a malformed fragmentation record with fewer than 2 countries", () => {
    const raw: RawColonizationModuleData = {
      fragmentations: [undocumentedFragmentation],
    };
    const result = transformColonizationModuleData(raw);
    expect(result.fragmentation).toBeNull();
  });

  // @req REQ-091 FR90
  it("gracefully omits sections with no wired data source yet (13.8/13.10/13.11/13.12)", () => {
    const result = transformColonizationModuleData({ fragmentations: [] });
    expect(result.mapSection).toBeNull();
    expect(result.imposedNames).toBeNull();
    expect(result.displacement).toBeNull();
    expect(result.resistances).toBeNull();
  });

  // @req REQ-091 FR90
  it("collects a source-footer entry per country share that already carries an assertionId", () => {
    const raw: RawColonizationModuleData = {
      fragmentations: [eweFragmentation],
    };
    const result = transformColonizationModuleData(raw);
    expect(result.sources).toEqual([
      {
        peopleId: "PPL_EWE",
        countryIso3: "GHA",
        assertionId: "aaaaaaaa-1111-1111-1111-111111111111",
      },
    ]);
  });

  // @req REQ-091 FR90
  it("omits the sources section when no country share carries an assertionId", () => {
    const raw: RawColonizationModuleData = {
      fragmentations: [
        {
          ...eweFragmentation,
          countries: eweFragmentation.countries.map((c) => ({
            ...c,
            assertionId: null,
          })),
        },
      ],
    };
    const result = transformColonizationModuleData(raw);
    expect(result.sources).toBeNull();
  });

  // @req REQ-091 FR90
  it("never throws on missing or malformed input", () => {
    expect(() =>
      transformColonizationModuleData(
        null as unknown as RawColonizationModuleData
      )
    ).not.toThrow();
    expect(() =>
      transformColonizationModuleData(
        undefined as unknown as RawColonizationModuleData
      )
    ).not.toThrow();
    expect(() =>
      transformColonizationModuleData({
        fragmentations: undefined as unknown as PeopleFragmentation[],
      })
    ).not.toThrow();
  });
});

// @req REQ-101 FR87 FR89
describe("transformColonizationModuleData timeline (Epic 13, Story 13.12, ETNI-536)", () => {
  const resistanceEvent: RawColonizationTimelineEvent = {
    id: "MGR_MAJI_MAJI_REBELLION",
    nameMain: "Rébellion Maji Maji",
    eventType: "resistance",
    classificationStatus: "contested",
    timeRange: { startYear: 1905, endYear: 1907, datingNote: null },
    peoples: [
      { id: "PPL_MATUMBI", nameMain: "Matumbi", role: "resistance" },
      { id: "PPL_NGONI", nameMain: "Ngoni", role: "resistance" },
    ],
    sources: [
      {
        id: "src-2",
        title: "Journal of African History",
        url: "https://example.org/jah",
        tier: "2",
      },
      {
        id: "src-1",
        title: "UNESCO General History of Africa",
        url: "https://example.org/unesco",
        tier: "1",
      },
    ],
  };

  const imposedNameEvent: RawColonizationTimelineEvent = {
    id: "MGR_YORUBA_NAGO_COLONIAL_EXONYM",
    nameMain: "Exonyme colonial « Nago »",
    eventType: "imposed_name",
    classificationStatus: "colonial-legacy",
    timeRange: { startYear: 1850, endYear: 1850, datingNote: null },
    peoples: [{ id: "PPL_YORUBA", nameMain: "Yoruba", role: "affected" }],
    sources: [],
  };

  const nonColonialEvent: RawColonizationTimelineEvent = {
    id: "MGR_BANTU_HOMELAND_DISPERSAL",
    nameMain: "Dispersion bantoue",
    eventType: "expansion",
    classificationStatus: "consensual",
    timeRange: { startYear: -3000, endYear: -1000, datingNote: null },
    peoples: [],
    sources: [],
  };

  const peopleEndonyms: Record<
    string,
    { endonym: string | null; endonymLanguage: string | null }
  > = {
    PPL_MATUMBI: { endonym: "Matumbi", endonymLanguage: "mgw" },
    PPL_NGONI: { endonym: null, endonymLanguage: null },
  };

  // @req REQ-101 FR87
  it("builds a timeline entry per event restricted to the four colonial types", () => {
    const result = transformColonizationModuleData({
      fragmentations: [],
      timelineEvents: [resistanceEvent, imposedNameEvent, nonColonialEvent],
      peopleEndonyms,
    });
    expect(result.timeline).not.toBeNull();
    expect(result.timeline?.map((entry) => entry.id)).toEqual([
      "MGR_YORUBA_NAGO_COLONIAL_EXONYM",
      "MGR_MAJI_MAJI_REBELLION",
    ]);
  });

  // @req REQ-101 FR89
  it("sorts timeline entries chronologically by startYear", () => {
    const result = transformColonizationModuleData({
      fragmentations: [],
      timelineEvents: [resistanceEvent, imposedNameEvent],
      peopleEndonyms,
    });
    expect(result.timeline?.[0].id).toBe("MGR_YORUBA_NAGO_COLONIAL_EXONYM");
    expect(result.timeline?.[1].id).toBe("MGR_MAJI_MAJI_REBELLION");
  });

  // @req REQ-101 FR87
  it("resolves people endonym-first, falling back to null when undocumented", () => {
    const result = transformColonizationModuleData({
      fragmentations: [],
      timelineEvents: [resistanceEvent],
      peopleEndonyms,
    });
    const peoples = result.timeline?.[0].peoples;
    expect(peoples).toEqual([
      {
        id: "PPL_MATUMBI",
        nameMain: "Matumbi",
        endonym: "Matumbi",
        endonymLanguage: "mgw",
      },
      {
        id: "PPL_NGONI",
        nameMain: "Ngoni",
        endonym: null,
        endonymLanguage: null,
      },
    ]);
  });

  // @req REQ-101 FR87
  it("prefers a Tier 1 source over Tier 2 as the primary source", () => {
    const result = transformColonizationModuleData({
      fragmentations: [],
      timelineEvents: [resistanceEvent],
      peopleEndonyms,
    });
    expect(result.timeline?.[0].primarySource).toEqual({
      title: "UNESCO General History of Africa",
      url: "https://example.org/unesco",
    });
  });

  // @req REQ-101 FR87
  it("reports a null primary source when the event has no sources", () => {
    const result = transformColonizationModuleData({
      fragmentations: [],
      timelineEvents: [imposedNameEvent],
      peopleEndonyms,
    });
    expect(result.timeline?.[0].primarySource).toBeNull();
  });

  // @req REQ-101 FR87
  it("computes timeline bounds spanning every included event", () => {
    const result = transformColonizationModuleData({
      fragmentations: [],
      timelineEvents: [resistanceEvent, imposedNameEvent],
      peopleEndonyms,
    });
    expect(result.timelineBounds).toEqual({ min: 1850, max: 1907 });
  });

  // @req REQ-101 FR87
  it("omits the timeline and its bounds when no colonial-type event survives", () => {
    const result = transformColonizationModuleData({
      fragmentations: [],
      timelineEvents: [nonColonialEvent],
      peopleEndonyms,
    });
    expect(result.timeline).toBeNull();
    expect(result.timelineBounds).toBeNull();
  });

  // @req REQ-101 FR87
  it("omits the timeline when timelineEvents is absent", () => {
    const result = transformColonizationModuleData({ fragmentations: [] });
    expect(result.timeline).toBeNull();
    expect(result.timelineBounds).toBeNull();
  });

  // @req REQ-101 FR87
  it("never throws on malformed timeline input", () => {
    expect(() =>
      transformColonizationModuleData({
        fragmentations: [],
        timelineEvents: undefined as unknown as RawColonizationTimelineEvent[],
      })
    ).not.toThrow();
    expect(() =>
      transformColonizationModuleData({
        fragmentations: [],
        timelineEvents: [{} as RawColonizationTimelineEvent],
      })
    ).not.toThrow();
  });
});
