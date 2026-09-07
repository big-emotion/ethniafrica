#!/usr/bin/env tsx
/**
 * Gives every `content.kingdoms[]` entry a typed kind, and machine bounds
 * wherever its own label already carries them.
 *
 * This closes the mechanical half of the chronology gap. The editorial half —
 * the entries whose label names an era rather than a date — is deliberately
 * left open: the script prints them as a queue rather than guessing, because a
 * fabricated bound would satisfy the symmetry gate while telling the reader
 * something nobody checked.
 *
 *   npx tsx scripts/afrik/backfillKingdomTimeRange.ts            # report only
 *   npx tsx scripts/afrik/backfillKingdomTimeRange.ts --write    # apply
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  classifyKingdomEntry,
  parseKingdomPeriod,
  type KingdomEntryType,
  type KingdomTimeRange,
} from "./parseKingdomPeriod";

interface KingdomEntry {
  name?: string;
  period?: string;
  entryType?: KingdomEntryType;
  timeRange?: KingdomTimeRange;
  [key: string]: unknown;
}

interface CountryFiche {
  id?: string;
  content?: { kingdoms?: unknown; [key: string]: unknown };
  [key: string]: unknown;
}

export interface CountryBackfillReport {
  countryId: string;
  typed: number;
  dated: number;
  undated: { name: string; period: string }[];
}

export interface KingdomBackfillSummary {
  filesScanned: number;
  filesChanged: number;
  entriesTotal: number;
  datedByParser: number;
  alreadyDated: number;
  pending: { countryId: string; name: string; period: string }[];
  /**
   * Everything the pass took out of the "Royaumes" section. Printed on a dry
   * run so a misclassification is caught by a reader before it hides an African
   * polity, rather than after.
   */
  reclassified: {
    countryId: string;
    name: string;
    entryType: KingdomEntryType;
  }[];
}

/**
 * The model's own field order, so a backfilled entry reads the way a
 * hand-written one does. Anything not listed keeps its place at the end.
 */
const FIELD_ORDER = [
  "name",
  "period",
  "entryType",
  "timeRange",
  "dominantPeoples",
  "politicalCenters",
  "historicalRole",
];

function inModelOrder(entry: KingdomEntry): KingdomEntry {
  const ordered: KingdomEntry = {};
  for (const key of FIELD_ORDER) {
    if (key in entry) ordered[key] = entry[key];
  }
  for (const key of Object.keys(entry)) {
    if (!(key in ordered)) ordered[key] = entry[key];
  }
  return ordered;
}

export function backfillCountryKingdoms(fiche: CountryFiche): {
  fiche: CountryFiche;
  report: CountryBackfillReport;
  changed: boolean;
} {
  const countryId = typeof fiche.id === "string" ? fiche.id : "??";
  const kingdoms = fiche.content?.kingdoms;
  const report: CountryBackfillReport = {
    countryId,
    typed: 0,
    dated: 0,
    undated: [],
  };
  if (!Array.isArray(kingdoms)) return { fiche, report, changed: false };

  let changed = false;
  const next = kingdoms.map((raw) => {
    const entry = { ...(raw as KingdomEntry) };
    const name = typeof entry.name === "string" ? entry.name : "";
    const period = typeof entry.period === "string" ? entry.period : "";

    if (!entry.entryType) {
      entry.entryType = classifyKingdomEntry(name);
      report.typed += 1;
      changed = true;
    }

    if (entry.timeRange) {
      report.dated += 1;
      return inModelOrder(entry);
    }

    const parsed = parseKingdomPeriod(period);
    if (parsed) {
      entry.timeRange = parsed;
      report.dated += 1;
      changed = true;
    } else {
      report.undated.push({ name, period });
    }
    return inModelOrder(entry);
  });

  if (!changed) return { fiche, report, changed: false };
  return {
    fiche: { ...fiche, content: { ...fiche.content, kingdoms: next } },
    report,
    changed: true,
  };
}

export function runKingdomBackfill(options: {
  datasetRoot: string;
  write: boolean;
}): KingdomBackfillSummary {
  const paysDir = path.join(options.datasetRoot, "pays");
  const files = readdirSync(paysDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const summary: KingdomBackfillSummary = {
    filesScanned: 0,
    filesChanged: 0,
    entriesTotal: 0,
    datedByParser: 0,
    alreadyDated: 0,
    pending: [],
    reclassified: [],
  };

  for (const file of files) {
    const full = path.join(paysDir, file);
    const original = readFileSync(full, "utf8");
    const fiche = JSON.parse(original) as CountryFiche;
    const before = Array.isArray(fiche.content?.kingdoms)
      ? (fiche.content.kingdoms as KingdomEntry[])
      : [];
    const alreadyDated = before.filter((e) => e?.timeRange).length;

    const { fiche: next, report, changed } = backfillCountryKingdoms(fiche);

    summary.filesScanned += 1;
    summary.entriesTotal += before.length;
    summary.alreadyDated += alreadyDated;
    summary.datedByParser += report.dated - alreadyDated;
    for (const entry of report.undated) {
      summary.pending.push({ countryId: report.countryId, ...entry });
    }
    const typed = Array.isArray(next.content?.kingdoms)
      ? (next.content.kingdoms as KingdomEntry[])
      : [];
    for (const entry of typed) {
      if (entry.entryType === "polity" || !entry.entryType) continue;
      summary.reclassified.push({
        countryId: report.countryId,
        name: typeof entry.name === "string" ? entry.name : "",
        entryType: entry.entryType,
      });
    }
    if (!changed) continue;
    summary.filesChanged += 1;
    if (options.write) {
      writeFileSync(full, JSON.stringify(next, null, 2) + "\n", "utf8");
    }
  }

  return summary;
}

function main(): void {
  const write = process.argv.includes("--write");
  const datasetRoot = path.join(process.cwd(), "dataset", "source", "afrik");
  const summary = runKingdomBackfill({ datasetRoot, write });

  const byCountry = new Map<string, number>();
  for (const entry of summary.pending) {
    byCountry.set(entry.countryId, (byCountry.get(entry.countryId) ?? 0) + 1);
  }

  console.log(write ? "Backfill applied.\n" : "Dry run — nothing written.\n");
  console.log(`  fiches scanned        ${summary.filesScanned}`);
  console.log(`  fiches to change      ${summary.filesChanged}`);
  console.log(`  kingdom entries       ${summary.entriesTotal}`);
  console.log(`  already dated         ${summary.alreadyDated}`);
  console.log(`  dated by this pass    ${summary.datedByParser}`);
  console.log(`  awaiting an editor    ${summary.pending.length}`);
  console.log("");
  console.log("Editorial queue — a source is needed for each of these:");
  for (const [countryId, count] of [...byCountry.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )) {
    console.log(`  ${countryId}  ${count}`);
  }
  if (!write) {
    console.log(
      `\nTyped as colonial or modern (${summary.reclassified.length}) — these leave the "Royaumes" section:`
    );
    for (const entry of summary.reclassified) {
      console.log(
        `  ${entry.countryId}  ${entry.entryType.padEnd(8)} ${entry.name}`
      );
    }
    console.log("\nRe-run with --write to apply.");
  }
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(path.basename(process.argv[1]))
) {
  main();
}
