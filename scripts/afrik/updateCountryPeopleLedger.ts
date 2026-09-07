#!/usr/bin/env npx tsx

import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { readJson, readPeopleFiches } from "../lib/afrikCorpusFiles";
import {
  buildCountryPeopleLedger,
  mergeCountryPeopleReviews,
  summarizeCountryPeopleReviews,
} from "../lib/countryPeopleReconciliation";
import type { ReconciliationPeopleRecord } from "../lib/countryPeopleReconciliation";
import { peopleReferencesCountry } from "../lib/countryEnrichmentMetrics";

const projectRoot = resolve(import.meta.dirname, "../..");
const datasetRoot = join(projectRoot, "dataset/source/afrik");
const trackerRoot = join(projectRoot, "docs/editorial/country-enrichment");

interface ExistingLedger {
  entries?: { id: string; [key: string]: unknown }[];
}

interface CountryRecord {
  nameFr?: string;
  content?: {
    majorPeoples?: { peopleId?: string; languageFamily?: string }[];
    demographics?: { peoples?: { peopleId?: string }[] };
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
      "Usage: npx tsx scripts/afrik/updateCountryPeopleLedger.ts <ISO3> [--write]"
    );
  }

  const countryPath = join(datasetRoot, "pays", `${countryId}.json`);
  if (!existsSync(countryPath)) fail(`Country fiche not found: ${countryPath}`);

  const ledgerPath = join(trackerRoot, `${countryId}-peoples.json`);
  const country = readJson<CountryRecord>(countryPath);
  const peoples = readPeopleFiches<ReconciliationPeopleRecord>(
    datasetRoot
  ).filter((people) => peopleReferencesCountry(people, countryId));
  const generated = buildCountryPeopleLedger({
    countryId,
    country,
    peoples,
  });
  const existingEntries = existsSync(ledgerPath)
    ? (readJson<ExistingLedger>(ledgerPath).entries ?? [])
    : [];
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const entries = mergeCountryPeopleReviews(generated.entries, existingEntries);
  const ledger = {
    schemaVersion: 1,
    countryId,
    countryName: country.nameFr ?? null,
    updatedAt: today,
    purpose:
      "Record-level reconciliation of local people-country links. Automated flags are review prompts, not editorial conclusions.",
    regeneration: {
      command: `npx tsx scripts/afrik/updateCountryPeopleLedger.ts ${countryId} --write`,
      preservedFields: ["entries[].review"],
    },
    reviewVocabulary: {
      status: ["pending", "in_review", "resolved"],
      entityType: [
        "unknown",
        "people",
        "subgroup",
        "language_label",
        "macro_category",
        "duplicate",
        "rejected_link",
      ],
    },
    summary: {
      ...generated.summary,
      editorialReview: summarizeCountryPeopleReviews(entries),
    },
    sharedIsoCodeClusters: generated.sharedIsoCodeClusters,
    entries,
  };

  if (!shouldWrite) {
    console.log(JSON.stringify(ledger, null, 2));
    return;
  }

  writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`Updated ${ledgerPath}`);
}

main();
