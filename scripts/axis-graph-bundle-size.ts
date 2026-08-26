// esbuild is intentionally not a declared dependency: see
// scripts/quiz-bundle-size.ts for why (transitive dependency of vite/vitest,
// resolves fine from node_modules after `npm ci`).
import * as esbuild from "esbuild";
import { gzipSync } from "node:zlib";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { evaluateBundleBudget } from "./home-globe-bundle-size";

/**
 * REQ-114 — the home's axis panels draw their link graph in WebGL, in a
 * client island lazily mounted by AxisGraphCanvas.tsx once a context has
 * been probed (ARCH-014). That makes the home carry a second WebGL island
 * alongside the hero globe, and DEC-020 went to the trouble of capping the
 * first one: an uncapped second would let the pair grow back past the
 * number that decision put on the record.
 *
 * The graph is hand-written GL with no library behind it, so the budget is
 * a fraction of the globe's. If a change here needs more than 25 KB, the
 * thing to question is the change, not the number.
 */
export const AXIS_GRAPH_BUNDLE_BUDGET_BYTES = 25 * 1024; // 25 KB gzipped

const ENTRY_SOURCE = `export { AxisGraphScene } from "@/components/home/AxisGraphScene";\n`;

export async function measureAxisGraphGzipBytes(): Promise<number> {
  const tmpDir = mkdtempSync(join(tmpdir(), "axis-graph-bundle-size-"));
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
        "esbuild produced no output file for the AxisGraphScene entry."
      );
    }

    return gzipSync(Buffer.from(output.contents), { level: 9 }).length;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const gzippedBytes = await measureAxisGraphGzipBytes();
  const { passed, message } = evaluateBundleBudget(
    gzippedBytes,
    AXIS_GRAPH_BUNDLE_BUDGET_BYTES,
    "AxisGraph"
  );

  if (!passed) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }

  console.log(`✅ ${message}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error measuring AxisGraph bundle size:", error);
    process.exit(1);
  });
}
