import { beforeEach, describe, expect, it } from "vitest";
import {
  RUNG_STORAGE_PREFIX,
  getStoredRung,
  persistRungIfEarned,
} from "@/lib/quiz/rung-storage";

describe("rung-storage (Epic 10, Story 10.9, ETNI-1136, FR68)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // @req REQ-103 FR68
  it("returns null when no rung has been persisted for a segment", () => {
    expect(getStoredRung("adults")).toBeNull();
  });

  // @req REQ-103 FR68
  it("persists the next rung and returns it when the session finishes at >= 75% correct", () => {
    const next = persistRungIfEarned("adults", 2, 0.75);

    expect(next).toBe(3);
    expect(getStoredRung("adults")).toBe(3);
  });

  // @req REQ-103 FR68
  it("does not persist and returns null when the session finishes below 75% correct", () => {
    const next = persistRungIfEarned("adults", 2, 0.6);

    expect(next).toBeNull();
    expect(getStoredRung("adults")).toBeNull();
  });

  // @req REQ-103 FR68
  it("caps the next rung at the segment's maximum difficulty", () => {
    const next = persistRungIfEarned("children", 2, 1);

    expect(next).toBe(2);
    expect(getStoredRung("children")).toBe(2);
  });

  // @req REQ-103 FR68
  it("keys persistence per segment so segments never collide", () => {
    persistRungIfEarned("adults", 2, 1);
    persistRungIfEarned("teens", 1, 1);

    expect(getStoredRung("adults")).toBe(3);
    expect(getStoredRung("teens")).toBe(2);
    expect(window.localStorage.getItem(`${RUNG_STORAGE_PREFIX}:adults`)).toBe(
      "3"
    );
  });

  // @req REQ-103 FR68
  it("sends nothing to the server — pure localStorage, no fetch involved", () => {
    const originalFetch = global.fetch;
    let called = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = () => {
      called = true;
      throw new Error("fetch must not be called");
    };

    persistRungIfEarned("adults", 2, 1);

    expect(called).toBe(false);
    global.fetch = originalFetch;
  });
});
