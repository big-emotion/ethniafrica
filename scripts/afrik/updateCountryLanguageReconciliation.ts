#!/usr/bin/env npx tsx

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

import { buildCountryLanguageReconciliation } from "../lib/countryLanguageReconciliation";

interface CountryTracker {
  references?: {
    languages?: {
      artifact?: string;
    };
  };
}

interface ReferenceInventory {
  entries: {
    glottocode: string;
    name: string;
    iso639P3Code: string | null;
    level: string;
  }[];
}

interface PeopleLedger {
  entries: {
    id: string;
    isoCodes: string[];
    review: { entityType: string };
  }[];
}

interface LanguageDossier {
  id: string;
  isoCode639_3?: string;
  glottocode?: string;
  nameFr?: string;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

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

function main(): void {
  const countryId = process.argv[2];
  const shouldWrite = process.argv.includes("--write");
  if (!countryId || !/^[A-Z]{3}$/.test(countryId)) {
    fail(
      "Usage: npx tsx scripts/afrik/updateCountryLanguageReconciliation.ts <ISO3> [--write]"
    );
  }

  const projectRoot = resolve(import.meta.dirname, "../..");
  const trackerPath = join(
    projectRoot,
    "docs/editorial/country-enrichment",
    `${countryId}.json`
  );
  const peopleLedgerPath = join(
    projectRoot,
    "docs/editorial/country-enrichment",
    `${countryId}-peoples.json`
  );
  if (!existsSync(trackerPath) || !existsSync(peopleLedgerPath)) {
    fail(
      `Country enrichment tracker or people ledger not found for ${countryId}.`
    );
  }

  const tracker = readJson<CountryTracker>(trackerPath);
  const referenceArtifact = tracker.references?.languages?.artifact;
  if (!referenceArtifact) {
    fail(`No pinned language reference artifact is declared for ${countryId}.`);
  }
  const referencePath = join(projectRoot, referenceArtifact);
  if (!existsSync(referencePath)) {
    fail(`Pinned language reference artifact not found: ${referenceArtifact}.`);
  }

  const languagesRoot = join(projectRoot, "dataset/source/afrik/langues");
  const languageDossiers = readdirSync(languagesRoot)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) =>
      readJson<LanguageDossier>(join(languagesRoot, fileName))
    );
  const inventory = buildCountryLanguageReconciliation({
    countryId,
    referenceArtifact,
    referenceEntries: readJson<ReferenceInventory>(referencePath).entries,
    languageDossiers,
    peopleEntries: readJson<PeopleLedger>(peopleLedgerPath).entries,
  });
  const output = {
    ...inventory,
    updatedAt: currentDateInParis(),
  };
  const serialized = `${JSON.stringify(output, null, 2)}\n`;

  if (!shouldWrite) {
    console.log(serialized);
    return;
  }

  const outputPath = join(
    projectRoot,
    "docs/editorial/country-enrichment",
    `${countryId}-languages.json`
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serialized);
  console.log(`Updated ${outputPath}`);
}

main();
