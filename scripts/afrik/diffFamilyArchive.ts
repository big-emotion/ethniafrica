#!/usr/bin/env tsx
/**
 * Reports what each linguistic-family fiche lost when its archive was converted
 * to JSON, and writes one restoration ledger per family.
 *
 *   npx tsx scripts/afrik/diffFamilyArchive.ts                 # all 24, summary
 *   npx tsx scripts/afrik/diffFamilyArchive.ts FLG_BERBERE     # one, in detail
 *   npx tsx scripts/afrik/diffFamilyArchive.ts FLG_BERBERE --write
 *
 * A ledger is written only for a family somebody has started restoring, so the
 * directory holds work in progress rather than 24 identical complaints. The
 * `anchorBudget` it records is a descending ratchet: `familyRestorationRatchet`
 * recomputes the diff and fails if a family drifts back above its own budget.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { diffFamilyArchive } from "../lib/familyArchiveDiff";

const ARCHIVE_DIR = "dataset/source/afrik/archive/famille_linguistique";
const FICHE_DIR = "dataset/source/afrik/famille_linguistique";
export const LEDGER_DIR = "docs/editorial/family-restoration";

export interface FamilyRestorationLedger {
  familyId: string;
  generatedAt: string;
  archivePath: string;
  fichePath: string;
  charRatio: number;
  anchorBudget: number;
  sections: {
    heading: string;
    target: string;
    emptyTarget: boolean;
    archiveChars: number;
    jsonChars: number;
    missingAnchors: string[];
    missingSubheadings: string[];
  }[];
}

export function familyIds(repoRoot: string): string[] {
  return readdirSync(path.join(repoRoot, ARCHIVE_DIR))
    .filter((file) => file.endsWith(".txt"))
    .map((file) => file.replace(/\.txt$/, ""))
    .filter((id) => existsSync(path.join(repoRoot, FICHE_DIR, `${id}.json`)))
    .sort();
}

export function diffFamily(repoRoot: string, familyId: string) {
  const archivePath = path.join(ARCHIVE_DIR, `${familyId}.txt`);
  const fichePath = path.join(FICHE_DIR, `${familyId}.json`);
  return {
    archivePath,
    fichePath,
    diff: diffFamilyArchive(
      familyId,
      readFileSync(path.join(repoRoot, archivePath), "utf8"),
      JSON.parse(readFileSync(path.join(repoRoot, fichePath), "utf8"))
    ),
  };
}

function ledgerFor(
  repoRoot: string,
  familyId: string
): FamilyRestorationLedger {
  const { archivePath, fichePath, diff } = diffFamily(repoRoot, familyId);
  return {
    familyId,
    generatedAt: new Date().toISOString().slice(0, 10),
    archivePath,
    fichePath,
    charRatio: diff.charRatio,
    anchorBudget: diff.totalMissingAnchors,
    sections: diff.sections,
  };
}

function main(): void {
  const repoRoot = process.cwd();
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const requested = args.filter((a) => !a.startsWith("--"));
  const ids = requested.length > 0 ? requested : familyIds(repoRoot);

  if (requested.length === 0) {
    console.log(
      "famille                 ratio  ancres perdues  sections vides"
    );
    for (const id of ids) {
      const { diff } = diffFamily(repoRoot, id);
      const empty = diff.sections.filter((s) => s.emptyTarget).length;
      console.log(
        `${id.padEnd(24)}${String(diff.charRatio).padEnd(7)}${String(
          diff.totalMissingAnchors
        ).padEnd(16)}${empty || ""}`
      );
    }
    console.log(
      "\nName a family to see its detail, add --write to record its ledger."
    );
    return;
  }

  for (const id of ids) {
    const ledger = ledgerFor(repoRoot, id);
    console.log(
      `\n${id} — ratio ${ledger.charRatio}, ${ledger.anchorBudget} ancres perdues`
    );
    for (const section of ledger.sections) {
      if (!section.emptyTarget && section.missingAnchors.length === 0) continue;
      console.log(
        `  ${section.target}${section.emptyTarget ? "  [CIBLE VIDE]" : ""}`
      );
      if (section.missingSubheadings.length > 0) {
        console.log(
          `    sous-parties disparues : ${section.missingSubheadings.join(" · ")}`
        );
      }
      if (section.missingAnchors.length > 0) {
        console.log(
          `    ancres : ${section.missingAnchors.slice(0, 12).join(" · ")}`
        );
      }
    }
    if (write) {
      const dir = path.join(repoRoot, LEDGER_DIR);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, `${id}.json`),
        JSON.stringify(ledger, null, 2) + "\n",
        "utf8"
      );
      console.log(`  → ${LEDGER_DIR}/${id}.json`);
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(path.basename(process.argv[1]))
) {
  main();
}
