import { describe, expect, it } from "vitest";

import { drawIds, RAIL_SIZE } from "@/lib/home/synthesisRailData";

const CORPUS = ["AGO", "BEN", "BFA", "CIV", "GHA", "MLI", "SEN", "TGO"];

describe("drawIds — picking the rail's countries (REQ-113)", () => {
  // Sampling with replacement would eventually put the same country in the
  // rail twice, which a reader reads as a bug rather than as chance.
  // @req REQ-113
  it("never draws the same country twice", () => {
    for (let seed = 0; seed < 50; seed += 1) {
      let step = seed;
      const pseudoRandom = () => {
        step = (step * 9301 + 49297) % 233280;
        return step / 233280;
      };

      const drawn = drawIds(CORPUS, RAIL_SIZE, pseudoRandom);

      expect(new Set(drawn).size).toBe(drawn.length);
    }
  });

  // @req REQ-113
  it("draws every id from the corpus it was given", () => {
    const drawn = drawIds(CORPUS, RAIL_SIZE, () => 0.5);

    for (const id of drawn) expect(CORPUS).toContain(id);
  });

  // A corpus smaller than the rail is not an error state — early in a
  // deployment it is simply what the atlas holds.
  // @req REQ-113
  it("returns what it can when the corpus is smaller than the rail", () => {
    expect(drawIds(["AGO", "BEN"], RAIL_SIZE)).toHaveLength(2);
  });

  // @req REQ-113
  it("leaves the caller's list untouched", () => {
    const original = [...CORPUS];

    drawIds(CORPUS, RAIL_SIZE);

    expect(CORPUS).toEqual(original);
  });
});
