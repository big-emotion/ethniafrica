import { describe, expect, it } from "vitest";

import { sweepInParallel } from "../parallelSweep";

describe("sweepInParallel", () => {
  // @req REQ-032
  it("returns results in input order regardless of completion order", async () => {
    const delays = [40, 5, 25, 1, 15];

    const audited = await sweepInParallel(delays, 3, async (ms, index) => {
      await new Promise((settle) => setTimeout(settle, ms));
      return `${index}:${ms}`;
    });

    expect(audited).toEqual(["0:40", "1:5", "2:25", "3:1", "4:15"]);
  });

  // The whole point of the helper: axe swept 63 Storybook stories one page at a
  // time, at ~9 s each. Without a real ceiling on in-flight work it would open
  // 63 browser pages at once and thrash the runner instead of speeding it up.
  // @req REQ-032
  it("never runs more than the requested number of stories at once", async () => {
    let inFlight = 0;
    let peakInFlight = 0;

    await sweepInParallel(
      Array.from({ length: 20 }, (_, index) => index),
      4,
      async () => {
        inFlight += 1;
        peakInFlight = Math.max(peakInFlight, inFlight);
        await new Promise((settle) => setTimeout(settle, 5));
        inFlight -= 1;
      }
    );

    expect(peakInFlight).toBe(4);
  });

  // A story that fails to render must not cancel the sweep: the run has to
  // report every violation it found, not stop at the first broken story.
  // @req REQ-032
  it("sweeps every story even when one of them throws", async () => {
    const swept: number[] = [];

    const outcomes = await sweepInParallel([1, 2, 3, 4], 2, async (n) => {
      swept.push(n);
      if (n === 2) throw new Error("story 2 failed to render");
      return n * 10;
    });

    expect(swept.sort()).toEqual([1, 2, 3, 4]);
    expect(outcomes[0]).toBe(10);
    expect(outcomes[1]).toBeInstanceOf(Error);
    expect(outcomes[3]).toBe(40);
  });

  // @req REQ-032
  it("accepts an empty sweep without opening a lane", async () => {
    expect(await sweepInParallel([], 4, async () => "unreachable")).toEqual([]);
  });
});
