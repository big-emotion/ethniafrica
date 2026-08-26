import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AtlasGlobeCanvas } from "@/components/atlas/AtlasGlobeCanvas";
import type {
  CountryOutlineOverlay,
  FamilyFootprintOverlay,
  PeopleFieldOverlay,
  Ring,
} from "@/lib/atlas/overlays";

const square: Ring = [
  { lon: 0, lat: 0 },
  { lon: 2, lat: 0 },
  { lon: 2, lat: 2 },
  { lon: 0, lat: 2 },
];

const countryOverlay: CountryOutlineOverlay = {
  kind: "country-outline",
  countryId: "ZAF",
  rings: [square],
  fillOpacity: 0.22,
};

const familyOverlay: FamilyFootprintOverlay = {
  kind: "family-footprint",
  countryIds: ["NGA", "BEN"],
  rings: [square],
  memberPeopleCount: 4,
  tint: 0.33,
};

const peopleOverlay: PeopleFieldOverlay = {
  kind: "people-field",
  areas: [
    { countryId: "NGA", center: { lon: 8, lat: 9 }, populationShare: 1 },
    { countryId: "BEN", center: { lon: 2, lat: 9 }, populationShare: 0.3 },
  ],
};

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
    TRIANGLE_FAN: 11,
    LINE_LOOP: 12,
    // The shared sphere layer's own surface (REQ-112). Without these the
    // layer would throw, be caught, and the terrain would silently vanish
    // from under every overlay while the tests still passed.
    ELEMENT_ARRAY_BUFFER: 13,
    TRIANGLES: 14,
    UNSIGNED_SHORT: 15,
    TEXTURE_2D: 16,
    TEXTURE0: 17,
    RGBA: 18,
    UNSIGNED_BYTE: 19,
    TEXTURE_MIN_FILTER: 20,
    TEXTURE_MAG_FILTER: 21,
    TEXTURE_WRAP_S: 22,
    TEXTURE_WRAP_T: 23,
    LINEAR: 24,
    REPEAT: 25,
    CLAMP_TO_EDGE: 26,
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    activeTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    uniform1i: vi.fn(),
    drawElements: vi.fn(),
    deleteTexture: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteProgram: vi.fn(),
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
    disableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttrib1f: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    clearColor: vi.fn(),
    enable: vi.fn(),
    blendFunc: vi.fn(),
    clear: vi.fn(),
    viewport: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniform1f: vi.fn(),
    uniform3f: vi.fn(),
    uniform4f: vi.fn(),
    drawArrays: vi.fn(),
  };
}

/** Absorbs the texture painter's draw calls without asserting on them. */
function fakeTexture2d() {
  return {
    canvas: { width: 0, height: 0 },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
  };
}

