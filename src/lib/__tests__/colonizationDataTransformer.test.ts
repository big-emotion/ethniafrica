import { describe, it, expect } from "vitest";

import {
  transformColonizationModuleData,
  type RawColonizationModuleData,
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
