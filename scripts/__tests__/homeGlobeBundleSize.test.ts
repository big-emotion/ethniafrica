import { describe, expect, it } from "vitest";
import {
  evaluateBundleBudget,
  HOME_GLOBE_BUNDLE_BUDGET_BYTES,
} from "../home-globe-bundle-size";

// @req REQ-112 (ETNI-1214 · DEC-020 / ARCH-014)
describe("evaluateBundleBudget (HomeGlobe)", () => {
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
