import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePrefersReducedMotion } from "../use-prefers-reduced-motion";

describe("usePrefersReducedMotion", () => {
  let matches: boolean;
  let changeListener: (() => void) | undefined;
  let matchMediaDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    matches = false;
    changeListener = undefined;
    matchMediaDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "matchMedia"
    );

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        get matches() {
          return matches;
        },
        media: query,
        onchange: null,
        addEventListener: vi.fn((_event: string, listener: () => void) => {
          changeListener = listener;
        }),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    if (matchMediaDescriptor) {
      Object.defineProperty(window, "matchMedia", matchMediaDescriptor);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  });

  // @req REQ-112
  it("queries prefers-reduced-motion: reduce", () => {
    renderHook(() => usePrefersReducedMotion());
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)"
    );
  });

  // @req REQ-112
  it("returns false when the OS has no reduced-motion preference", () => {
    matches = false;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  // @req REQ-112
  it("returns true when the OS prefers reduced motion", () => {
    matches = true;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  // @req REQ-112
  it("reacts to a live change of the media query", () => {
    matches = false;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    matches = true;
    act(() => changeListener?.());

    expect(result.current).toBe(true);
  });
});
