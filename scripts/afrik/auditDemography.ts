#!/usr/bin/env tsx
/**
 * Re-measures the demographic defects of the peoples corpus and rewrites the
 * annexes behind `docs/editorial/demography-cleanup/README.md`.
 *
 *   npx tsx scripts/afrik/auditDemography.ts            # summary to stdout
 *   npx tsx scripts/afrik/auditDemography.ts --write    # and rewrite the annexes
 *
 * Read-only over the corpus in every mode: `--write` touches the annexes and
 * nothing else. The arbitration the annexes feed is the operator's, so this
 * script deliberately has no mode that edits a fiche.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  auditDemography,
  type CountryFiche,
  type DemographyReport,
  type PeopleFiche,
} from "../lib/demographyAudit";

const PEOPLE_DIR = "dataset/source/afrik/peuples";
const COUNTRY_DIR = "dataset/source/afrik/pays";
export const ANNEX_DIR = "docs/editorial/demography-cleanup";

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function loadPeople(repoRoot: string): PeopleFiche[] {
  const root = path.join(repoRoot, PEOPLE_DIR);
  return readdirSync(root)
    .filter((entry) => statSync(path.join(root, entry)).isDirectory())
    .flatMap((family) =>
      readdirSync(path.join(root, family))
        .filter((file) => file.startsWith("PPL_") && file.endsWith(".json"))
        .map((file) => readJson<PeopleFiche>(path.join(root, family, file)))
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function loadCountries(repoRoot: string): CountryFiche[] {
  const root = path.join(repoRoot, COUNTRY_DIR);
  return readdirSync(root)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson<CountryFiche>(path.join(root, file)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function writeAnnexes(repoRoot: string, report: DemographyReport): void {
  const annexes: [string, unknown][] = [
    ["macro-groups.json", report.macroGroups],
    ["container-fiches.json", report.containerFiches],
    ["duplicate-clusters.json", report.duplicateClusters],
    ["country-overcount.json", report.countryOvercount],
    ["cross-check-divergences.json", report.crossCheck],
    ["figure-status.json", report.figureStatus],
    ["impossible-entries.json", report.impossibleEntries],
  ];
  for (const [file, payload] of annexes) {
    writeFileSync(
      path.join(repoRoot, ANNEX_DIR, file),
      `${JSON.stringify(payload, null, 2)}\n`
    );
  }
}

export function summarise(report: DemographyReport): string[] {
  const derivable = report.figureStatus.filter((s) => s.derivable).length;
  const ambiguous = report.figureStatus.filter(
    (s) => s.signals.length > 1
  ).length;
  const silent = report.figureStatus.filter(
    (s) => s.signals.length === 0
  ).length;
  const ratios = report.countryOvercount
    .map((c) => c.ratioRaw)
    .sort((a, b) => a - b);
  const cured = report.countryOvercount
    .map((c) => c.ratioAfterCuration)
    .sort((a, b) => a - b);
  const median = (values: number[]) => {
    if (!values.length) return "n/a";
    const mid = Math.floor(values.length / 2);
    const value =
      values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    return value.toFixed(2);
  };

  return [
    `fiches                         ${report.fiches} (${report.withFigure} with a figure)`,
    `macro-groups                   ${report.macroGroups.length}`,
    `container fiches               ${report.containerFiches.length} (${
      report.containerFiches.filter((c) => c.alsoFlaggedAsMacroGroup).length
    } already macro)`,
    `duplicate clusters             ${report.duplicateClusters.length} covering ${report.duplicateClusters.reduce(
      (n, c) => n + c.members.length,
      0
    )} fiches`,
    `  principal loses richest text ${report.duplicateClusters.filter((c) => c.textConflict).length}`,
    `countries usable after curation ${
      report.countryOvercount.filter((c) => c.usableAfterCuration).length
    } / ${report.countryOvercount.length}`,
    `  median ratio                 ${median(ratios)} -> ${median(cured)} after curation`,
    `figure status derivable        ${derivable} / ${report.figureStatus.length} (${ambiguous} ambiguous, ${silent} silent)`,
    `  figure counts speakers       ${report.figureStatus.filter((s) => s.speakerCountOnly).length}`,
    `  cites Joshua Project         ${report.figureStatus.filter((s) => s.citesJoshuaProject).length}`,
    `  cites Wikipedia              ${report.figureStatus.filter((s) => s.citesWikipedia).length}`,
    `cross-check divergent          ${
      report.crossCheck.filter((e) => e.status === "divergent").length
    } / ${report.crossCheck.filter((e) => e.ratio !== undefined).length} comparable`,
    `arithmetically impossible      ${report.impossibleEntries.length}`,
  ];
}

function main(): void {
  const repoRoot = process.cwd();
  const report = auditDemography(loadPeople(repoRoot), loadCountries(repoRoot));

  for (const line of summarise(report)) console.log(line);

  if (process.argv.includes("--write")) {
    writeAnnexes(repoRoot, report);
    console.log(`\nannexes rewritten in ${ANNEX_DIR}`);
  } else {
    console.log("\n(pass --write to rewrite the annexes)");
  }
}

main();
