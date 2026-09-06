#!/usr/bin/env npx tsx

import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { readPatronymFiches } from "../lib/afrikCorpusFiles";
import { buildCountryPatronymLedger } from "../lib/countryPatronymLedger";

const projectRoot = resolve(import.meta.dirname, "../..");
const datasetRoot = join(projectRoot, "dataset/source/afrik");
const trackerRoot = join(projectRoot, "docs/editorial/country-enrichment");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function main(): void {
  const countryId = (process.argv[2] ?? "").trim().toUpperCase();
  const shouldWrite = process.argv.includes("--write");
  if (!/^[A-Z]{3}$/.test(countryId)) {
    fail(
      "Usage: npx tsx scripts/afrik/updateCountryPatronymLedger.ts <ISO3> [--write]"
    );
  }

  const updatedAt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const ledger = buildCountryPatronymLedger({
    countryId,
    updatedAt,
    dossiers: readPatronymFiches(datasetRoot),
  });

  if (!shouldWrite) {
    console.log(JSON.stringify(ledger, null, 2));
    return;
  }

  const outputPath = join(trackerRoot, `${countryId}-names.json`);
  writeFileSync(outputPath, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`Updated ${outputPath}`);
}

main();
