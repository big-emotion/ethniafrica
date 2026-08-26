import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FLATTEN_DURATION_MS, useGlobeMorph } from "@/hooks/use-globe-morph";

describe("useGlobeMorph", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // @req REQ-116
  it("starts on the sphere", () => {
    const { result } = renderHook(() => useGlobeMorph(false, false));

    expect(result.current).toBe(1);
  });

  // Reduced motion is not a faster flattening, it is none: the surface is
  // already flat on the render that asks for it, so nothing is unreachable
  // while an animation the reader opted out of plays.
  // @req REQ-116
  it("lands flat immediately under reduced motion, with no frame loop", () => {
    const { result, rerender } = renderHook(
      ({ flattened }) => useGlobeMorph(flattened, true),
      { initialProps: { flattened: false } }
    );

    rerender({ flattened: true });

    expect(result.current).toBe(0);
  });

  // @req REQ-116
  it("travels from sphere to plane over the flatten duration", () => {
    const { result, rerender } = renderHook(
      ({ flattened }) => useGlobeMorph(flattened, false),
      { initialProps: { flattened: false } }
    );

    rerender({ flattened: true });
    act(() => {
      vi.advanceTimersByTime(FLATTEN_DURATION_MS / 2);
    });

    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(1);

    act(() => {
      vi.advanceTimersByTime(FLATTEN_DURATION_MS);
    });

    expect(result.current).toBe(0);
  });

  // @req REQ-116
  it("comes back to the sphere when the reader unflattens it", () => {
    const { result, rerender } = renderHook(
      ({ flattened }) => useGlobeMorph(flattened, false),
      { initialProps: { flattened: true } }
    );

    act(() => {
      vi.advanceTimersByTime(FLATTEN_DURATION_MS * 2);
    });
    rerender({ flattened: false });
    act(() => {
      vi.advanceTimersByTime(FLATTEN_DURATION_MS * 2);
    });

    expect(result.current).toBe(1);
  });
});
