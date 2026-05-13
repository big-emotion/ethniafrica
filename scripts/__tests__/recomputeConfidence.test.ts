/**
 * Unit tests for URL health pure helpers used by the confidence recompute job.
 *
 * Covers Story 0.20 (FR31) acceptance criteria:
 *   - A source unreachable for >= 7 consecutive days triggers a penalty
 *   - A source resolvable again for >= 3 consecutive days reverses the penalty
 *   - Boundary conditions (exactly 7 / 6 days, exactly 3 / 2 days)
 *   - Idempotency: re-running the decision step with the same state does not
 *     double-penalize or double-recover.
 */

import { describe, it, expect } from "vitest";
import {
  computeConsecutiveRuns,
  decideAction,
  type HealthRecord,
  type Action,
} from "../lib/urlHealth";

/** Build a synthetic NDJSON-equivalent record. */
function rec(
  sourceId: string,
  daysAgo: number,
  status: "ok" | "broken"
): HealthRecord {
  const ts = new Date(Date.UTC(2026, 4, 13)); // reference "today" = 2026-05-13
  ts.setUTCDate(ts.getUTCDate() - daysAgo);
  return {
    source_id: sourceId,
    url: `https://example.com/${sourceId}`,
    status,
    http_code: status === "ok" ? 200 : 503,
    timestamp: ts.toISOString(),
  };
}

const NOW = new Date(Date.UTC(2026, 4, 13));

describe("computeConsecutiveRuns", () => {
  it("returns zero runs for an empty input", () => {
    const runs = computeConsecutiveRuns([], NOW);
    expect(runs.size).toBe(0);
  });

  it("counts a single broken day as a 1-day broken run", () => {
    const records = [rec("s1", 0, "broken")];
    const runs = computeConsecutiveRuns(records, NOW);
    expect(runs.get("s1")).toEqual({
      mostRecentStatus: "broken",
      consecutiveBrokenDays: 1,
      consecutiveOkDays: 0,
    });
  });

  it("counts 7 consecutive broken days correctly", () => {
    const records = Array.from({ length: 7 }, (_, i) => rec("s1", i, "broken"));
    const runs = computeConsecutiveRuns(records, NOW);
    expect(runs.get("s1")?.consecutiveBrokenDays).toBe(7);
    expect(runs.get("s1")?.mostRecentStatus).toBe("broken");
  });

  it("resets the broken run when an ok day appears in between", () => {
    // day 0..2 broken, day 3 ok, day 4..6 broken
    const records = [
      rec("s1", 0, "broken"),
      rec("s1", 1, "broken"),
      rec("s1", 2, "broken"),
      rec("s1", 3, "ok"),
      rec("s1", 4, "broken"),
      rec("s1", 5, "broken"),
      rec("s1", 6, "broken"),
    ];
    const runs = computeConsecutiveRuns(records, NOW);
    // most recent (day 0) is broken, run length back to nearest non-broken (day 3) = 3 days
    expect(runs.get("s1")?.consecutiveBrokenDays).toBe(3);
    expect(runs.get("s1")?.mostRecentStatus).toBe("broken");
  });

  it("counts 3 consecutive ok days after a broken stretch", () => {
    const records = [
      rec("s1", 0, "ok"),
      rec("s1", 1, "ok"),
      rec("s1", 2, "ok"),
      rec("s1", 3, "broken"),
      rec("s1", 4, "broken"),
    ];
    const runs = computeConsecutiveRuns(records, NOW);
    expect(runs.get("s1")?.consecutiveOkDays).toBe(3);
    expect(runs.get("s1")?.mostRecentStatus).toBe("ok");
  });

  it("deduplicates multiple records on the same calendar day", () => {
    // two probes on day 0 (both broken)
    const records = [
      rec("s1", 0, "broken"),
      rec("s1", 0, "broken"),
      rec("s1", 1, "broken"),
    ];
    const runs = computeConsecutiveRuns(records, NOW);
    expect(runs.get("s1")?.consecutiveBrokenDays).toBe(2);
  });

  it("handles multiple sources independently", () => {
    const records = [
      rec("s1", 0, "broken"),
      rec("s2", 0, "ok"),
      rec("s1", 1, "broken"),
      rec("s2", 1, "ok"),
    ];
    const runs = computeConsecutiveRuns(records, NOW);
    expect(runs.get("s1")?.consecutiveBrokenDays).toBe(2);
    expect(runs.get("s2")?.consecutiveOkDays).toBe(2);
  });
});

