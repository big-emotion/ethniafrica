import { describe, expect, it } from "vitest";
import {
  parseScoreCardParams,
  scoreCardScope,
  scoreCardSearchParams,
} from "@/lib/quiz/scoreCardParams";

function params(overrides: Record<string, string> = {}) {
  return {
    pays: "GHA",
    total: "8",
    correct: "5",
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
  it("rejects a malformed country code", () => {
    expect(parseScoreCardParams(params({ pays: "GHANA" }))).toBeNull();
  });

  // @req REQ-103 FR70
  it("rejects missing fields", () => {
    expect(parseScoreCardParams({ pays: "GHA" })).toBeNull();
  });

  // @req REQ-103 FR70
  it("accepts a card with no track at all — the whole-corpus session", () => {
    expect(parseScoreCardParams({ total: "8", correct: "5" })).toEqual({
      pays: undefined,
      famille: undefined,
      mode: undefined,
      total: 8,
      correct: 5,
    });
  });

  // @req REQ-103 FR70
  it("coerces a URLSearchParams instance the same way", () => {
    const search = new URLSearchParams(params());
    expect(parseScoreCardParams(search)?.correct).toBe(5);
  });
});

describe("scoreCardScope", () => {
  // @req REQ-103 FR70
  it("reads the same track the session endpoint would", () => {
    const parsed = parseScoreCardParams(params());
    expect(parsed && scoreCardScope(parsed)).toEqual({
      kind: "country",
      entityId: "GHA",
    });
  });
});

describe("scoreCardSearchParams", () => {
  // @req REQ-103 FR70
  it("carries the track by id, never by name", () => {
    // A caption a stranger can write is a caption on an image carrying the
    // site's own type, so the label is resolved from the corpus instead.
    const search = scoreCardSearchParams(
      { kind: "family", entityId: "FLG_NIGER_CONGO" },
      6,
      8
    );
    expect(search.toString()).toBe("famille=FLG_NIGER_CONGO&correct=6&total=8");
  });

  // @req REQ-103 FR70
  it("writes no track for the default whole-corpus session", () => {
    expect(scoreCardSearchParams({ kind: "mixed" }, 6, 8).toString()).toBe(
      "correct=6&total=8"
    );
  });
});
