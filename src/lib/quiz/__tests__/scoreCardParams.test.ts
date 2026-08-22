import { describe, expect, it } from "vitest";
import { parseScoreCardParams } from "@/lib/quiz/scoreCardParams";

function params(overrides: Record<string, string> = {}) {
  return {
    segment: "adults",
    total: "8",
    correct: "5",
    rung: "2",
    ...overrides,
  };
}

describe("parseScoreCardParams (Epic 10, Story 10.10, ETNI-499, ETNI-1138, FR70)", () => {
  // @req REQ-103 FR70
  it("rejects forged params where correct exceeds total", () => {
    expect(
      parseScoreCardParams(params({ correct: "47", total: "8" }))
    ).toBeNull();
  });

  // @req REQ-103 FR70
  it.each([["4"], ["11"]])(
    "rejects a total of %s (outside [5,10])",
    (total) => {
      expect(parseScoreCardParams(params({ total }))).toBeNull();
    }
  );

  // @req REQ-103 FR70
  it("rejects an unknown segment", () => {
    expect(parseScoreCardParams(params({ segment: "unknown" }))).toBeNull();
  });

  // @req REQ-103 FR70
  it("rejects a rung outside the segment's difficulty range", () => {
    // children's range is [1, 2]
    expect(
      parseScoreCardParams(params({ segment: "children", rung: "5" }))
    ).toBeNull();
  });

  // @req REQ-103 FR70
  it("rejects missing fields", () => {
    expect(parseScoreCardParams({ segment: "adults" })).toBeNull();
  });

  // @req REQ-103 FR70
  it("returns the typed object for valid params", () => {
    expect(parseScoreCardParams(params())).toEqual({
      segment: "adults",
      total: 8,
      correct: 5,
      rung: 2,
    });
  });

  // @req REQ-103 FR70
  it("coerces a URLSearchParams instance the same way", () => {
    const search = new URLSearchParams(params());
    expect(parseScoreCardParams(search)).toEqual({
      segment: "adults",
      total: 8,
      correct: 5,
      rung: 2,
    });
  });
});