describe("decideAction", () => {
  it("returns 'penalize' when broken run is exactly 7 and no open flag exists", () => {
    const action: Action = decideAction({
      mostRecentStatus: "broken",
      consecutiveBrokenDays: 7,
      consecutiveOkDays: 0,
      hasOpenFlag: false,
    });
    expect(action).toBe("penalize");
  });

  it("returns 'noop' when broken run is 6 days (does not trigger)", () => {
    const action = decideAction({
      mostRecentStatus: "broken",
      consecutiveBrokenDays: 6,
      consecutiveOkDays: 0,
      hasOpenFlag: false,
    });
    expect(action).toBe("noop");
  });

  it("returns 'penalize' for broken runs longer than 7 if no flag yet", () => {
    const action = decideAction({
      mostRecentStatus: "broken",
      consecutiveBrokenDays: 14,
      consecutiveOkDays: 0,
      hasOpenFlag: false,
    });
    expect(action).toBe("penalize");
  });

  it("is idempotent: returns 'noop' when broken >= 7 but a flag already exists", () => {
    const action = decideAction({
      mostRecentStatus: "broken",
      consecutiveBrokenDays: 10,
      consecutiveOkDays: 0,
      hasOpenFlag: true,
    });
    expect(action).toBe("noop");
  });

  it("returns 'recover' when ok run is exactly 3 and an open flag exists", () => {
    const action = decideAction({
      mostRecentStatus: "ok",
      consecutiveBrokenDays: 0,
      consecutiveOkDays: 3,
      hasOpenFlag: true,
    });
    expect(action).toBe("recover");
  });

  it("returns 'noop' when ok run is 2 days (does not reverse)", () => {
    const action = decideAction({
      mostRecentStatus: "ok",
      consecutiveBrokenDays: 0,
      consecutiveOkDays: 2,
      hasOpenFlag: true,
    });
    expect(action).toBe("noop");
  });

  it("is idempotent: returns 'noop' when ok >= 3 but no flag is open", () => {
    const action = decideAction({
      mostRecentStatus: "ok",
      consecutiveBrokenDays: 0,
      consecutiveOkDays: 5,
      hasOpenFlag: false,
    });
    expect(action).toBe("noop");
  });

  it("returns 'noop' for any other state", () => {
    expect(
      decideAction({
        mostRecentStatus: "ok",
        consecutiveBrokenDays: 0,
        consecutiveOkDays: 0,
        hasOpenFlag: false,
      })
    ).toBe("noop");
  });
});

describe("integration: consecutive-run + decide", () => {
  it("end-to-end: 7 broken days with no flag => penalize", () => {
    const records = Array.from({ length: 7 }, (_, i) => rec("s1", i, "broken"));
    const runs = computeConsecutiveRuns(records, NOW);
    const state = runs.get("s1")!;
    const action = decideAction({ ...state, hasOpenFlag: false });
    expect(action).toBe("penalize");
  });

  it("end-to-end: 7 broken days then 3 ok days, with flag => recover", () => {
    const records = [
      ...Array.from({ length: 7 }, (_, i) => rec("s1", i + 3, "broken")),
      rec("s1", 0, "ok"),
      rec("s1", 1, "ok"),
      rec("s1", 2, "ok"),
    ];
    const runs = computeConsecutiveRuns(records, NOW);
    const state = runs.get("s1")!;
    expect(state.consecutiveOkDays).toBe(3);
    const action = decideAction({ ...state, hasOpenFlag: true });
    expect(action).toBe("recover");
  });

  it("idempotency: re-decide with flag still open returns noop", () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      rec("s1", i, "broken")
    );
    const runs = computeConsecutiveRuns(records, NOW);
    const state = runs.get("s1")!;
    // First pass would penalize; second pass (flag already open) is noop.
    expect(decideAction({ ...state, hasOpenFlag: true })).toBe("noop");
  });
});
