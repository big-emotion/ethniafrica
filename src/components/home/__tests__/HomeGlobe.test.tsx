import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HomeGlobe } from "@/components/home/HomeGlobe";
import { rotateSpherePoint, type Mat3 } from "@/lib/atlas/projection";

const { createSphereLayerMock, drawMock, disposeMock, setTissotMock } =
  vi.hoisted(() => ({
    createSphereLayerMock: vi.fn(),
    drawMock: vi.fn(),
    disposeMock: vi.fn(),
    setTissotMock: vi.fn(),
  }));

vi.mock("@/lib/atlas/sphereLayer", () => ({
  createSphereLayer: createSphereLayerMock,
}));

vi.mock("@/lib/atlas/globePalette", () => ({
  resolveGlobePalette: () => ({
    ocean: "#191009",
    graticule: "#3b2d1a",
    graticuleMajor: "#443521",
    land: "#6b4a22",
    coast: "#e8b96a",
    equator: "#7a8ce8",
  }),
}));

function fakeGl() {
  return {
    COLOR_BUFFER_BIT: 1,
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
  };
}

describe("HomeGlobe — the hero's textured sphere (REQ-112)", () => {
  let matchMediaMatches: boolean;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrameId: number;
  let cancelled: number[];
  let matchMediaDescriptor: PropertyDescriptor | undefined;

  const runFrames = (count: number) => {
    for (let i = 0; i < count; i++) {
      const pending = [...frames.entries()];
      frames.clear();
      act(() => {
        pending.forEach(([, callback]) => callback(performance.now()));
      });
    }
  };

  beforeEach(() => {
    createSphereLayerMock.mockReset();
    drawMock.mockReset();
    disposeMock.mockReset();
    setTissotMock.mockReset();
    createSphereLayerMock.mockReturnValue({
      draw: drawMock,
      dispose: disposeMock,
      setTissot: setTissotMock,
    });

    matchMediaMatches = false;
    frames = new Map();
    nextFrameId = 1;
    cancelled = [];

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => fakeGl() as unknown as RenderingContext
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
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    });

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      const id = nextFrameId++;
      frames.set(id, cb);
      return id;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      cancelled.push(id);
      frames.delete(id);
    });

    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(private readonly callback: IntersectionObserverCallback) {}
        observe(target: Element) {
          this.callback(
            [{ target, isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver
          );
        }
        unobserve() {}
        disconnect() {}
      }
    );
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (matchMediaDescriptor) {
      Object.defineProperty(window, "matchMedia", matchMediaDescriptor);
    }
  });

  // @req REQ-112
  it("puts a decorative canvas behind a keyboard-focusable rotate surface", () => {
    render(<HomeGlobe />);

    const surface = screen.getByRole("button", { name: /globe interactif/i });
    const canvas = surface.querySelector("canvas");

    expect(canvas).not.toBeNull();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  // @req REQ-112
  it("mounts the shared sphere layer rather than drawing its own geometry", () => {
    render(<HomeGlobe />);

    expect(createSphereLayerMock).toHaveBeenCalledTimes(1);
    expect(drawMock).toHaveBeenCalled();
  });

  // @req REQ-112
  it("renders nothing rather than throwing when WebGL is unavailable", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    expect(() => render(<HomeGlobe />)).not.toThrow();
    expect(createSphereLayerMock).not.toHaveBeenCalled();
  });

  // @req REQ-112
  it("survives a layer the context refused to build", () => {
    createSphereLayerMock.mockReturnValue(null);

    expect(() => render(<HomeGlobe />)).not.toThrow();
    expect(drawMock).not.toHaveBeenCalled();
  });

  // The globe does not spin on its own, so an untouched hero must not hold
  // a frame loop open behind the reader's back.
  // @req REQ-112
  it("stops requesting frames once it has settled with no input", () => {
    render(<HomeGlobe />);

    runFrames(40);

    expect(frames.size).toBe(0);
  });

  // @req REQ-112
  it("turns the globe on an arrow key and animates toward the new angle", () => {
    render(<HomeGlobe />);
    runFrames(40);
    drawMock.mockClear();

    const surface = screen.getByRole("button", { name: /globe interactif/i });
    fireEvent.keyDown(surface, { key: "ArrowRight" });
    runFrames(1);

    const yaws = drawMock.mock.calls.map(([state]) => state.rotation);
    expect(yaws.length).toBeGreaterThan(0);
    expect(frames.size).toBeGreaterThan(0);
  });

  /** Where the point currently facing the reader lands after a rotation. */
  const facingPoint = (rotation: number[]) =>
    rotateSpherePoint(rotation as unknown as Mat3, { x: 0, y: 0, z: 1 });

  // Dragging is not a request the globe eases toward: the surface has to
  // stay under the finger, which is what "it does not follow the mouse"
  // meant when the lag was the only response a drag produced.
  // @req REQ-112
  it("moves the globe with the pointer on the very same frame", () => {
    render(<HomeGlobe />);
    drawMock.mockClear();

    const surface = screen.getByRole("button", { name: /globe interactif/i });
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(surface, { clientX: 100, clientY: 0, pointerId: 1 });

    // No frames run: the drag itself painted.
    expect(drawMock).toHaveBeenCalledTimes(1);
    const [state] = drawMock.mock.calls.at(-1)!;
    expect(facingPoint(state.rotation).x).toBeGreaterThan(0.3);
  });

  // @req REQ-112
  it("carries the globe the way the pointer went, on both axes", () => {
    render(<HomeGlobe />);
    const surface = screen.getByRole("button", { name: /globe interactif/i });

    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(surface, { clientX: -100, clientY: 0, pointerId: 1 });
    let [state] = drawMock.mock.calls.at(-1)!;
    // Dragged left: the face that was toward the reader has gone left.
    expect(facingPoint(state.rotation).x).toBeLessThan(-0.4);

    fireEvent.pointerUp(surface, { pointerId: 1 });
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 2 });
    fireEvent.pointerMove(surface, { clientX: 0, clientY: 120, pointerId: 2 });
    [state] = drawMock.mock.calls.at(-1)!;
    // Dragged down: the face has gone down with it.
    expect(facingPoint(state.rotation).y).toBeLessThan(-0.2);
  });

  // The keyboard is the same gesture without a pointer, so it must agree
  // with the drag rather than invert it.
  // @req REQ-112
  it("moves the globe the same way from the arrow keys", () => {
    render(<HomeGlobe />);
    const surface = screen.getByRole("button", { name: /globe interactif/i });
    // The globe opens facing Africa, not longitude zero, so each key is
    // judged by the movement it causes rather than where it lands.
    const facingNow = () =>
      facingPoint(drawMock.mock.calls.at(-1)![0].rotation);

    const start = facingNow();
    fireEvent.keyDown(surface, { key: "ArrowRight" });
    runFrames(200);
    const afterRight = facingNow();

    fireEvent.keyDown(surface, { key: "ArrowUp" });
    runFrames(200);
    const afterUp = facingNow();

    expect(afterRight.x).toBeGreaterThan(start.x);
    expect(afterUp.y).toBeGreaterThan(afterRight.y);
  });

  // @req REQ-112
  it("closes the flat map back into a globe along one continuous slider", () => {
    render(<HomeGlobe />);

    const slider = screen.getByTestId(
      "home-globe-morph-range"
    ) as HTMLInputElement;
    expect(slider.value).toBe("100");

    fireEvent.change(slider, { target: { value: "0" } });
    runFrames(120);

    const [lastState] = drawMock.mock.calls.at(-1)!;
    expect(lastState.morph).toBeLessThan(0.05);
  });

  // A slider is a claim about a continuum: half way has to be half way, not
  // a snap to one end or the other.
  // @req REQ-112
  it("holds an intermediate position rather than snapping to an end", () => {
    render(<HomeGlobe />);

    fireEvent.change(screen.getByTestId("home-globe-morph-range"), {
      target: { value: "50" },
    });
    runFrames(200);

    const [lastState] = drawMock.mock.calls.at(-1)!;
    expect(lastState.morph).toBeGreaterThan(0.45);
    expect(lastState.morph).toBeLessThan(0.55);
  });

  // @req REQ-112
  it("says what the reader is looking at, and updates as it changes", () => {
    render(<HomeGlobe />);

    expect(screen.getByTestId("home-globe-readout")).toHaveTextContent(
      "30,4 M km²"
    );

    fireEvent.change(screen.getByTestId("home-globe-morph-range"), {
      target: { value: "0" },
    });

    expect(screen.getByTestId("home-globe-readout")).toHaveTextContent(
      /Mercator gonfle les surfaces/
    );
  });

  // The indicatrices are the measurable half of the argument, so they are
  // on from the start rather than hidden behind a discovery.
  // @req REQ-112
  it("shows the equal-area discs by default and lets them be dismissed", () => {
    render(<HomeGlobe />);

    const toggle = screen.getByTestId("home-globe-tissot");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(createSphereLayerMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.any(Number),
      true
    );

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(setTissotMock).toHaveBeenCalledWith(false);
  });

  // @req REQ-112
  it("brings the globe home from any angle and any morph", () => {
    render(<HomeGlobe />);

    const surface = screen.getByRole("button", { name: /globe interactif/i });
    fireEvent.keyDown(surface, { key: "ArrowRight" });
    fireEvent.change(screen.getByTestId("home-globe-morph-range"), {
      target: { value: "0" },
    });
    runFrames(120);

    fireEvent.click(screen.getByTestId("home-globe-recentre"));
    runFrames(200);

    const [lastState] = drawMock.mock.calls.at(-1)!;
    expect(lastState.morph).toBeGreaterThan(0.95);
    expect(
      (screen.getByTestId("home-globe-morph-range") as HTMLInputElement).value
    ).toBe("100");
  });

  // @req REQ-112
  it("draws a single still frame and never animates under reduced motion", () => {
    matchMediaMatches = true;
    render(<HomeGlobe />);

    expect(drawMock).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });

  // @req REQ-112
  it("jumps straight to the flat map under reduced motion", () => {
    matchMediaMatches = true;
    render(<HomeGlobe />);
    drawMock.mockClear();

    fireEvent.change(screen.getByTestId("home-globe-morph-range"), {
      target: { value: "0" },
    });

    const [state] = drawMock.mock.calls.at(-1)!;
    expect(state.morph).toBe(0);
    expect(frames.size).toBe(0);
  });

  // @req REQ-112
  it("releases the frame loop and the layer on unmount", () => {
    const { unmount } = render(<HomeGlobe />);

    unmount();

    expect(disposeMock).toHaveBeenCalledTimes(1);
  });
});

