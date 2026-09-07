#!/usr/bin/env npx tsx

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { buildGlottologCountryInventory } from "../lib/glottologCountryInventory";

const VERSION = "5.3";
const RELEASE_TAG = "v5.3";
const SOURCE_COMMIT = "072ca0d0410039fb8b779be8fc165bac575d2cda";
const SOURCE_URL = `https://raw.githubusercontent.com/glottolog/glottolog-cldf/${RELEASE_TAG}/cldf/languages.csv`;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function currentDateInParis(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function main(): Promise<void> {
  const positionalArgs = process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith("--"));
  const [countryId, glottologCountryCode] = positionalArgs;
  const shouldWrite = process.argv.includes("--write");

  if (!countryId || !/^[A-Z]{3}$/.test(countryId)) {
    fail("countryId must be an ISO 3166-1 alpha-3 code.");
  }
  if (!glottologCountryCode || !/^[A-Z]{2}$/.test(glottologCountryCode)) {
    fail("glottologCountryCode must be an ISO 3166-1 alpha-2 code.");
  }

  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    fail(`Unable to download pinned Glottolog data: HTTP ${response.status}.`);
  }

  const inventory = buildGlottologCountryInventory(await response.text(), {
    countryId,
    glottologCountryCode,
    version: VERSION,
    releaseTag: RELEASE_TAG,
    sourceCommit: SOURCE_COMMIT,
    sourceUrl: SOURCE_URL,
    accessedAt: currentDateInParis(),
  });
  const serialized = `${JSON.stringify(inventory, null, 2)}\n`;

  if (!shouldWrite) {
    console.log(serialized);
    return;
  }

  const projectRoot = resolve(import.meta.dirname, "../..");
  const outputPath = join(
    projectRoot,
    "docs/editorial/country-enrichment/sources",
    `${countryId}-glottolog-${VERSION}.json`
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serialized);
  console.log(`Updated ${outputPath}`);
}

void main();
