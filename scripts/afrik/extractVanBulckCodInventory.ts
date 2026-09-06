#!/usr/bin/env npx tsx

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import { peopleReferencesCountry } from "../lib/countryEnrichmentMetrics";
import {
  extractVanBulckListFour,
  matchHistoricalInventoryToPeoples,
} from "../lib/vanBulckInventory";
import type { LocalPeopleIdentity } from "../lib/vanBulckInventory";

const COUNTRY_ID = "COD";
const PDF_FIRST_PAGE = 134;
const PDF_LAST_PAGE = 139;
const FIRST_PRINTED_PAGE = 131;
const SOURCE_URL =
  "https://kaowarsom.be/documents/MEMOIRES_VERHANDELINGEN/Sciences_morales_politique/Hum.Sc.%28IRCB%29_T.XXVIII%2C2_VAN%20BULCK%20R.%20P.%20G._Orthographie%20des%20noms%20ethniques%20au%20Congo%20Belge_1954.pdf";

const projectRoot = resolve(import.meta.dirname, "../..");
const peopleRoot = join(projectRoot, "dataset/source/afrik/peuples");
const outputPath = join(
  projectRoot,
  "docs/editorial/country-enrichment/sources/COD-van-bulck-1954.json"
);

interface PeopleFile {
  id?: string;
  nameMain?: string;
  currentCountries?: string[];
  content?: {
    appellations?: LocalPeopleIdentity["appellations"] & {
      currentCountries?: string[];
    };
    demography?: {
      distributionByCountry?: { country?: string }[];
    };
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function jsonFilesRecursively(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return jsonFilesRecursively(entryPath);
    return entry.isFile() && entry.name.endsWith(".json") ? [entryPath] : [];
  });
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function main(): void {
  const pdfPath = process.argv[2] ? resolve(process.argv[2]) : "";
  const shouldWrite = process.argv.includes("--write");
  if (!pdfPath || !existsSync(pdfPath)) {
    fail(
      "Usage: npx tsx scripts/afrik/extractVanBulckCodInventory.ts <pdf-path> [--write]"
    );
  }

  let extractedText: string;
  try {
    extractedText = execFileSync(
      "pdftotext",
      [
        "-f",
        String(PDF_FIRST_PAGE),
        "-l",
        String(PDF_LAST_PAGE),
        "-layout",
        pdfPath,
        "-",
      ],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
    );
  } catch {
    fail("Unable to extract the expected pages with pdftotext.");
  }

  const sourceEntries = extractVanBulckListFour(extractedText, {
    firstPrintedPage: FIRST_PRINTED_PAGE,
  });
  const linkedPeoples = jsonFilesRecursively(peopleRoot)
    .filter(
      (filePath) =>
        basename(filePath).startsWith("PPL_") && !filePath.includes("/V1/")
    )
    .map((filePath) => readJson<PeopleFile>(filePath))
    .filter(
      (people): people is PeopleFile & { id: string } =>
        Boolean(people.id) && peopleReferencesCountry(people, COUNTRY_ID)
    )
    .map((people) => ({
      id: people.id,
      nameMain: people.nameMain,
      appellations: people.content?.appellations,
    }));
  const reconciliation = matchHistoricalInventoryToPeoples(
    sourceEntries,
    linkedPeoples
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const output = {
    schemaVersion: 1,
    countryId: COUNTRY_ID,
    updatedAt: today,
    source: {
      title:
        "Orthographie des noms ethniques au Congo belge, suivie de la nomenclature des principales tribus et langues du Congo belge",
      author: "Gaston van Bulck",
      year: 1954,
      publisher: "Institut royal colonial belge",
      archive: "Royal Academy for Overseas Sciences",
      url: SOURCE_URL,
      accessedAt: today,
      extractedSection: "List IV — practical list of ethnic names",
      printedPages: { first: 131, last: 136 },
      pdfPages: { first: PDF_FIRST_PAGE, last: PDF_LAST_PAGE },
    },
    methodology: {
      scope:
        "Historical names for peoples, tribes, and subtribes recorded within the colonial Belgian Congo nomenclature.",
      matching:
        "Exact normalized matching against local main names, self-appellations, exonyms, and spelling aliases only.",
      caveats: [
        "The source uses colonial categories and terminology and is not a contemporary self-identification authority.",
        "The author states that parts of the territory relied on second-hand documentation and required later correction.",
        "A name match does not prove that two records represent the same contemporary people.",
        "Unmatched entries are research leads, not automatically missing people fiches.",
      ],
    },
    localCorpus: {
      linkedPeopleFiches: linkedPeoples.length,
    },
    summary: reconciliation.summary,
    localExactNameComparison: {
      matchedPeopleIds: reconciliation.matchedLocalPeopleIds,
      unmatchedPeopleIds: linkedPeoples
        .map((people) => people.id)
        .filter(
          (peopleId) => !reconciliation.matchedLocalPeopleIds.includes(peopleId)
        )
        .sort(),
      caveat:
        "This is an exact-name comparison, not historical coverage or proof of identity.",
    },
    entries: reconciliation.entries,
  };

  if (!shouldWrite) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Updated ${outputPath}`);
}

main();