// The slider is the whole demonstration: it is what turns "Mercator inflates
// area" from a claim into something the reader watches happen. A screen
// reader was given a bare 0-100 and a paragraph that changed without saying
// so, which is the one reading of this control that carries none of that.
describe("HomeGlobe — the morph control says what it is showing (REQ-112)", () => {
  // @req REQ-112
  it("names the surface rather than reciting a number at each end", () => {
    render(<HomeGlobe />);
    const range = screen.getByTestId("home-globe-morph-range");

    expect(range).toHaveAttribute("aria-valuetext", "Globe");

    fireEvent.change(range, { target: { value: "0" } });
    expect(range).toHaveAttribute("aria-valuetext", "Carte plate");
  });

  // @req REQ-112
  it("names the in-between state instead of falling silent mid-morph", () => {
    render(<HomeGlobe />);
    const range = screen.getByTestId("home-globe-morph-range");

    fireEvent.change(range, { target: { value: "50" } });

    const valueText = range.getAttribute("aria-valuetext");
    expect(valueText).toBeTruthy();
    expect(valueText).not.toBe("Globe");
    expect(valueText).not.toBe("Carte plate");
  });

  // The readout carries the explanation the control exists for, so a change
  // to it has to reach a screen reader without the user going looking.
  // @req REQ-112
  it("announces the explanation politely when the surface changes", () => {
    render(<HomeGlobe />);

    const readout = screen.getByTestId("home-globe-readout");
    expect(readout).toHaveAttribute("aria-live", "polite");
  });
});
