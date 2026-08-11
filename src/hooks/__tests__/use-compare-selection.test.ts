import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCompareSelection } from "../use-compare-selection";
import type { CompareCandidate } from "../use-compare-selection";

const yoruba: CompareCandidate = {
  id: "PPL_YORUBA",
  type: "peoples",
  exonym: "Yoruba",
  autonym: "Yorùbá",
};
const zulu: CompareCandidate = {
  id: "PPL_ZULU",
  type: "peoples",
  exonym: "Zulu",
  autonym: "AmaZulu",
};
const shona: CompareCandidate = {
  id: "PPL_SHONA",
  type: "peoples",
  exonym: "Shona",
};
const igbo: CompareCandidate = {
  id: "PPL_IGBO",
  type: "peoples",
  exonym: "Igbo",
};
const senegal: CompareCandidate = {
  id: "SEN",
  type: "countries",
  exonym: "Sénégal",
};

describe("useCompareSelection", () => {
  // @req REQ-097
  it("starts empty with no locked type", () => {
    const { result } = renderHook(() => useCompareSelection());
    expect(result.current.selected).toEqual([]);
    expect(result.current.lockedType).toBeNull();
    expect(result.current.count).toBe(0);
    expect(result.current.canCompare).toBe(false);
    expect(result.current.maxReached).toBe(false);
  });

  // @req REQ-097
  it("adds an entity and locks the type", () => {
    const { result } = renderHook(() => useCompareSelection());
    act(() => {
      result.current.add(yoruba);
    });
    expect(result.current.selected).toEqual([yoruba]);
    expect(result.current.lockedType).toBe("peoples");
    expect(result.current.count).toBe(1);
    expect(result.current.canCompare).toBe(false);
  });

  // @req REQ-097
  it("allows comparing once 2 entities of the same type are selected", () => {
    const { result } = renderHook(() => useCompareSelection());
    act(() => {
      result.current.add(yoruba);
    });
    act(() => {
      result.current.add(zulu);
    });
    expect(result.current.count).toBe(2);
    expect(result.current.canCompare).toBe(true);
    expect(result.current.maxReached).toBe(false);
  });

  // @req REQ-097
  it("rejects a 4th selection once 3 entities are selected (3 maximum)", () => {
    const { result } = renderHook(() => useCompareSelection());
    act(() => {
      result.current.add(yoruba);
    });
    act(() => {
      result.current.add(zulu);
    });
    act(() => {
      result.current.add(shona);
    });
    expect(result.current.count).toBe(3);
    expect(result.current.maxReached).toBe(true);

    let outcome: ReturnType<typeof result.current.add> | undefined;
    act(() => {
      outcome = result.current.add(igbo);
    });
    expect(outcome).toEqual({ ok: false, reason: "max-reached" });
    expect(result.current.count).toBe(3);
    expect(result.current.selected).not.toContainEqual(igbo);
  });

  // @req REQ-097
  it("rejects an entity of a different type once the type is locked", () => {
    const { result } = renderHook(() => useCompareSelection());
    act(() => {
      result.current.add(yoruba);
    });
    let outcome: ReturnType<typeof result.current.add> | undefined;
    act(() => {
      outcome = result.current.add(senegal);
    });
    expect(outcome).toEqual({ ok: false, reason: "type-locked" });
    expect(result.current.selected).toEqual([yoruba]);
    expect(result.current.lockedType).toBe("peoples");
  });

  // @req REQ-097
  it("rejects a duplicate id", () => {
    const { result } = renderHook(() => useCompareSelection());
    act(() => {
      result.current.add(yoruba);
    });
    let outcome: ReturnType<typeof result.current.add> | undefined;
    act(() => {
      outcome = result.current.add(yoruba);
    });
    expect(outcome).toEqual({ ok: false, reason: "duplicate" });
    expect(result.current.count).toBe(1);
  });

  // @req REQ-097
  it("removes an entity and unlocks the type once selection is empty", () => {
    const { result } = renderHook(() => useCompareSelection());
    act(() => {
      result.current.add(yoruba);
    });
    act(() => {
      result.current.remove("PPL_YORUBA");
    });
    expect(result.current.selected).toEqual([]);
    expect(result.current.lockedType).toBeNull();
  });

  // @req REQ-097
  it("clears the whole selection", () => {
    const { result } = renderHook(() => useCompareSelection());
    act(() => {
      result.current.add(yoruba);
    });
    act(() => {
      result.current.add(zulu);
    });
    act(() => {
      result.current.clear();
    });
    expect(result.current.selected).toEqual([]);
    expect(result.current.lockedType).toBeNull();
    expect(result.current.count).toBe(0);
  });

  // @req REQ-097
  it("announces additions using autonym when available", () => {
    const { result } = renderHook(() => useCompareSelection());
    act(() => {
      result.current.add(yoruba);
    });
    expect(result.current.announcement).toBe(
      "Yorùbá ajouté à la comparaison, 1 sur 3"
    );
  });

  // @req REQ-097
  it("announces additions using exonym when autonym is missing", () => {
    const { result } = renderHook(() => useCompareSelection());
    act(() => {
      result.current.add(shona);
    });
    expect(result.current.announcement).toBe(
      "Shona ajouté à la comparaison, 1 sur 3"
    );
  });

  // @req REQ-097
  it("announces removals", () => {
    const { result } = renderHook(() => useCompareSelection());
    act(() => {
      result.current.add(yoruba);
    });
    act(() => {
      result.current.remove("PPL_YORUBA");
    });
    expect(result.current.announcement).toBe(
      "Yorùbá retiré de la comparaison, 0 sur 3"
    );
  });
});
