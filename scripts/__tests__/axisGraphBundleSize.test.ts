import { describe, expect, it } from "vitest";

import { evaluateBundleBudget } from "../home-globe-bundle-size";
import { AXIS_GRAPH_BUNDLE_BUDGET_BYTES } from "../axis-graph-bundle-size";

describe("evaluateBundleBudget (AxisGraph)", () => {
  // @req REQ-114
  it("passes when the gzipped size is under the 25 KB budget", () => {
    const result = evaluateBundleBudget(
      8 * 1024,
      AXIS_GRAPH_BUNDLE_BUDGET_BYTES,
      "AxisGraph"
    );

    expect(result.passed).toBe(true);
    expect(result.message).toContain("AxisGraph bundle is 8.00 KB gzipped");
    expect(result.message).toContain("budget: 25 KB");
  });

  // Two WebGL islands on one page: a red gate has to say which one grew.
  // @req REQ-114
  it("names the island that blew its budget rather than the other one", () => {
    const result = evaluateBundleBudget(
      26 * 1024,
      AXIS_GRAPH_BUNDLE_BUDGET_BYTES,
      "AxisGraph"
    );

    expect(result.passed).toBe(false);
    expect(result.message).toContain("AxisGraph bundle is");
    expect(result.message).not.toContain("HomeGlobe");
    expect(result.message).toContain("exceeding the 25 KB budget by 1.00 KB");
  });

  // @req REQ-114
  it("keeps the graph an order of magnitude under the globe it sits beside", () => {
    expect(AXIS_GRAPH_BUNDLE_BUDGET_BYTES).toBe(25 * 1024);
  });
});
