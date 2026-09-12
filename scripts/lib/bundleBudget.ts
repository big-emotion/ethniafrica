// esbuild is intentionally not a declared dependency: it already ships as a
// transitive dependency of vite/vitest (see package-lock.json), and adding
// it to package.json without a matching package-lock.json update would
// desync the lockfile `npm ci` requires to stay in sync. Resolves fine from
// node_modules after `npm ci` either way.
import * as esbuild from "esbuild";
import { gzipSync } from "node:zlib";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

/**
 * The measurement every client-island budget shares: a standalone esbuild
 * bundle of the island entry, vendor packages left external, first-party
 * transitive imports bundled in — deliberately conservative, because a
 * synthetic bundle under budget means the real chunk almost certainly is.
 */

export interface BundleBudgetResult {
  passed: boolean;
  message: string;
}

export function evaluateIslandBudget(
  gzippedBytes: number,
  budgetBytes: number,
  // Several islands share a page and a CI log; a red gate has to name which.
  islandName: string
): BundleBudgetResult {
  const gzippedKb = (gzippedBytes / 1024).toFixed(2);
  const budgetKb = (budgetBytes / 1024).toFixed(0);

  if (gzippedBytes > budgetBytes) {
    const overBy = ((gzippedBytes - budgetBytes) / 1024).toFixed(2);
    return {
      passed: false,
      message: `${islandName} bundle is ${gzippedKb} KB gzipped, exceeding the ${budgetKb} KB budget by ${overBy} KB.`,
    };
  }

  return {
    passed: true,
    message: `${islandName} bundle is ${gzippedKb} KB gzipped (budget: ${budgetKb} KB).`,
  };
}

export interface EntryMeasurement {
  /** Named in the error when esbuild emits nothing for the entry. */
  entryLabel: string;
  /**
   * Measure only the entry chunk, leaving what the island reaches through
   * React.lazy / next/dynamic in sibling chunks as the real build does. Off
   * for the globe and the axis graph, whose budgets were set against the
   * inlined bundle; switching it on would move their numbers, not their code.
   */
  splitting?: boolean;
}

export async function measureEntryGzipBytes(
  entrySource: string,
  { entryLabel, splitting = false }: EntryMeasurement
): Promise<number> {
  const tmpDir = mkdtempSync(join(tmpdir(), "bundle-budget-"));
  const entryPath = join(tmpDir, "entry.tsx");
  writeFileSync(entryPath, entrySource, "utf8");

  try {
    const result = await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      minify: true,
      format: "esm",
      platform: "browser",
      packages: "external",
      tsconfig: "tsconfig.json",
      write: false,
      logLevel: "silent",
      ...(splitting
        ? { splitting: true, outdir: join(tmpDir, "out"), metafile: true }
        : {}),
    });

    if (!splitting) {
      const [output] = result.outputFiles;
      if (!output) {
        throw new Error(
          `esbuild produced no output file for the ${entryLabel} entry.`
        );
      }
      return gzipSync(Buffer.from(output.contents), { level: 9 }).length;
    }

    // metafile keys are cwd-relative while outputFiles carry absolute paths;
    // the basename is what reliably ties the two together.
    const entryChunkName = Object.entries(result.metafile.outputs).find(
      ([, output]) => output.entryPoint !== undefined
    )?.[0];
    const entryOutput = result.outputFiles.find(
      (file) =>
        entryChunkName !== undefined &&
        basename(file.path) === basename(entryChunkName)
    );
    if (!entryOutput) {
      throw new Error(
        `esbuild produced no entry chunk for the ${entryLabel} entry.`
      );
    }
    return gzipSync(Buffer.from(entryOutput.contents), { level: 9 }).length;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

export interface BudgetedIsland {
  name: string;
  budgetBytes: number;
  measureGzipBytes: () => Promise<number>;
}

/**
 * Every island is measured even after one fails, so a single run names all of
 * them rather than stopping at the first. Exits 1 on any overrun and on any
 * measurement failure.
 */
export function runBundleBudgetGate(
  islands: readonly BudgetedIsland[],
  fatalMessage: string
): void {
  const gate = async () => {
    let failed = false;

    for (const island of islands) {
      const { passed, message } = evaluateIslandBudget(
        await island.measureGzipBytes(),
        island.budgetBytes,
        island.name
      );
      if (passed) {
        console.log(`✅ ${message}`);
      } else {
        console.error(`❌ ${message}`);
        failed = true;
      }
    }

    if (failed) process.exit(1);
  };

  gate().catch((error) => {
    console.error(fatalMessage, error);
    process.exit(1);
  });
}
