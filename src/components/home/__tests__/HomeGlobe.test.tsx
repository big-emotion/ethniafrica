import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HomeGlobe } from "@/components/home/HomeGlobe";

const { africaDotsMock } = vi.hoisted(() => ({
  africaDotsMock: vi.fn(() => [
    [0.5, 0.02, 0] as const,
    [0.4, 0.5, 0] as const,
    [0.6, 0.9, 0] as const,
  ]),
}));

vi.mock("@/lib/continentDots", () => ({
  africaDots: africaDotsMock,
}));

function createFakeGl() {
  return {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    ARRAY_BUFFER: 3,
    STATIC_DRAW: 4,
    FLOAT: 5,
    BLEND: 6,
    SRC_ALPHA: 7,
    ONE_MINUS_SRC_ALPHA: 8,
    COLOR_BUFFER_BIT: 9,
    POINTS: 10,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    clearColor: vi.fn(),
    enable: vi.fn(),
    blendFunc: vi.fn(),
    clear: vi.fn(),
    viewport: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniform1f: vi.fn(),
    uniform4f: vi.fn(),
    drawArrays: vi.fn(),
  };
}

describe("HomeGlobe", () => {
  let fakeGl: ReturnType<typeof createFakeGl>;
  let matchMediaMatches: boolean;
  let frameCallbacks: Map<number, FrameRequestCallback>;
  let nextFrameId: number;
  let matchMediaDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    africaDotsMock.mockClear();
    fakeGl = createFakeGl();
    matchMediaMatches = false;
    frameCallbacks = new Map();
    nextFrameId = 1;

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => fakeGl as unknown as RenderingContext
    );
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      () => 300
    );
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
      () => 200
    );

    matchMediaDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "matchMedia"
    );
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        get matches() {
          return matchMediaMatches;
        },
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      const id = nextFrameId++;
      frameCallbacks.set(id, cb);
      return id;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      frameCallbacks.delete(id);
    });

    class IntersectionObserverMock {
      disconnect = vi.fn();
      observe = vi.fn();
      takeRecords = vi.fn(() => []);
      unobserve = vi.fn();
      constructor(_callback: IntersectionObserverCallback) {}
    }
    class ResizeObserverMock {
      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
      constructor(_callback: ResizeObserverCallback) {}
    }
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (matchMediaDescriptor) {
      Object.defineProperty(window, "matchMedia", matchMediaDescriptor);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  });

  function rotateSurface() {
    return screen.getByRole("button", {
      name: /Globe interactif de l'Afrique/,
    });
  }

  // @req REQ-112
  it("renders a decorative canvas behind an accessible, keyboard-focusable rotate surface", () => {
    render(<HomeGlobe />);

    const canvas = document.querySelector("canvas");
    expect(canvas).toHaveAttribute("aria-hidden", "true");

    const surface = rotateSurface();
    expect(surface.tagName).toBe("BUTTON");
    expect(surface).toHaveAccessibleName();
  });

  // @req REQ-112
  it("exposes a real button to morph between the globe and the flat view", () => {
    render(<HomeGlobe />);

    const toggle = screen.getByTestId("home-globe-morph-toggle");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  // @req REQ-112
  it("never throws when no WebGL context can be created", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    expect(() => render(<HomeGlobe />)).not.toThrow();
    expect(rotateSurface()).toBeInTheDocument();
  });

  // @req REQ-112
  it("builds the shader program and uploads sphere + flat geometry once a WebGL context exists", () => {
    render(<HomeGlobe />);

    expect(africaDotsMock).toHaveBeenCalledOnce();
    expect(fakeGl.createShader).toHaveBeenCalledWith(fakeGl.VERTEX_SHADER);
    expect(fakeGl.createShader).toHaveBeenCalledWith(fakeGl.FRAGMENT_SHADER);
    expect(fakeGl.linkProgram).toHaveBeenCalledOnce();
    expect(fakeGl.bufferData).toHaveBeenCalledTimes(2);
  });

  // @req REQ-112
  it("runs a continuous render loop and rotates automatically when motion is not reduced", () => {
    render(<HomeGlobe />);

    expect(window.requestAnimationFrame).toHaveBeenCalledOnce();
    const firstFrame = frameCallbacks.get(1);
    if (!firstFrame)
      throw new Error("expected the first frame to be scheduled");
    act(() => firstFrame(16));

    expect(fakeGl.drawArrays).toHaveBeenCalledOnce();
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  // @req REQ-112
  it("draws exactly one still frame and schedules no animation loop under reduced motion", () => {
    matchMediaMatches = true;
    render(<HomeGlobe />);

    expect(fakeGl.drawArrays).toHaveBeenCalledOnce();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  // @req REQ-112
  it("redraws once per keyboard arrow press under reduced motion, without starting a loop", () => {
    matchMediaMatches = true;
    render(<HomeGlobe />);
    expect(fakeGl.drawArrays).toHaveBeenCalledOnce();

    fireEvent.keyDown(rotateSurface(), { key: "ArrowRight" });
    expect(fakeGl.drawArrays).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(rotateSurface(), { key: "ArrowUp" });
    expect(fakeGl.drawArrays).toHaveBeenCalledTimes(3);

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  // @req REQ-112
  it("redraws while pointer-dragging under reduced motion", () => {
    matchMediaMatches = true;
    render(<HomeGlobe />);
    const surface = rotateSurface();
    Object.assign(surface, { setPointerCapture: vi.fn() });

    fireEvent.pointerDown(surface, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(surface, { clientX: 120, clientY: 90, pointerId: 1 });

    expect(fakeGl.drawArrays).toHaveBeenCalledTimes(2);

    fireEvent.pointerUp(surface, { pointerId: 1 });
    fireEvent.pointerMove(surface, { clientX: 140, clientY: 80, pointerId: 1 });
    expect(fakeGl.drawArrays).toHaveBeenCalledTimes(2);
  });

  // @req REQ-112
  it("jumps the morph instantly (no tween) when toggled under reduced motion", () => {
    matchMediaMatches = true;
    render(<HomeGlobe />);
    expect(fakeGl.drawArrays).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTestId("home-globe-morph-toggle"));

    expect(fakeGl.drawArrays).toHaveBeenCalledTimes(2);
    expect(fakeGl.uniform1f).toHaveBeenCalledWith(expect.anything(), 1);
  });

  // @req REQ-115
  it("renders the morph toggle inside the same root that fills the stage as the canvas, not a page-level floater", () => {
    render(<HomeGlobe />);

    const toggle = screen.getByTestId("home-globe-morph-toggle");
    const canvas = document.querySelector("canvas");

    expect(canvas).not.toBeNull();
    expect(toggle.parentElement).toBe(canvas?.parentElement?.parentElement);
  });

  // @req REQ-112
  it("cancels the pending animation frame on unmount and stops responding to resize", () => {
    const { unmount } = render(<HomeGlobe />);
    expect(window.requestAnimationFrame).toHaveBeenCalledOnce();

    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);

    act(() => window.dispatchEvent(new Event("resize")));
    expect(fakeGl.drawArrays).not.toHaveBeenCalled();
  });
});
