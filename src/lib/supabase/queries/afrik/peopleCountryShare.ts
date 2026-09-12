import type {
  CountryDistribution,
  GlobalDemographySection,
} from "@/types/afrik";
import type { ProvenancedValue } from "./derivedFicheFact";

const DISTRIBUTION_PATH = "content.demography.distributionByCountry";
const TOTAL_PATH = "content.demography.totalPopulation";

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

function isValidPopulation(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Derive each country's share from the distribution rows themselves. The
 * fiche's declared total can describe a different scope, so it is never the
 * denominator; a material disagreement is returned for the caller to show.
 */
// @req REQ-119
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

  const differencePercent =
    (Math.abs(summedTotal - declaredTotal) / declaredTotal) * 100;
  return {
    shares,
    discrepancy: {
      value:
        differencePercent > 10
          ? {
              declaredTotal,
              summedTotal,
              relativeDifferencePercent: roundOneDecimal(differencePercent),
            }
          : null,
      provenance: "derived",
      from: [TOTAL_PATH, DISTRIBUTION_PATH],
    },
  };
}
