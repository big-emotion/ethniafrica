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
 * ETNI-500 (10.11) AC2 — the quiz play-island (src/components/quiz/*,
 * lazily mounted by QuizPlayHost.tsx via next/dynamic only once a segment
 * is chosen) must stay under 15 KB gzipped so it never regresses the
 * mobile Performance budget on a page that doesn't need it until then
 * (NFR18–NFR23, AR20).
 *
 * No bundle-size tooling exists in the repo yet, so this introduces a
 * standalone, targeted esbuild bundle of the island entry rather than
 * parsing Next.js's own multi-chunk build output (fragile to map reliably
 * to "the play-island bundle" across webpack versions). Vendor
 * dependencies (react, @radix-ui/*, @tanstack/react-query, lucide-react,
 * ...) are left `packages: "external"` since those already ship in the
 * app's shared chunks and are not part of this feature-specific budget.
 * First-party shared modules the island imports transitively (e.g.
 * `@/lib/translations`, the full four-locale object) ARE bundled in,
 * which slightly overcounts versus the real production chunk — that
 * module is already loaded elsewhere in the real app — an intentionally
 * conservative measurement: if the synthetic bundle is under budget, the
 * real one almost certainly is too.
 *
 * `splitting` is on so a module the island reaches through React.lazy /
 * next/dynamic lands in a sibling chunk and is measured out, exactly as
 * the real build emits it. Without it esbuild inlines those imports and
 * the gate charges the island for code it defers: QuizAnswerReveal's
 * LazySourceChainSheet (with FlagTarget → FlagForm → TurnstileWidget
 * behind it) alone read as +8.5 KB gzipped, taking a 9.61 KB island to
 * the 18.15 KB that failed CI. Only the entry chunk counts.
 */
export const QUIZ_BUNDLE_BUDGET_BYTES = 15 * 1024; // 15 KB gzipped (AC2)

const ENTRY_SOURCE = `export { QuizPlayIsland } from "@/components/quiz/QuizPlayIsland";\n`;

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
      message: `Quiz play-island bundle is ${gzippedKb} KB gzipped, exceeding the ${budgetKb} KB budget by ${overBy} KB.`,
    };
  }

  return {
    passed: true,
    message: `Quiz play-island bundle is ${gzippedKb} KB gzipped (budget: ${budgetKb} KB).`,
  };
}

export async function measureQuizPlayIslandGzipBytes(): Promise<number> {
  const tmpDir = mkdtempSync(join(tmpdir(), "quiz-bundle-size-"));
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
      splitting: true,
      outdir: join(tmpDir, "out"),
      write: false,
      metafile: true,
      logLevel: "silent",
    });

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
        "esbuild produced no entry chunk for the quiz play-island entry."
      );
    }

    return gzipSync(Buffer.from(entryOutput.contents), { level: 9 }).length;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const gzippedBytes = await measureQuizPlayIslandGzipBytes();
  const { passed, message } = evaluateBundleBudget(
    gzippedBytes,
    QUIZ_BUNDLE_BUDGET_BYTES
  );

  if (!passed) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }

  console.log(`✅ ${message}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error measuring quiz play-island bundle size:", error);
    process.exit(1);
  });
}
