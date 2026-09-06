#!/usr/bin/env npx tsx

/**
 * Opens the enrichment tracker for one country.
 *
 * It creates the control surface and states what is unknown: ten workstreams at
 * not_started, empty reference denominators, database synchronization at
 * not_verified, and the generated snapshot computed from the corpus by the same
 * calculator the refresh command uses. It writes no country-specific fact of its
 * own — sourcing those is the editorial work this tracker then organizes.
 *
 * Usage: npx tsx scripts/afrik/initCountryEnrichment.ts <ISO3> [--force]
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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
import {
  buildCountryPeopleLedger,
  mergeCountryPeopleReviews,
  summarizeCountryPeopleReviews,
} from "../lib/countryPeopleReconciliation";
import type { ReconciliationPeopleRecord } from "../lib/countryPeopleReconciliation";
import {
  buildCountryTrackerTemplate,
  normalizeCountryId,
  resolveInitPlan,
} from "../lib/countryEnrichmentTemplate";

const projectRoot = resolve(import.meta.dirname, "../..");
const datasetRoot = join(projectRoot, "dataset/source/afrik");
const defaultTrackerRoot = join(
  projectRoot,
  "docs/editorial/country-enrichment"
);

interface ExistingLedger {
  entries?: { id: string; [key: string]: unknown }[];
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function readOption(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function parisDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function main(): void {
  const countryId = normalizeCountryId(process.argv[2] ?? "");
  if (!countryId) {
    fail(
      "Usage: npx tsx scripts/afrik/initCountryEnrichment.ts <ISO3> [--force] [--tracker-dir <path>]"
    );
  }

  const trackerRoot = readOption("--tracker-dir") ?? defaultTrackerRoot;
  const countryPath = join(datasetRoot, "pays", `${countryId}.json`);
  const trackerPath = join(trackerRoot, `${countryId}.json`);
  const ledgerPath = join(trackerRoot, `${countryId}-peoples.json`);

  const plan = resolveInitPlan({
    countryFicheExists: existsSync(countryPath),
    trackerExists: existsSync(trackerPath),
    force: process.argv.includes("--force"),
  });
  if (plan.action === "refuse")
    fail(`Refusing to initialize ${countryId}: ${plan.reason}`);

  const country =
    readJson<CountryEnrichmentMetricInput["country"]>(countryPath);
  const allPeoples = readPeopleFiches<
    CountryEnrichmentMetricInput["linkedPeoples"][number] &
      ReconciliationPeopleRecord
  >(datasetRoot);
  const linkedPeoples = allPeoples.filter((people) =>
    peopleReferencesCountry(people, countryId)
  );

  const generatedLedger = buildCountryPeopleLedger({
    countryId,
    country,
    peoples: linkedPeoples,
  });
  const existingEntries = existsSync(ledgerPath)
    ? (readJson<ExistingLedger>(ledgerPath).entries ?? [])
    : [];
  const ledgerEntries = mergeCountryPeopleReviews(
    generatedLedger.entries,
    existingEntries
  );
  const peopleReview = summarizeCountryPeopleReviews(ledgerEntries);
  const snapshot = buildCountryEnrichmentMetrics({
    countryId,
    country,
    linkedPeoples,
    languageDossierIds: readLanguageDossierIds(datasetRoot),
    patronyms:
      readPatronymFiches<CountryEnrichmentMetricInput["patronyms"][number]>(
        datasetRoot
      ),
    // Initialization sources no denominator: an unsourced count would be read
    // as a measurement, and a coverage figure would rest on it.
    references: {},
    peopleReview,
  });
  const updatedAt = parisDate();

  mkdirSync(trackerRoot, { recursive: true });
  writeFileSync(
    trackerPath,
    `${JSON.stringify(
      buildCountryTrackerTemplate({
        countryId,
        countryName: country.nameFr ?? null,
        updatedAt,
        snapshot,
      }),
      null,
      2
    )}\n`
  );
  writeFileSync(
    ledgerPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        countryId,
        countryName: country.nameFr ?? null,
        updatedAt,
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
          ...generatedLedger.summary,
          editorialReview: peopleReview,
        },
        sharedIsoCodeClusters: generatedLedger.sharedIsoCodeClusters,
        entries: ledgerEntries,
      },
      null,
      2
    )}\n`
  );

  console.log(
    `${plan.action === "overwrite" ? "Overwrote" : "Created"} ${trackerPath}`
  );
  console.log(`Wrote ${ledgerPath}`);
  console.log(
    `Next: source the reference denominators, then run\n  npx tsx scripts/afrik/updateCountryEnrichmentTracker.ts ${countryId} --write`
  );
}

main();
