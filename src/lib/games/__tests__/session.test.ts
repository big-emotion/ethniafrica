import { describe, expect, it } from "vitest";

import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";

import type { GameRound } from "@/lib/games/gameKinds";
import { requestSeed, takeSession } from "@/lib/games/session";

const round = (subjectId: string): GameRound => ({
  kind: "binary",
  template: "larger-area",
  gameId: "mercator",
  subjectId,
  promptFr: "Lequel de ces deux pays couvre la plus grande surface ?",
  options: [{ labelFr: "A" }, { labelFr: "B" }],
  correctIndex: 0,
  reveal: {
    textFr: "peu importe",
    fieldPath: "lib/atlas/assets/africaAdmin0",
    sources: [],
    confidence: null,
    ficheHref: getAxisHubRoute("fr", "atlas"),
  },
});

const pool = ["a", "b", "c", "d", "e"].map(round);
const ids = (rounds: GameRound[]) => rounds.map((entry) => entry.subjectId);

describe("takeSession", () => {
  // @req REQ-120
  it("serves the head of the pool first, so the first render stays predictable", () => {
    expect(ids(takeSession(pool, 3, 0))).toEqual(["a", "b", "c"]);
  });

  /**
   * The whole point: the page's seed is a constant, so without this every
   * visitor replayed the same rounds for ever.
   */
  // @req REQ-120
  it("advances a whole session on each replay", () => {
    expect(ids(takeSession(pool, 3, 1))).toEqual(["d", "e", "a"]);
    expect(ids(takeSession(pool, 3, 2))).toEqual(["b", "c", "d"]);
  });

  // A pool of thirteen and a session of eight has no second full window, and
  // « rejouer » must not hand back a shorter session for want of one.
  // @req REQ-120
  it("keeps every session the same length by wrapping", () => {
    for (const index of [0, 1, 2, 3, 4, 5]) {
      expect(takeSession(pool, 3, index)).toHaveLength(3);
    }
  });

  // @req REQ-120
  it("serves the whole pool when it holds less than one session", () => {
    expect(ids(takeSession(pool, 99, 0))).toEqual(["a", "b", "c", "d", "e"]);
  });

  // @req REQ-120
  it("returns nothing rather than throwing on an empty pool", () => {
    expect(takeSession([], 8, 3)).toEqual([]);
    expect(takeSession(pool, 0, 0)).toEqual([]);
  });
});

/**
 * The defect a reader actually reported: eight questions, always the same
 * eight. `takeSession` advanced on replay and the page's seed never moved, so
 * leaving the page reset it and the opening session was the same for everyone.
 */
describe("requestSeed", () => {
  // @req REQ-120
  it("hands a different pool rotation to different requests", () => {
    const seeds = new Set(Array.from({ length: 50 }, () => requestSeed()));

    expect(seeds.size).toBeGreaterThan(1);
  });

  // `rotate` and `takeSession` both index an array with it.
  // @req REQ-120
  it("is a non-negative integer, which is what indexes a pool", () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const seed = requestSeed();
      expect(Number.isSafeInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
    }
  });
});
