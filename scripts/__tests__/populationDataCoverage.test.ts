import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const countriesDirectory = join(root, "dataset/source/afrik/pays");
const peoplesDirectory = join(root, "dataset/source/afrik/peuples");

interface PopulationRow {
  id_pays: string;
  population_totale: string;
  source: string;
  source_url: string;
  annee: string;
}

interface SourceEntry {
  url?: string | null;
  tier?: string;
}

interface CountryFiche {
  id: string;
  content: {
    sources?: SourceEntry[];
    demographics?: {
      totalPopulation?: number;
      referenceYear?: number;
      source?: string;
    };
  };
}

interface PeopleFiche {
  id: string;
  content: {
    demography?: {
      distributionByCountry?: Array<{
        country: string;
        population?: number | null;
      }>;
    };
  };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("AFRIK population coverage", () => {
  // The national total is country-level provenance, not the sum of whatever
  // people headcounts happen to be available. Every country fiche must carry
  // the official value already maintained in the canonical UNFPA CSV.
  // @req REQ-033
  it("carries the canonical national total and source in every country fiche", () => {
    const populationRows = parse(
      readFileSync(join(root, "public/pays_demographie.csv"), "utf8"),
      { columns: true, skip_empty_lines: true }
    ) as PopulationRow[];
    const byCountry = new Map(populationRows.map((row) => [row.id_pays, row]));
    const failures: string[] = [];

    for (const filename of readdirSync(countriesDirectory).filter((name) =>
      name.endsWith(".json")
    )) {
      const country = readJson<CountryFiche>(
        join(countriesDirectory, filename)
      );
      const expected = byCountry.get(country.id);
      const demographics = country.content.demographics;
      const hasOfficialSource = country.content.sources?.some(
        (source) =>
          source.url === expected?.source_url && source.tier === "official"
      );

      if (
        !expected ||
        demographics?.totalPopulation !== Number(expected.population_totale) ||
        demographics.referenceYear !== Number(expected.annee) ||
        demographics.source !== expected.source ||
        !hasOfficialSource
      ) {
        failures.push(country.id);
      }
    }

    expect(failures).toEqual([]);
  });

  // AFRIK uses null for an unknown number. A literal zero asserts that a
  // documented people has no residents in a country, which is a different and
  // much stronger claim.
  // @req REQ-033
  it("never encodes an unknown people-country population as zero", () => {
    const failures: string[] = [];
    const filenames = readdirSync(peoplesDirectory, { recursive: true }).filter(
      (name): name is string =>
        typeof name === "string" && name.endsWith(".json")
    );

    for (const filename of filenames) {
      const people = readJson<PeopleFiche>(join(peoplesDirectory, filename));
      for (const distribution of people.content.demography
        ?.distributionByCountry ?? []) {
        if (distribution.population === 0) {
          failures.push(`${people.id}:${distribution.country}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
