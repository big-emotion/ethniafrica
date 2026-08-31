import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CHARTER_OCRE_HEX,
  DottedContinent,
} from "@/components/home/DottedContinent";

const { africaDotsMock } = vi.hoisted(() => ({
  africaDotsMock: vi.fn(() => [[0.5, 0.5, 0] as const]),
}));

vi.mock("@/lib/continentDots", () => ({
  africaDots: africaDotsMock,
}));

function createIntersectionEntry(
  target: Element,
  isIntersecting: boolean
): IntersectionObserverEntry {
  return {
    boundingClientRect: new DOMRect(),
    intersectionRatio: isIntersecting ? 1 : 0,
    intersectionRect: new DOMRect(),
    isIntersecting,
    rootBounds: null,
    target,
    time: 0,
  };
}

describe("DottedContinent", () => {
  let width: number;
  let height: number;
  let context: CanvasRenderingContext2D;
  let intersectionCallback: IntersectionObserverCallback;
  let observer: IntersectionObserver;
  let resizeCallback: ResizeObserverCallback;
  let resizeObserver: ResizeObserver;
  let frameCallbacks: Map<number, FrameRequestCallback>;
  let nextFrameId: number;
  let devicePixelRatioDescriptor: PropertyDescriptor | undefined;
  let matchMediaDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    africaDotsMock.mockClear();
    width = 300;
    height = 200;
    nextFrameId = 1;
    frameCallbacks = new Map();
    devicePixelRatioDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "devicePixelRatio"
    );
    matchMediaDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "matchMedia"
    );

    context = {
      arc: vi.fn(),
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      fill: vi.fn(),
      fillStyle: "",
      setTransform: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context
    );
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      () => width
    );
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
      () => height
    );

    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 3,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const id = nextFrameId++;
      frameCallbacks.set(id, callback);
      return id;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      frameCallbacks.delete(id);
    });

    class IntersectionObserverMock {
      readonly root = null;
      readonly rootMargin = "0px";
      readonly thresholds = [0.05];

      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback;
        observer = this as unknown as IntersectionObserver;
      }

      disconnect = vi.fn();
      observe = vi.fn();
      takeRecords = vi.fn(() => []);
      unobserve = vi.fn();
    }

    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
        resizeObserver = this as unknown as ResizeObserver;
      }

      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
    }

    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (devicePixelRatioDescriptor) {
      Object.defineProperty(
        window,
        "devicePixelRatio",
        devicePixelRatioDescriptor
      );
    } else {
      Reflect.deleteProperty(window, "devicePixelRatio");
    }
    if (matchMediaDescriptor) {
      Object.defineProperty(window, "matchMedia", matchMediaDescriptor);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  });

  // @req REQ-091
  it("sources the dot color from the charter ochre token (--afh-cat-ocre), not an inline literal", () => {
    const colorCss = readFileSync(
      resolve(process.cwd(), "src/styles/tokens/color.css"),
      "utf8"
    );
    const match = colorCss.match(/--afh-cat-ocre:\s*(#[\dA-Fa-f]{6});/);
    if (!match) throw new Error("Expected --afh-cat-ocre in color.css");

    expect(CHARTER_OCRE_HEX.toLowerCase()).toBe(match[1].toLowerCase());
  });

  // @req REQ-091
  it("renders as a decorative, zero-layout-shift canvas", () => {
    const { container } = render(<DottedContinent />);
    const canvas = container.querySelector("canvas");

    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas?.style.position).toBe("absolute");
    expect(canvas?.style.inset).toBe("0");
    expect(canvas?.style.width).toBe("100%");
    expect(canvas?.style.height).toBe("100%");
    expect(canvas?.style.pointerEvents).toBe("none");
  });

  // @req REQ-091
  it("draws one static projected frame at capped DPR under reduced motion", () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const { container } = render(<DottedContinent />);
    const canvas = container.querySelector("canvas");

    expect(africaDotsMock).toHaveBeenCalledOnce();
    expect(canvas).toHaveProperty("width", 600);
    expect(canvas).toHaveProperty("height", 400);
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(context.arc).toHaveBeenCalledWith(174, 124, 1.6, 0, 7);
    expect(context.fillStyle).toBe("rgba(201,130,31,0.248)");
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  // @req REQ-091
  it("draws the static frame with a caller-provided dot color, proving the RGB channel is not hardcoded", () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    render(<DottedContinent dotColorHex="#33a390" />);

    expect(context.fillStyle).toBe("rgba(51,163,144,0.248)");
  });

  // @req REQ-091
  it("starts after paint, advances the twinkle clock, resizes, and pauses offscreen", () => {
    const { container } = render(<DottedContinent />);
    const canvas = container.querySelector("canvas");
    if (!canvas) throw new Error("Expected the canvas to render");

    expect(context.clearRect).not.toHaveBeenCalled();
    expect(window.requestAnimationFrame).toHaveBeenCalledOnce();
    expect(observer.observe).toHaveBeenCalledWith(canvas);
    expect(resizeObserver.observe).toHaveBeenCalledWith(canvas.parentElement);

    const firstFrame = frameCallbacks.get(1);
    if (!firstFrame) throw new Error("Expected the first animation frame");
    frameCallbacks.delete(1);
    act(() => firstFrame(0));

    const expectedAlpha = (0.45 * (0.38 + 0.3 * Math.sin(1.1 * 0.016))).toFixed(
      3
    );
    expect(context.fillStyle).toBe(`rgba(201,130,31,${expectedAlpha})`);
    expect(context.arc).toHaveBeenLastCalledWith(174, 124, 1.6, 0, 7);

    act(() => {
      intersectionCallback([createIntersectionEntry(canvas, false)], observer);
    });
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(2);
    expect(frameCallbacks).toHaveLength(0);

    width = 400;
    height = 100;
    act(() => resizeCallback([], resizeObserver));
    expect(canvas).toHaveProperty("width", 800);
    expect(canvas).toHaveProperty("height", 200);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);

    act(() => {
      intersectionCallback([createIntersectionEntry(canvas, true)], observer);
    });

    const resumedFrame = frameCallbacks.get(3);
    if (!resumedFrame) throw new Error("Expected animation to resume");
    frameCallbacks.delete(3);
    act(() => resumedFrame(16));
    expect(context.arc).toHaveBeenLastCalledWith(232, 82, 1.6, 0, 7);

    const resumedAlpha = (0.45 * (0.38 + 0.3 * Math.sin(1.1 * 0.032))).toFixed(
      3
    );
    expect(context.fillStyle).toBe(`rgba(201,130,31,${resumedAlpha})`);

    const nextFrame = frameCallbacks.get(4);
    if (!nextFrame) throw new Error("Expected the animation to continue");
    frameCallbacks.delete(4);
    act(() => nextFrame(32));

    const nextAlpha = (0.45 * (0.38 + 0.3 * Math.sin(1.1 * 0.048))).toFixed(3);
    expect(context.fillStyle).toBe(`rgba(201,130,31,${nextAlpha})`);
  });

  // @req REQ-091
  it("cancels animation and disconnects observers on unmount", () => {
    const { unmount } = render(<DottedContinent />);

    expect(window.requestAnimationFrame).toHaveBeenCalledOnce();
    expect(context.setTransform).toHaveBeenCalledOnce();

    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(resizeObserver.disconnect).toHaveBeenCalledOnce();

    act(() => window.dispatchEvent(new Event("resize")));
    expect(context.setTransform).toHaveBeenCalledOnce();
  });
});
