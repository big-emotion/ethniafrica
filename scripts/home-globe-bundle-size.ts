import {
  evaluateIslandBudget,
  measureEntryGzipBytes,
  runBundleBudgetGate,
  type BundleBudgetResult,
} from "./lib/bundleBudget";

/**
 * ETNI-1214 (REQ-112) / DEC-020 — the interactive WebGL globe is a client
 * island, lazily mounted only once a WebGL context is confirmed (ARCH-014).
 * DEC-020 accepted "~170 kB of WebGL runtime" as the cost of this feature,
 * on the record — this budget makes that number a regression gate instead
 * of a one-time estimate.
 *
 * ETNI-1360 ("one globe engine, and the point cloud deleted", commit
 * 8ede9bf8) removed the original entry this script measured
 * (src/components/home/HomeGlobe.tsx, HomeGlobeFallback.tsx,
 * HomeGlobeStage.tsx). The home and /jouer/mercator now mount
 * ContinentGlobeStage.tsx, which gates on the same WebGL probe and renders
 * AtlasGlobe.tsx — AtlasGlobeCanvas.tsx lazily via next/dynamic — the same
 * engine the entity fiches use (ETNI-1403). DEC-021's amendment confirms the
 * budget still applies to whichever component renders the globe, not
 * specifically to the one DEC-021 originally named.
 */
export const HOME_GLOBE_BUNDLE_BUDGET_BYTES = 170 * 1024; // 170 KB gzipped (DEC-020)

const ENTRY_SOURCE = `export { ContinentGlobeStage } from "@/components/atlas/ContinentGlobeStage";\n`;

export function evaluateBundleBudget(
  gzippedBytes: number,
  budgetBytes: number,
  islandName = "ContinentGlobe"
): BundleBudgetResult {
  return evaluateIslandBudget(gzippedBytes, budgetBytes, islandName);
}

export function measureContinentGlobeGzipBytes(): Promise<number> {
  return measureEntryGzipBytes(ENTRY_SOURCE, {
    entryLabel: "ContinentGlobeStage",
  });
}

if (require.main === module) {
  runBundleBudgetGate(
    [
      {
        name: "ContinentGlobe",
        budgetBytes: HOME_GLOBE_BUNDLE_BUDGET_BYTES,
        measureGzipBytes: measureContinentGlobeGzipBytes,
      },
    ],
    "Fatal error measuring ContinentGlobe bundle size:"
  );
}
