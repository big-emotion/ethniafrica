import { describe, expect, it } from "vitest";

import {
  DIRECTION_TOLERANCE_PX,
  INITIAL_REVEAL_STATE,
  RETRACT_BELOW_PX,
  nextRevealState,
  type RevealState,
} from "@/lib/navigation/headerReveal";

/**
 * A reader's scroll, replayed one position at a time. Real scroll events
 * arrive as a stream of positions, and every rule here — the floor, the
 * tolerance, the reversal — is about what a *sequence* does, not what a
 * single step does.
 */
function scrollThrough(positions: number[]): RevealState {
  let state = INITIAL_REVEAL_STATE;
  let previous = positions[0];

  for (const y of positions.slice(1)) {
    state = nextRevealState(state, previous, y);
    previous = y;
  }
  return state;
}

/** A run of positions from `from` to `to`, in `step`-sized moves. */
function run(from: number, to: number, step = 40): number[] {
  const direction = to > from ? step : -step;
  const positions = [from];
  let y = from;

  while (Math.abs(to - y) > step) {
    y += direction;
    positions.push(y);
  }
  positions.push(to);
  return positions;
}

describe("nextRevealState", () => {
  // @req REQ-114
  it("keeps the masthead in place while the reader is near the top", () => {
    const state = scrollThrough(run(0, RETRACT_BELOW_PX, 20));

    expect(state.retracted).toBe(false);
  });

  // @req REQ-114
  it("retracts the masthead once the reader travels down the document", () => {
    const state = scrollThrough(run(0, 1200));

    expect(state.retracted).toBe(true);
  });

  // @req REQ-114
  it("brings the masthead back as soon as the reader turns round", () => {
    const down = scrollThrough(run(0, 1200));
    const up = nextRevealState(down, 1200, 1200 - DIRECTION_TOLERANCE_PX - 1);

    expect(down.retracted).toBe(true);
    expect(up.retracted).toBe(false);
  });

  // @req REQ-114
  it("ignores a reversal shorter than the tolerance", () => {
    const down = scrollThrough(run(0, 1200));
    const jitter = nextRevealState(down, 1200, 1200 - DIRECTION_TOLERANCE_PX);

    expect(jitter.retracted).toBe(true);
  });

  // @req REQ-114
  it("measures a reversal from the turn, not from the run it interrupts", () => {
    // 600px down builds a large positive run. If the reversal only subtracted
    // from it, the masthead would take another 600px of upward scroll to
    // return — which is the bug this rule exists to prevent.
    const down = scrollThrough(run(0, 600));
    const up = scrollThrough([
      ...run(0, 600),
      600 - DIRECTION_TOLERANCE_PX - 1,
    ]);

    expect(down.travelled).toBeGreaterThan(DIRECTION_TOLERANCE_PX * 10);
    expect(up.retracted).toBe(false);
  });

  // @req REQ-114
  it("restores the masthead at the top even when the reader arrives going down", () => {
    const retracted: RevealState = { retracted: true, travelled: 400 };

    expect(nextRevealState(retracted, 0, RETRACT_BELOW_PX).retracted).toBe(
      false
    );
  });

  // @req REQ-114
  it("leaves the state untouched when the position has not moved", () => {
    const state: RevealState = { retracted: true, travelled: 400 };

    expect(nextRevealState(state, 900, 900)).toBe(state);
  });
});
