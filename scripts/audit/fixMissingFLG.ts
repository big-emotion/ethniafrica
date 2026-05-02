/**
 * Batch fix script: Append (FLG_XXXX) to people files missing FLG_ identifier
 *
 * Scans all people files under dataset/source/afrik/peuples/FLG_*\/PPL_*.txt
 * and appends the FLG_ ID (from parent directory) to the "Famille linguistique" line
 * when the line does not already contain a (FLG_*) reference.
 *
 * Usage: tsx scripts/audit/fixMissingFLG.ts [--dry-run]
 */

import { readFileSync, writeFileSync } from "fs";
import { basename, dirname, join } from "path";
import { globSync } from "glob";

const DRY_RUN = process.argv.includes("--dry-run");

const DATASET_ROOT = join(process.cwd(), "dataset/source/afrik/peuples");
const FAMILLE_LINE_PATTERN = /^- Famille linguistique\s*:.*/m;
const FLG_IN_LINE_PATTERN = /\(FLG_[A-Z_]+\)/;
const FLG_DIR_PATTERN = /FLG_[A-Z_]+/;

function main() {
  const files = globSync(join(DATASET_ROOT, "FLG_*/PPL_*.txt"));

  console.log(`Found ${files.length} people files to scan.\n`);

  let fixedCount = 0;
  let alreadyOkCount = 0;
  let noLineCount = 0;
  const errors: string[] = [];

  for (const filePath of files) {
    const parentDir = basename(dirname(filePath));
    const flgMatch = parentDir.match(FLG_DIR_PATTERN);

    if (!flgMatch) {
      errors.push(`No FLG_ in parent directory: ${filePath}`);
      continue;
    }

    const flgId = flgMatch[0];
    const content = readFileSync(filePath, "utf-8");
    const lineMatch = content.match(FAMILLE_LINE_PATTERN);

    if (!lineMatch) {
      noLineCount++;
      continue;
    }

    const line = lineMatch[0];

    if (FLG_IN_LINE_PATTERN.test(line)) {
      alreadyOkCount++;
      continue;
    }

    // Append (FLG_XXXX) to the line
    const fixedLine = `${line.trimEnd()} (${flgId})`;
    const fixedContent = content.replace(line, fixedLine);

    if (!DRY_RUN) {
      writeFileSync(filePath, fixedContent, "utf-8");
    }

    fixedCount++;
    console.log(
      `${DRY_RUN ? "[DRY RUN] " : ""}Fixed: ${basename(dirname(filePath))}/${basename(filePath)} — added (${flgId})`
    );
  }

  console.log("\n--- Summary ---");
  console.log(`Total files scanned: ${files.length}`);
  console.log(`Already OK (has FLG_ in line): ${alreadyOkCount}`);
  console.log(`No "Famille linguistique" line: ${noLineCount}`);
  console.log(`Fixed: ${fixedCount}`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
    for (const err of errors) {
      console.log(`  - ${err}`);
    }
  }
  if (DRY_RUN) {
    console.log("\n(Dry run — no files were modified)");
  }
}

main();
