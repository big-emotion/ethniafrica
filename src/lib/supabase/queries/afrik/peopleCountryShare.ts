import type {
  CountryDistribution,
  GlobalDemographySection,
} from "@/types/afrik";

export interface ProvenancedValue<T> {
  value: T | null;
  provenance: "declared" | "derived" | "missing";
  from?: string[];
}

export interface PeopleCountryShare {
  country: CountryDistribution["country"];
  share: ProvenancedValue<number>;
}

export interface PopulationTotalDiscrepancy {
  declaredTotal: number;
  summedTotal: number;
  relativeDifferencePercent: number;
}

export interface PeopleCountryShareResult {
  shares: PeopleCountryShare[];
  discrepancy: ProvenancedValue<PopulationTotalDiscrepancy>;
}

const DISTRIBUTION_PATH = "content.demography.distributionByCountry";
const TOTAL_PATH = "content.demography.totalPopulation";

function isValidPopulation(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Derive missing shares from valid country rows, independently of the declared total. */
// @req REQ-155
export function derivePeopleCountryShares(
  demography: Pick<
    GlobalDemographySection,
    "totalPopulation" | "distributionByCountry"
  >
): PeopleCountryShareResult {
  const rows = demography.distributionByCountry ?? [];
  const summedTotal = rows.reduce(
    (sum, row) =>
      sum + (isValidPopulation(row.population) ? row.population : 0),
    0
  );

  const shares = rows.map((row): PeopleCountryShare => {
    if (typeof row.percentage === "number" && Number.isFinite(row.percentage)) {
      return {
        country: row.country,
        share: { value: row.percentage, provenance: "declared" },
      };
    }
    if (isValidPopulation(row.population) && summedTotal > 0) {
      return {
        country: row.country,
        share: {
          value: roundOneDecimal((row.population / summedTotal) * 100),
          provenance: "derived",
          from: [DISTRIBUTION_PATH],
        },
      };
    }
    return {
      country: row.country,
      share: { value: null, provenance: "missing" },
    };
  });

  const declaredTotal = demography.totalPopulation;
  if (
    !isValidPopulation(declaredTotal) ||
    declaredTotal === 0 ||
    summedTotal === 0
  ) {
    return {
      shares,
      discrepancy: { value: null, provenance: "missing" },
    };
  }

  const relativeDifferencePercent =
    (Math.abs(summedTotal - declaredTotal) / declaredTotal) * 100;
  return {
    shares,
    discrepancy: {
      value:
        relativeDifferencePercent > 10
          ? {
              declaredTotal,
              summedTotal,
              relativeDifferencePercent: roundOneDecimal(
                relativeDifferencePercent
              ),
            }
          : null,
      provenance: "derived",
      from: [TOTAL_PATH, DISTRIBUTION_PATH],
    },
  };
}
