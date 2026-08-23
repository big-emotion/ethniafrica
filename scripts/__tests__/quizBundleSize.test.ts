import { describe, expect, it } from "vitest";
import {
  evaluateBundleBudget,
  QUIZ_BUNDLE_BUDGET_BYTES,
} from "../quiz-bundle-size";

// @req REQ-103 FR71 (Epic 10, Story 10.11 · ETNI-500)
describe("evaluateBundleBudget", () => {
  it("passes when the gzipped size is under the 15 KB budget", () => {
    const result = evaluateBundleBudget(10 * 1024, QUIZ_BUNDLE_BUDGET_BYTES);

    expect(result.passed).toBe(true);
    expect(result.message).toContain("10.00 KB gzipped");
    expect(result.message).toContain("budget: 15 KB");
  });

  // @req REQ-103 FR71 (Epic 10, Story 10.11 · ETNI-500)
  it("passes when the gzipped size exactly equals the budget", () => {
    const result = evaluateBundleBudget(
      QUIZ_BUNDLE_BUDGET_BYTES,
      QUIZ_BUNDLE_BUDGET_BYTES
    );

    expect(result.passed).toBe(true);
  });

  // @req REQ-103 FR71 (Epic 10, Story 10.11 · ETNI-500)
  it("fails and reports the overage when the gzipped size exceeds the budget", () => {
    const result = evaluateBundleBudget(16 * 1024, QUIZ_BUNDLE_BUDGET_BYTES);

    expect(result.passed).toBe(false);
    expect(result.message).toContain("16.00 KB gzipped");
    expect(result.message).toContain("exceeding the 15 KB budget by 1.00 KB");
  });

  // @req REQ-103 FR71 (Epic 10, Story 10.11 · ETNI-500)
  it("exposes a 15 KB gzipped budget (ETNI-500 AC2)", () => {
    expect(QUIZ_BUNDLE_BUDGET_BYTES).toBe(15 * 1024);
  });
});