describe("AtlasGlobeCanvas", () => {
  let fakeGl: ReturnType<typeof createFakeGl>;
  let matchMediaMatches: boolean;
  let frameCallbacks: Map<number, FrameRequestCallback>;
  let nextFrameId: number;
  let matchMediaDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    fakeGl = createFakeGl();
    matchMediaMatches = false;
    frameCallbacks = new Map();
    nextFrameId = 1;

    // A browser hands back a different object per context type. The sphere
    // layer asks a scratch canvas for "2d" to paint its texture, so a spy
    // that answered WebGL to everything would feed it the wrong object.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      (type: string) =>
        type === "2d"
          ? (fakeTexture2d() as unknown as RenderingContext)
          : (fakeGl as unknown as RenderingContext)
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

  // @req REQ-116
  it("renders a decorative canvas", () => {
    const { container } = render(<AtlasGlobeCanvas overlay={countryOverlay} />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  // @req REQ-116
  it("never throws when no WebGL context can be created", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(() =>
      render(<AtlasGlobeCanvas overlay={countryOverlay} />)
    ).not.toThrow();
  });

  // @req REQ-116 — the people encoding guard: GL_POINTS only, never a line or fill.
  it("draws a people field with GL_POINTS only, never LINE_LOOP or TRIANGLE_FAN", () => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={peopleOverlay} />);

    expect(fakeGl.drawArrays).toHaveBeenCalledWith(
      fakeGl.POINTS,
      0,
      peopleOverlay.areas.length
    );
    expect(fakeGl.drawArrays).not.toHaveBeenCalledWith(
      fakeGl.LINE_LOOP,
      expect.anything(),
      expect.anything()
    );
    expect(fakeGl.drawArrays).not.toHaveBeenCalledWith(
      fakeGl.TRIANGLE_FAN,
      expect.anything(),
      expect.anything()
    );
  });

  // @req REQ-116
  it("draws a country outline as a filled fan plus a stroked line loop per ring", () => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={countryOverlay} />);

    expect(fakeGl.drawArrays).toHaveBeenCalledWith(
      fakeGl.TRIANGLE_FAN,
      0,
      square.length + 2
    );
    expect(fakeGl.drawArrays).toHaveBeenCalledWith(
      fakeGl.LINE_LOOP,
      0,
      square.length
    );
  });

  // @req REQ-116
  it("draws a family footprint as a dashed, tinted fan plus line loop per ring", () => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={familyOverlay} />);

    expect(fakeGl.drawArrays).toHaveBeenCalledWith(
      fakeGl.TRIANGLE_FAN,
      0,
      square.length + 2
    );
    expect(fakeGl.drawArrays).toHaveBeenCalledWith(
      fakeGl.LINE_LOOP,
      0,
      square.length
    );
  });

  // @req REQ-116
  it("starts a country outline's stroke reveal at zero progress and advances it toward one over the next frame", () => {
    render(<AtlasGlobeCanvas overlay={countryOverlay} />);
    fakeGl.uniform1f.mockClear();

    const firstFrame = frameCallbacks.get(1);
    if (!firstFrame)
      throw new Error("expected the first frame to be scheduled");
    act(() => firstFrame(0));

    const secondFrame = frameCallbacks.get(2);
    if (!secondFrame)
      throw new Error("expected a second frame to be scheduled");
    act(() => secondFrame(100));

    const progressCalls = fakeGl.uniform1f.mock.calls.filter(
      ([, value]) => typeof value === "number" && value > 0 && value < 1
    );
    expect(progressCalls.length).toBeGreaterThan(0);
  });

  // @req REQ-116
  it("runs a continuous render loop when motion is not reduced", () => {
    render(<AtlasGlobeCanvas overlay={countryOverlay} />);
    expect(window.requestAnimationFrame).toHaveBeenCalledOnce();
  });

  // @req REQ-116
  it("draws exactly one still frame and schedules no loop under reduced motion", () => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={countryOverlay} />);

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(fakeGl.drawArrays).toHaveBeenCalled();
  });

  // @req REQ-116
  it("cancels the pending animation frame on unmount", () => {
    const { unmount } = render(<AtlasGlobeCanvas overlay={countryOverlay} />);
    expect(window.requestAnimationFrame).toHaveBeenCalledOnce();

    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  // The fiche globe and the home globe stand on the same terrain: an
  // overlay is drawn over the shared textured sphere, not over an empty
  // canvas (REQ-112/REQ-116).
  // @req REQ-116
  it.each([
    ["a country outline", countryOverlay],
    ["a family footprint", familyOverlay],
    ["a people field", peopleOverlay],
  ])("draws the shared textured sphere beneath %s", (_label, overlay) => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={overlay} />);

    expect(fakeGl.drawElements).toHaveBeenCalledWith(
      fakeGl.TRIANGLES,
      expect.any(Number),
      fakeGl.UNSIGNED_SHORT,
      0
    );
  });

  // The sphere layer leaves its own program bound, so an overlay that
  // never rebinds its own would silently write uniforms into the wrong
  // program and draw nothing.
  // @req REQ-116
  it("rebinds the overlay's program after the sphere layer has drawn", () => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={peopleOverlay} />);

    const programCalls = fakeGl.useProgram.mock.calls.length;
    expect(programCalls).toBeGreaterThan(2);
  });

  // atlas-charter §1: whatever the base terrain does, a people is still a
  // field of points and never a closed line.
  // @req REQ-116
  it("keeps the people field on GL_POINTS over the new terrain", () => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={peopleOverlay} />);

    const modes = fakeGl.drawArrays.mock.calls.map(([mode]) => mode);
    expect(modes).toContain(fakeGl.POINTS);
    expect(modes).not.toContain(fakeGl.LINE_LOOP);
  });
});
