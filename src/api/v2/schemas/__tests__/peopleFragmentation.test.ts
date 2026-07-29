import { describe, it, expect } from "vitest";
import {
  peopleFragmentationParamSchema,
  peopleFragmentationSchema,
  fragmentationCountrySchema,
  type PeopleFragmentation,
} from "../peopleFragmentation";

function validPayload(): PeopleFragmentation {
  return {
    peopleId: "PPL_EWE",
    autonym: "Eʋe",
    exonym: "Ewe",
    countryCount: 2,
    countries: [
      {
        iso3: "GHA",
        nameFr: "Ghana",
        populationShare: 0.62,
        assertionId: "11111111-1111-1111-1111-111111111111",
      },
      {
        iso3: "TGO",
        nameFr: "Togo",
        populationShare: 0.38,
        assertionId: null,
      },
    ],
    borderPairs: [{ a: "GHA", b: "TGO" }],
  };
}

describe("peopleFragmentationParamSchema", () => {
  // @req REQ-091
  it("accepts a well-formed PPL_ id", () => {
    expect(
      peopleFragmentationParamSchema.safeParse({ id: "PPL_EWE" }).success
    ).toBe(true);
  });

  // @req REQ-091
  it("rejects a malformed id", () => {
    expect(
      peopleFragmentationParamSchema.safeParse({ id: "ewe" }).success
    ).toBe(false);
  });
});

describe("fragmentationCountrySchema", () => {
  // @req REQ-091
  it("rejects an entry missing populationShare", () => {
    const { populationShare, ...rest } = {
      iso3: "GHA",
      nameFr: "Ghana",
      populationShare: 0.62,
      assertionId: null,
    };
    expect(fragmentationCountrySchema.safeParse(rest).success).toBe(false);
  });

  // @req REQ-091
  it("rejects an entry missing assertionId", () => {
    const { assertionId, ...rest } = {
      iso3: "GHA",
      nameFr: "Ghana",
      populationShare: 0.62,
      assertionId: null as string | null,
    };
    expect(fragmentationCountrySchema.safeParse(rest).success).toBe(false);
  });

  // @req REQ-091
  it("accepts assertionId: null (present, unknown)", () => {
    expect(
      fragmentationCountrySchema.safeParse({
        iso3: "GHA",
        nameFr: "Ghana",
        populationShare: 0.62,
        assertionId: null,
      }).success
    ).toBe(true);
  });
});

describe("peopleFragmentationSchema", () => {
  // @req REQ-091
  it("validates a well-formed fragmentation payload", () => {
    const result = peopleFragmentationSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  // @req REQ-091
  it("passes when no borderPair carries colonialOrigin (optional/additive)", () => {
    const payload = validPayload();
    expect(payload.borderPairs.every((p) => !("colonialOrigin" in p))).toBe(
      true
    );
    expect(peopleFragmentationSchema.safeParse(payload).success).toBe(true);
  });

  // @req REQ-091
  it("accepts a borderPair with colonialOrigin once the 13.3 dataset lands", () => {
    const payload = validPayload();
    payload.borderPairs = [
      {
        a: "GHA",
        b: "TGO",
        colonialOrigin: { layerId: "west-africa-1900", sourceIds: ["src-1"] },
      },
    ];
    expect(peopleFragmentationSchema.safeParse(payload).success).toBe(true);
  });

  // @req REQ-091
  it("rejects countryCount below 2", () => {
    const payload = { ...validPayload(), countryCount: 1 };
    expect(peopleFragmentationSchema.safeParse(payload).success).toBe(false);
  });
});
