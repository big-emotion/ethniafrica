import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AtlasGlobeCanvas } from "@/components/atlas/AtlasGlobeCanvas";
import { IDLE_POSE } from "@/lib/atlas/camera";
import type {
  ContinentFieldOverlay,
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

/** Five points, not four, so a per-country draw is distinguishable from the square's by its vertex count alone. */
const elsewhere: Ring = [
  { lon: 10, lat: 0 },
  { lon: 12, lat: 0 },
  { lon: 13, lat: 1 },
  { lon: 12, lat: 2 },
  { lon: 10, lat: 2 },
];

const familyOverlay: FamilyFootprintOverlay = {
  kind: "family-footprint",
  countries: [
    { countryId: "NGA", rings: [square], memberCount: 4, weight: 1 },
    { countryId: "BEN", rings: [elsewhere], memberCount: 1, weight: 0.25 },
  ],
  memberPeopleCount: 4,
};

const peopleOverlay: PeopleFieldOverlay = {
  kind: "people-field",
  areas: [
    { countryId: "NGA", center: { lon: 8, lat: 9 }, populationShare: 1 },
    { countryId: "BEN", center: { lon: 2, lat: 9 }, populationShare: 0.3 },
  ],
  undrawn: [],
};

const continentOverlay: ContinentFieldOverlay = {
  kind: "continent-field",
  frame: [
    { countryId: "BEN", rings: [square] },
    { countryId: "NGA", rings: [square] },
  ],
  fillOpacity: 0,
  areas: [
    {
      countryId: "NGA",
      center: { lon: 8, lat: 9 },
      documentedPeopleCount: 40,
      documentedPeopleShare: 1,
    },
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
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ""),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ""),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    disableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttrib1f: vi.fn(),
    // Named so a test can say which uniform it is reading. Anonymous objects
    // made every uniform1f call indistinguishable from every other.
    getUniformLocation: vi.fn((_program: unknown, name: string) => ({ name })),
    clearColor: vi.fn(),
    enable: vi.fn(),
    blendFunc: vi.fn(),
    clear: vi.fn(),
    viewport: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
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

/** Float comparison that survives the ramp's arithmetic. */
const closeTo = (expected: number) =>
  expect.closeTo(expected, 5) as unknown as number;

describe("AtlasGlobeCanvas", () => {
  let fakeGl: ReturnType<typeof createFakeGl>;

  /** Values passed to one named uniform, in call order. */
  const uniform1fValues = (name: string): number[] =>
    fakeGl.uniform1f.mock.calls
      .filter(([location]) => location?.name === name)
      .map(([, value]) => value as number);

  /**
   * Fill and stroke draws each set uIsStroke and uDashRepeats once, in order,
   * so the nth value of every uniform sequence describes the nth draw. That is
   * what lets a test say "the stroke draws" without depending on how many
   * shapes came before.
   */
  const strokeFlags = () => uniform1fValues("uIsStroke");

  const colorAlphas = (): number[] =>
    fakeGl.uniform4f.mock.calls
      .filter(([location]) => location?.name === "uColor")
      .map(([, , , , alpha]) => alpha as number);

  const fillAlphas = () =>
    colorAlphas().filter((_alpha, index) => strokeFlags()[index] === 0);

  const dashRepeatsOnStrokes = () =>
    uniform1fValues("uDashRepeats").filter(
      (_repeats, index) => strokeFlags()[index] === 1
    );

  const strokeProgress = () =>
    uniform1fValues("uProgress").filter(
      (_progress, index) => strokeFlags()[index] === 1
    );
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
    const { container } = render(
      <AtlasGlobeCanvas overlay={countryOverlay} pose={IDLE_POSE} />
    );
    const canvas = container.querySelector("canvas");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  /**
   * Decorative all the way down, including for the pointer.
   *
   * AtlasGlobe lays its interaction surface over the stage and then mounts
   * this canvas over that — later in the DOM, positioned, at the same stacking
   * level, so the canvas won every hit test. The globe could not be turned by
   * mouse or finger on any of the three fiches; elementFromPoint at the centre
   * of a shipped stage answered CANVAS. Paint that is aria-hidden has no
   * business taking a pointer either.
   */
  // @req REQ-116
  it("lets the pointer through to the surface it is painted over", () => {
    const { container } = render(
      <AtlasGlobeCanvas overlay={countryOverlay} pose={IDLE_POSE} />
    );
    expect(container.querySelector("canvas")).toHaveStyle({
      pointerEvents: "none",
    });
  });

  // @req REQ-116
  it("never throws when no WebGL context can be created", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(() =>
      render(<AtlasGlobeCanvas overlay={countryOverlay} pose={IDLE_POSE} />)
    ).not.toThrow();
  });

  // @req REQ-116 — the people encoding guard: GL_POINTS only, never a line or fill.
  it("draws a people field with GL_POINTS only, never LINE_LOOP or TRIANGLE_FAN", () => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={peopleOverlay} pose={IDLE_POSE} />);

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
    render(<AtlasGlobeCanvas overlay={countryOverlay} pose={IDLE_POSE} />);

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
    render(<AtlasGlobeCanvas overlay={familyOverlay} pose={IDLE_POSE} />);

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

  /**
   * The continent frame locates, it never measures: its fillOpacity is 0, and
   * skipping the fill pass outright is what makes a per-country area
   * physically impossible to paint rather than merely invisible.
   */
  // @req REQ-116
  it("strokes the continent frame without ever issuing a TRIANGLE_FAN fill", () => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={continentOverlay} pose={IDLE_POSE} />);

    const modes = fakeGl.drawArrays.mock.calls.map(([mode]) => mode);
    expect(modes).toContain(fakeGl.LINE_LOOP);
    expect(modes).not.toContain(fakeGl.TRIANGLE_FAN);
  });

  // @req REQ-116
  it("gives every country of the footprint its own fill and its own outline", () => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={familyOverlay} pose={IDLE_POSE} />);

    // Each country's own geometry reaches the GPU — a four-point ring and a
    // five-point one — rather than one wash over the union of the two.
    expect(fakeGl.drawArrays).toHaveBeenCalledWith(
      fakeGl.TRIANGLE_FAN,
      0,
      square.length + 2
    );
    expect(fakeGl.drawArrays).toHaveBeenCalledWith(
      fakeGl.TRIANGLE_FAN,
      0,
      elsewhere.length + 2
    );
    expect(fakeGl.drawArrays).toHaveBeenCalledWith(
      fakeGl.LINE_LOOP,
      0,
      square.length
    );
    expect(fakeGl.drawArrays).toHaveBeenCalledWith(
      fakeGl.LINE_LOOP,
      0,
      elsewhere.length
    );
  });

  // @req REQ-116
  it("sets each country's fill opacity from its own weight", () => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={familyOverlay} pose={IDLE_POSE} />);

    const alphas = fillAlphas();
    // 0.16 + 0.46 x weight: the densest country at 1, the sparsest at 0.25.
    expect(alphas).toContainEqual(closeTo(0.62));
    expect(alphas).toContainEqual(closeTo(0.275));
  });

  // @req REQ-116
  it("dashes every country's outline, so no country reads as a declared border", () => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={familyOverlay} pose={IDLE_POSE} />);

    const strokeDashRepeats = dashRepeatsOnStrokes();
    expect(strokeDashRepeats.length).toBeGreaterThan(0);
    // Not one solid outline anywhere: a solid line would claim a border the
    // family does not have.
    expect(strokeDashRepeats.every((repeats) => repeats >= 1)).toBe(true);
  });

  // @req REQ-116
  it("lifts the focused country and drops the others behind it", () => {
    matchMediaMatches = true;
    render(
      <AtlasGlobeCanvas
        overlay={familyOverlay}
        pose={IDLE_POSE}
        focusedCountryId="BEN"
      />
    );

    const alphas = fillAlphas();
    // BEN is focused, so it keeps its own ramp value; NGA — the densest
    // country — falls to the dimmed floor despite its weight of 1.
    expect(alphas).toContainEqual(closeTo(0.275));
    expect(alphas).toContainEqual(closeTo(0.12));
    expect(alphas).not.toContainEqual(closeTo(0.62));
  });

  // @req REQ-116
  it("replays the reveal when the focused country changes", () => {
    // Recolouring under the reader is not the same as redrawing around a new
    // subject; the trace has to draw itself in again.
    const { rerender } = render(
      <AtlasGlobeCanvas
        overlay={familyOverlay}
        pose={IDLE_POSE}
        focusedCountryId="NGA"
      />
    );

    // Let the first reveal finish, so a progress of zero afterwards can only
    // mean it restarted.
    const firstFrame = frameCallbacks.get(1);
    if (!firstFrame) throw new Error("expected a first frame");
    act(() => firstFrame(0));
    const secondFrame = frameCallbacks.get(2);
    if (!secondFrame) throw new Error("expected a second frame");
    act(() => secondFrame(5000));
    expect(strokeProgress().at(-1)).toBe(1);

    fakeGl.uniform1f.mockClear();
    rerender(
      <AtlasGlobeCanvas
        overlay={familyOverlay}
        pose={IDLE_POSE}
        focusedCountryId="BEN"
      />
    );

    expect(strokeProgress()).toContain(0);
  });

  // @req REQ-116
  it("starts a country outline's stroke reveal at zero progress and advances it toward one over the next frame", () => {
    render(<AtlasGlobeCanvas overlay={countryOverlay} pose={IDLE_POSE} />);
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
  it("schedules a frame loop for a country outline's trace-in when motion is not reduced", () => {
    render(<AtlasGlobeCanvas overlay={countryOverlay} pose={IDLE_POSE} />);
    expect(window.requestAnimationFrame).toHaveBeenCalledOnce();
  });

  /**
   * The camera moved out of this component (REQ-117), so a fly-to reaches it
   * as successive poses rather than as a loop it drives itself. If a new pose
   * did not repaint, the globe would simply stop following the camera.
   */
  // @req REQ-117
  it("repaints on a new camera pose without re-creating its WebGL programs", () => {
    const { rerender } = render(
      <AtlasGlobeCanvas overlay={countryOverlay} pose={IDLE_POSE} />
    );
    const programsBefore = fakeGl.createProgram.mock.calls.length;
    fakeGl.drawArrays.mockClear();

    rerender(
      <AtlasGlobeCanvas
        overlay={countryOverlay}
        pose={{ ...IDLE_POSE, yaw: IDLE_POSE.yaw + 0.5, zoom: 2 }}
      />
    );

    expect(fakeGl.drawArrays).toHaveBeenCalled();
    expect(fakeGl.createProgram.mock.calls.length).toBe(programsBefore);
  });

  // @req REQ-117
  it("hands the dolly and the panel bias to the shader as it draws", () => {
    render(
      <AtlasGlobeCanvas
        overlay={countryOverlay}
        pose={{ ...IDLE_POSE, zoom: 2.5, offsetX: -0.38, offsetY: 0 }}
      />
    );

    expect(fakeGl.uniform1f).toHaveBeenCalledWith(expect.anything(), 2.5);
    expect(fakeGl.uniform2f).toHaveBeenCalledWith(expect.anything(), -0.38, 0);
  });

  // Terrain and boundary ride one camera. The sphere layer runs its own
  // program, so the dolly and the bias have to reach it separately — miss
  // it and the outline slides off the ground it traces the moment the
  // facts panel opens.
  // @req REQ-117
  it("hands the same dolly and bias to the terrain as to the overlay", () => {
    render(
      <AtlasGlobeCanvas
        overlay={countryOverlay}
        pose={{ ...IDLE_POSE, zoom: 2.5, offsetX: -0.38, offsetY: 0 }}
      />
    );

    const dollies = fakeGl.uniform1f.mock.calls.filter(
      ([, value]) => value === 2.5
    );
    const biases = fakeGl.uniform2f.mock.calls.filter(
      ([, x, y]) => x === -0.38 && y === 0
    );
    expect(dollies.length).toBeGreaterThanOrEqual(2);
    expect(biases.length).toBeGreaterThanOrEqual(2);
  });

  // @req REQ-116
  it("draws exactly one still frame and schedules no loop under reduced motion", () => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={countryOverlay} pose={IDLE_POSE} />);

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(fakeGl.drawArrays).toHaveBeenCalled();
  });

  // @req REQ-116
  it("shows the family trace complete on the first frame under reduced motion", () => {
    // Not an accommodation bolted on afterwards: a reader who asked for less
    // motion must see the finished map, not a map that never finishes drawing.
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={familyOverlay} pose={IDLE_POSE} />);

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(strokeProgress().every((progress) => progress === 1)).toBe(true);
  });

  // @req REQ-116
  it("does not animate the replay under reduced motion either", () => {
    // The replay is the one path that restarts the reveal by hand, so it can
    // reintroduce motion after the initial render honoured the preference.
    matchMediaMatches = true;
    const { rerender } = render(
      <AtlasGlobeCanvas
        overlay={familyOverlay}
        pose={IDLE_POSE}
        focusedCountryId="NGA"
      />
    );

    fakeGl.uniform1f.mockClear();
    rerender(
      <AtlasGlobeCanvas
        overlay={familyOverlay}
        pose={IDLE_POSE}
        focusedCountryId="BEN"
      />
    );

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(strokeProgress()).not.toContain(0);
  });

  // @req REQ-116
  it("cancels the pending animation frame on unmount", () => {
    const { unmount } = render(
      <AtlasGlobeCanvas overlay={countryOverlay} pose={IDLE_POSE} />
    );
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
    render(<AtlasGlobeCanvas overlay={overlay} pose={IDLE_POSE} />);

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
    render(<AtlasGlobeCanvas overlay={peopleOverlay} pose={IDLE_POSE} />);

    const programCalls = fakeGl.useProgram.mock.calls.length;
    expect(programCalls).toBeGreaterThan(2);
  });

  // atlas-charter §1: whatever the base terrain does, a people is still a
  // field of points and never a closed line.
  // @req REQ-116
  it("keeps the people field on GL_POINTS over the new terrain", () => {
    matchMediaMatches = true;
    render(<AtlasGlobeCanvas overlay={peopleOverlay} pose={IDLE_POSE} />);

    const modes = fakeGl.drawArrays.mock.calls.map(([mode]) => mode);
    expect(modes).toContain(fakeGl.POINTS);
    expect(modes).not.toContain(fakeGl.LINE_LOOP);
  });
});
