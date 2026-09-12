import { describe, expect, it } from "vitest";

import { derivePeopleCountryShares } from "../peopleCountryShare";

describe("derivePeopleCountryShares", () => {
  // @req REQ-155
  it("derives missing shares from the valid distribution population sum", () => {
    const result = derivePeopleCountryShares({
      totalPopulation: 10_500_000,
      distributionByCountry: [
        { country: "BDI", population: 12_200_000 },
        { country: "COD", population: 2_000_000 },
        { country: "TZA", population: 1_865_000 },
        { country: "UGA", population: 1_500_000 },
        { country: "RWA", population: 500_000 },
      ],
    });

    expect(result.shares[0]).toEqual({
      country: "BDI",
      share: {
        value: 67.5,
        provenance: "derived",
        from: ["content.demography.distributionByCountry"],
      },
    });
    expect(result.discrepancy).toEqual({
      value: {
        declaredTotal: 10_500_000,
        summedTotal: 18_065_000,
        relativeDifferencePercent: 72,
      },
      provenance: "derived",
      from: [
        "content.demography.totalPopulation",
        "content.demography.distributionByCountry",
      ],
    });
  });

  // @req REQ-155
  it("preserves a declared percentage rather than replacing it with a calculation", () => {
    const result = derivePeopleCountryShares({
      totalPopulation: 100,
      distributionByCountry: [
        { country: "BDI", population: 60, percentage: 75 },
        { country: "COD", population: 40 },
      ],
    });

    expect(result.shares).toEqual([
      { country: "BDI", share: { value: 75, provenance: "declared" } },
      {
        country: "COD",
        share: {
          value: 40,
          provenance: "derived",
          from: ["content.demography.distributionByCountry"],
        },
      },
    ]);
    expect(result.discrepancy.value).toBeNull();
  });

  // @req REQ-155
  it("ignores invalid populations and marks shares without evidence as missing", () => {
    const result = derivePeopleCountryShares({
      distributionByCountry: [
        { country: "BDI", population: 25 },
        { country: "COD", population: -10 },
        { country: "UGA", population: Number.POSITIVE_INFINITY },
        { country: "RWA" },
      ],
    });

    expect(result.shares[0].share.value).toBe(100);
    expect(result.shares.slice(1).map((row) => row.share)).toEqual([
      { value: null, provenance: "missing" },
      { value: null, provenance: "missing" },
      { value: null, provenance: "missing" },
    ]);
    expect(result.discrepancy).toEqual({ value: null, provenance: "missing" });
  });

  // @req REQ-155
  it("reports total disagreement only above ten percent", () => {
    const atThreshold = derivePeopleCountryShares({
      totalPopulation: 100,
      distributionByCountry: [{ country: "BDI", population: 110 }],
    });
    const aboveThreshold = derivePeopleCountryShares({
      totalPopulation: 100,
      distributionByCountry: [{ country: "BDI", population: 111 }],
    });

    expect(atThreshold.discrepancy.value).toBeNull();
    expect(aboveThreshold.discrepancy.value).toEqual({
      declaredTotal: 100,
      summedTotal: 111,
      relativeDifferencePercent: 11,
    });
  });
});
