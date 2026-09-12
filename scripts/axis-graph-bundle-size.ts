import { measureEntryGzipBytes, runBundleBudgetGate } from "./lib/bundleBudget";

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

export function measureAxisGraphGzipBytes(): Promise<number> {
  return measureEntryGzipBytes(ENTRY_SOURCE, { entryLabel: "AxisGraphScene" });
}

if (require.main === module) {
  runBundleBudgetGate(
    [
      {
        name: "AxisGraph",
        budgetBytes: AXIS_GRAPH_BUNDLE_BUDGET_BYTES,
        measureGzipBytes: measureAxisGraphGzipBytes,
      },
    ],
    "Fatal error measuring AxisGraph bundle size:"
  );
}
