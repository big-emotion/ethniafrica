import { describe, expect, it } from "vitest";
import {
  evaluateBundleBudget,
  measureIslandGzipBytes,
  QUIZ_ISLANDS,
  QUIZ_PICKER_BUNDLE_BUDGET_BYTES,
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

  /**
   * With two islands on one surface, a failure that says only a number leaves
   * the reader to work out which entry blew.
   */
  // @req REQ-103
  it("names the island that exceeded its budget", () => {
    const result = evaluateBundleBudget(
      5 * 1024,
      QUIZ_PICKER_BUNDLE_BUDGET_BYTES,
      "Quiz scope-deck"
    );

    expect(result.passed).toBe(false);
    expect(result.message).toContain("Quiz scope-deck");
    expect(result.message).toContain("exceeding the 4 KB budget by 1.00 KB");
  });
});

/**
 * The gate measured the play island alone, so the picker branch of the route
 * shipped a second client entry that nothing weighed. An unmeasured island is
 * one that grows.
 */
// @req REQ-103
describe("QUIZ_ISLANDS", () => {
  // @req REQ-103
  it("budgets every client entry the quiz surface ships", () => {
    expect(QUIZ_ISLANDS.map((island) => island.name)).toEqual([
      "Quiz play-island",
      "Quiz scope-deck",
    ]);
    expect(QUIZ_ISLANDS[1].budgetBytes).toBe(QUIZ_PICKER_BUNDLE_BUDGET_BYTES);
  });

  // @req REQ-103
  it("keeps the scope deck inside its own budget", async () => {
    const gzippedBytes = await measureIslandGzipBytes(
      QUIZ_ISLANDS[1].entrySource
    );

    expect(
      evaluateBundleBudget(
        gzippedBytes,
        QUIZ_PICKER_BUNDLE_BUDGET_BYTES,
        QUIZ_ISLANDS[1].name
      ).passed
    ).toBe(true);
  });
});

// Guards the measurement itself, not just the comparison: the three cases
// above would keep passing while the gate measured the wrong thing.
describe("measureIslandGzipBytes", () => {
  // @req REQ-103 FR71 (Epic 10, Story 10.11 · ETNI-500)
  it("measures the island within its own budget", async () => {
    const gzippedBytes = await measureIslandGzipBytes(
      QUIZ_ISLANDS[0].entrySource
    );

    expect(
      evaluateBundleBudget(gzippedBytes, QUIZ_BUNDLE_BUDGET_BYTES).passed
    ).toBe(true);
  });

  // QuizAnswerReveal reaches SourceChainSheet through React.lazy, so the real
  // chunk only loads when a reader opens the source sheet. Counting it against
  // the island's budget penalises the very code-splitting the budget exists to
  // encourage — it is what pushed this gate to 18.15 KB while the island that
  // actually ships was 9.61 KB.
  // @req REQ-103 FR71 (Epic 10, Story 10.11 · ETNI-500)
  it("leaves a lazily-imported sheet out of the island it measures", async () => {
    const withLazyChunkSplitOut = await measureIslandGzipBytes(
      QUIZ_ISLANDS[0].entrySource
    );

    expect(withLazyChunkSplitOut).toBeLessThan(12 * 1024);
  });
});
