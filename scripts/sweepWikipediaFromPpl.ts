/**
 * Sweep Wikipedia citations from AFRIK source fiches.
 *
 * Per the Source Tier Policy (CLAUDE.md / _bmad-output/project-context.md),
 * Wikipedia is a META-source, never a Tier-1 or Tier-2 citation. This script
 * walks every AFRIK source JSON (peoples, language families, countries) and
 * removes any string entry in a `sources` array that mentions "wikipedia"
 * (case-insensitive).
 *
 * Behavior:
 * - Recursively traverses each JSON object.
 * - For every array under a key literally named `sources`, filters out
 *   strings that match /wikipedia/i.
 * - If an array becomes empty after removal, it is LEFT empty (not deleted)
 *   so the validator can flag orphan claims as a follow-up.
 * - Other fields are untouched.
 * - 2-space indent, trailing newline (matching existing files).
 * - Idempotent: a second run is a no-op.
 *
 * Usage:
 *   tsx scripts/sweepWikipediaFromPpl.ts
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOTS = [
  "dataset/source/afrik/peuples",
  "dataset/source/afrik/famille_linguistique",
  "dataset/source/afrik/pays",
];

interface Stats {
  filesScanned: number;
  filesTouched: number;
  entriesRemoved: number;
  emptiedSourcesArrays: number;
}

const stats: Stats = {
  filesScanned: 0,
  filesTouched: 0,
  entriesRemoved: 0,
  emptiedSourcesArrays: 0,
};

/**
 * Walks the JSON tree. Mutates the value in place when it is an object/array.
 * For any array assigned to a property named `sources`, removes strings
 * matching /wikipedia/i and tracks stats.
 */
function sweep(value: unknown, parentKey: string | null = null): void {
  if (Array.isArray(value)) {
    if (parentKey === "sources") {
      const before = value.length;
      // Filter in place to preserve the surrounding object reference.
      for (let i = value.length - 1; i >= 0; i--) {
        const entry = value[i];
        if (typeof entry === "string" && /wikipedia/i.test(entry)) {
          value.splice(i, 1);
          stats.entriesRemoved += 1;
        }
      }
      if (before > 0 && value.length === 0) {
        stats.emptiedSourcesArrays += 1;
      }
    }
    // Recurse into array items as well (some sources entries may be nested
    // objects; defensive, even though current schema uses strings only).
    for (const item of value) {
      if (item !== null && typeof item === "object") {
        sweep(item, null);
      }
    }
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      sweep(v, k);
    }
  }
}

async function walkDir(dir: string, out: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      out.push(full);
    }
  }
}

async function processFile(file: string): Promise<void> {
  stats.filesScanned += 1;
  const original = await fs.readFile(file, "utf8");
  const data = JSON.parse(original);
  const beforeRemoved = stats.entriesRemoved;
  sweep(data, null);
  const removedHere = stats.entriesRemoved - beforeRemoved;
  if (removedHere === 0) {
    return;
  }
  const serialized = JSON.stringify(data, null, 2) + "\n";
  if (serialized !== original) {
    await fs.writeFile(file, serialized, "utf8");
    stats.filesTouched += 1;
  }
}

async function main(): Promise<void> {
  const files: string[] = [];
  for (const root of ROOTS) {
    try {
      await walkDir(root, files);
    } catch (err) {
      console.warn(
        `Skipping missing root: ${root} (${(err as Error).message})`
      );
    }
  }
  for (const file of files) {
    try {
      await processFile(file);
    } catch (err) {
      console.error(`Failed on ${file}:`, err);
      process.exitCode = 1;
    }
  }

  console.log("Wikipedia sweep complete.");
  console.log(`  Files scanned:           ${stats.filesScanned}`);
  console.log(`  Files touched:           ${stats.filesTouched}`);
  console.log(`  Wikipedia entries removed: ${stats.entriesRemoved}`);
  console.log(`  Sources arrays emptied:  ${stats.emptiedSourcesArrays}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
