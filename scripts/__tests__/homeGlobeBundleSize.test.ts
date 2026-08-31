import { describe, expect, it } from "vitest";
import {
  evaluateBundleBudget,
  measureContinentGlobeGzipBytes,
  HOME_GLOBE_BUNDLE_BUDGET_BYTES,
} from "../home-globe-bundle-size";

// @req REQ-112 (ETNI-1214 · DEC-020 / ARCH-014)
describe("evaluateBundleBudget (ContinentGlobe)", () => {
  it("passes when the gzipped size is under the 170 KB budget", () => {
    const result = evaluateBundleBudget(
      10 * 1024,
      HOME_GLOBE_BUNDLE_BUDGET_BYTES
    );

    expect(result.passed).toBe(true);
    expect(result.message).toContain("10.00 KB gzipped");
    expect(result.message).toContain("budget: 170 KB");
  });

  // @req REQ-112 (ETNI-1214 · DEC-020 / ARCH-014)
  it("passes when the gzipped size exactly equals the budget", () => {
    const result = evaluateBundleBudget(
      HOME_GLOBE_BUNDLE_BUDGET_BYTES,
      HOME_GLOBE_BUNDLE_BUDGET_BYTES
    );

    expect(result.passed).toBe(true);
  });

  // @req REQ-112 (ETNI-1214 · DEC-020 / ARCH-014)
  it("fails and reports the overage when the gzipped size exceeds the budget", () => {
    const result = evaluateBundleBudget(
      171 * 1024,
      HOME_GLOBE_BUNDLE_BUDGET_BYTES
    );

    expect(result.passed).toBe(false);
    expect(result.message).toContain("171.00 KB gzipped");
    expect(result.message).toContain("exceeding the 170 KB budget by 1.00 KB");
  });

  // @req REQ-112 (ETNI-1214 · DEC-020 / ARCH-014)
  it("exposes a 170 KB gzipped budget (DEC-020)", () => {
    expect(HOME_GLOBE_BUNDLE_BUDGET_BYTES).toBe(170 * 1024);
  });
});

// Guards the measurement itself, not just the comparison: the gate went
// green for months measuring a re-export of a file deleted in ETNI-1360
// (commit 8ede9bf8), reporting 0.08 KB against the 170 KB budget. This
// checks the entry resolves to the globe that actually ships —
// ContinentGlobeStage.tsx, rendering AtlasGlobe.tsx / AtlasGlobeCanvas.tsx —
// so a future deletion fails loudly instead of measuring nothing again.
describe("measureContinentGlobeGzipBytes", () => {
  // @req REQ-112 (ETNI-1214 · DEC-020 / ARCH-014)
  it("measures the shipped globe within the DEC-020 budget", async () => {
    const gzippedBytes = await measureContinentGlobeGzipBytes();

    expect(
      evaluateBundleBudget(gzippedBytes, HOME_GLOBE_BUNDLE_BUDGET_BYTES).passed
    ).toBe(true);
  });

  // A budget of 170 KB accepted for a ~639-line point-cloud engine and its
  // own GLSL is not a bound worth trusting silently against a re-export
  // that resolves to nothing — this pins the real measurement to an order
  // of magnitude so a regression back toward the old cost is caught even
  // though it would still pass the raw budget check above.
  // @req REQ-112 (ETNI-1214 · DEC-020 / ARCH-014)
  it("stays an order of magnitude under the budget for the current engine", async () => {
    const gzippedBytes = await measureContinentGlobeGzipBytes();

    expect(gzippedBytes).toBeLessThan(80 * 1024);
  });
});
