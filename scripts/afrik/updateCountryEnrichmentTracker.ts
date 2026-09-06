#!/usr/bin/env npx tsx

import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  readJson,
  readLanguageDossierIds,
  readPatronymFiches,
  readPeopleFiches,
} from "../lib/afrikCorpusFiles";
import {
  buildCountryEnrichmentMetrics,
  peopleReferencesCountry,
} from "../lib/countryEnrichmentMetrics";
import type { CountryEnrichmentMetricInput } from "../lib/countryEnrichmentMetrics";

const projectRoot = resolve(import.meta.dirname, "../..");
const datasetRoot = join(projectRoot, "dataset/source/afrik");
const trackerRoot = join(projectRoot, "docs/editorial/country-enrichment");

interface TrackerReference {
  count: number;
}

interface CountryTracker {
  countryId: string;
  updatedAt: string;
  references: {
    peopleGroups?: TrackerReference;
    languages?: TrackerReference;
    patronyms?: TrackerReference;
  };
  snapshot: unknown;
  [key: string]: unknown;
}

interface CountryPeopleLedger {
  summary?: {
    editorialReview?: NonNullable<CountryEnrichmentMetricInput["peopleReview"]>;
  };
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function main(): void {
  const countryId = (process.argv[2] ?? "").trim().toUpperCase();
  const shouldWrite = process.argv.includes("--write");

  if (!/^[A-Z]{3}$/.test(countryId)) {
    fail(
      "Usage: npx tsx scripts/afrik/updateCountryEnrichmentTracker.ts <ISO3> [--write]"
    );
  }

  const countryPath = join(datasetRoot, "pays", `${countryId}.json`);
  const trackerPath = join(trackerRoot, `${countryId}.json`);
  const peopleLedgerPath = join(trackerRoot, `${countryId}-peoples.json`);
  if (!existsSync(countryPath)) fail(`Country fiche not found: ${countryPath}`);
  if (!existsSync(trackerPath))
    fail(`Country tracker not found: ${trackerPath}`);

  const tracker = readJson<CountryTracker>(trackerPath);
  if (tracker.countryId !== countryId) {
    fail(`Tracker countryId ${tracker.countryId} does not match ${countryId}`);
  }

  const linkedPeoples = readPeopleFiches<
    CountryEnrichmentMetricInput["linkedPeoples"][number]
  >(datasetRoot).filter((people) => peopleReferencesCountry(people, countryId));
  const languageDossierIds = readLanguageDossierIds(datasetRoot);
  const patronyms =
    readPatronymFiches<CountryEnrichmentMetricInput["patronyms"][number]>(
      datasetRoot
    );
  const peopleReview = existsSync(peopleLedgerPath)
    ? (readJson<CountryPeopleLedger>(peopleLedgerPath).summary
        ?.editorialReview ?? null)
    : null;

  const snapshot = buildCountryEnrichmentMetrics({
    countryId,
    country: readJson<CountryEnrichmentMetricInput["country"]>(countryPath),
    linkedPeoples,
    languageDossierIds,
    patronyms,
    references: {
      peopleGroups: tracker.references.peopleGroups?.count,
      languages: tracker.references.languages?.count,
      patronymQuota: tracker.references.patronyms?.count,
    },
    peopleReview,
  });

  if (!shouldWrite) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const updatedTracker: CountryTracker = {
    ...tracker,
    updatedAt: today,
    snapshot,
  };
  writeFileSync(trackerPath, `${JSON.stringify(updatedTracker, null, 2)}\n`);
  console.log(`Updated ${trackerPath}`);
}

main();
