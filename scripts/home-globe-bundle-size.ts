// esbuild is intentionally not a declared dependency: see
// scripts/quiz-bundle-size.ts for why (transitive dependency of vite/vitest,
// resolves fine from node_modules after `npm ci`).
import * as esbuild from "esbuild";
import { gzipSync } from "node:zlib";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * ETNI-1214 (REQ-112) / DEC-020 — the interactive WebGL globe
 * (src/components/home/HomeGlobe.tsx) is a client island, lazily mounted by
 * HomeGlobeStage.tsx via next/dynamic only once a WebGL context is
 * confirmed (ARCH-014). DEC-020 accepted "~170 kB of WebGL runtime" as the
 * cost of this feature, on the record — this budget makes that number a
 * regression gate instead of a one-time estimate.
 *
 * Mirrors scripts/quiz-bundle-size.ts: a standalone esbuild bundle of the
 * island entry, vendor packages left external, first-party transitive
 * imports (src/lib/atlas/projection.ts, src/lib/continentDots.ts) bundled
 * in — a deliberately conservative measurement.
 */
export const HOME_GLOBE_BUNDLE_BUDGET_BYTES = 170 * 1024; // 170 KB gzipped (DEC-020)

const ENTRY_SOURCE = `export { HomeGlobe } from "@/components/home/HomeGlobe";\n`;

export interface BundleBudgetResult {
  passed: boolean;
  message: string;
}

export function evaluateBundleBudget(
  gzippedBytes: number,
  budgetBytes: number
): BundleBudgetResult {
  const gzippedKb = (gzippedBytes / 1024).toFixed(2);
  const budgetKb = (budgetBytes / 1024).toFixed(0);

  if (gzippedBytes > budgetBytes) {
    const overBy = ((gzippedBytes - budgetBytes) / 1024).toFixed(2);
    return {
      passed: false,
      message: `HomeGlobe bundle is ${gzippedKb} KB gzipped, exceeding the ${budgetKb} KB budget by ${overBy} KB.`,
    };
  }

  return {
    passed: true,
    message: `HomeGlobe bundle is ${gzippedKb} KB gzipped (budget: ${budgetKb} KB).`,
  };
}

export async function measureHomeGlobeGzipBytes(): Promise<number> {
  const tmpDir = mkdtempSync(join(tmpdir(), "home-globe-bundle-size-"));
  const entryPath = join(tmpDir, "entry.tsx");
  writeFileSync(entryPath, ENTRY_SOURCE, "utf8");

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
    });

    const [output] = result.outputFiles;
    if (!output) {
      throw new Error(
        "esbuild produced no output file for the HomeGlobe entry."
      );
    }

    return gzipSync(Buffer.from(output.contents), { level: 9 }).length;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const gzippedBytes = await measureHomeGlobeGzipBytes();
  const { passed, message } = evaluateBundleBudget(
    gzippedBytes,
    HOME_GLOBE_BUNDLE_BUDGET_BYTES
  );

  if (!passed) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }

  console.log(`✅ ${message}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error measuring HomeGlobe bundle size:", error);
    process.exit(1);
  });
}
