import {
  evaluateIslandBudget,
  measureEntryGzipBytes,
  runBundleBudgetGate,
  type BundleBudgetResult,
} from "./lib/bundleBudget";

/**
 * ETNI-500 (10.11) AC2 — the quiz play-island (src/components/quiz/*,
 * lazily mounted by QuizPlayHost.tsx via next/dynamic only once a segment
 * is chosen) must stay under 15 KB gzipped so it never regresses the
 * mobile Performance budget on a page that doesn't need it until then
 * (NFR18–NFR23, AR20).
 *
 * A targeted esbuild bundle of the island entry rather than Next.js's own
 * multi-chunk build output, which is fragile to map reliably to "the
 * play-island bundle" across webpack versions. First-party shared modules
 * the island imports transitively (e.g. `@/lib/translations`) are bundled
 * in, which slightly overcounts versus the real production chunk.
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

/**
 * The picker's own island, budgeted separately from the play island.
 *
 * The quiz surface has two client entry points and this script measured one of
 * them, so a regression on the *picker* branch of the route — the deck that
 * deploys a country's themes — would have gone unmeasured entirely. An
 * unmeasured island is one that grows, and the play island's own history is the
 * argument for saying so out loud.
 */
export const QUIZ_PICKER_BUNDLE_BUDGET_BYTES = 4 * 1024;

/** Every client entry the quiz surface ships, with the budget it answers to. */
export const QUIZ_ISLANDS = [
  {
    name: "Quiz play-island",
    budgetBytes: QUIZ_BUNDLE_BUDGET_BYTES,
    entrySource: `export { QuizPlayIsland } from "@/components/quiz/QuizPlayIsland";\n`,
  },
  {
    name: "Quiz scope-deck",
    budgetBytes: QUIZ_PICKER_BUNDLE_BUDGET_BYTES,
    entrySource: `export { QuizScopeDeck } from "@/components/quiz/QuizScopeDeck";\n`,
  },
] as const;

export function evaluateBundleBudget(
  gzippedBytes: number,
  budgetBytes: number,
  islandName = "Quiz play-island"
): BundleBudgetResult {
  return evaluateIslandBudget(gzippedBytes, budgetBytes, islandName);
}

export function measureIslandGzipBytes(entrySource: string): Promise<number> {
  return measureEntryGzipBytes(entrySource, {
    entryLabel: "quiz",
    splitting: true,
  });
}

if (require.main === module) {
  runBundleBudgetGate(
    QUIZ_ISLANDS.map((island) => ({
      name: island.name,
      budgetBytes: island.budgetBytes,
      measureGzipBytes: () => measureIslandGzipBytes(island.entrySource),
    })),
    "Fatal error measuring quiz bundle sizes:"
  );
}
