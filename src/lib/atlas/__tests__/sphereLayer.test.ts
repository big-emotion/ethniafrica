import { beforeAll, describe, expect, it, vi } from "vitest";

import { createSphereLayer, fitScale } from "@/lib/atlas/sphereLayer";
import { buildSphereMesh, flatHalfExtent } from "@/lib/atlas/sphereMesh";
import type { GlobePalette } from "@/lib/atlas/globeTexture";
import { buildRotationMatrix } from "@/lib/atlas/projection";

const palette: GlobePalette = {
  ocean: "#191009",
  graticule: "#3b2d1a",
  graticuleMajor: "#443521",
  land: "#6b4a22",
  landFar: "rgba(241,231,216,0.40)",
  coast: "#e8b96a",
  equator: "#7a8ce8",
  tissot: "rgba(51,163,144,0.30)",
  tissotEdge: "#33a390",
};

function fakeGl() {
  return {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    ARRAY_BUFFER: 3,
    ELEMENT_ARRAY_BUFFER: 4,
    STATIC_DRAW: 5,
    FLOAT: 6,
    TRIANGLES: 7,
    UNSIGNED_SHORT: 8,
    TEXTURE_2D: 9,
    TEXTURE0: 10,
    RGBA: 11,
    UNSIGNED_BYTE: 12,
    TEXTURE_MIN_FILTER: 13,
    TEXTURE_MAG_FILTER: 14,
    TEXTURE_WRAP_S: 15,
    TEXTURE_WRAP_T: 16,
    LINEAR: 17,
    REPEAT: 18,
    CLAMP_TO_EDGE: 19,
    COMPILE_STATUS: 20,
    LINK_STATUS: 21,
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
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn((_p: unknown, name: string) => name),
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    activeTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    drawElements: vi.fn(),
    deleteTexture: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteProgram: vi.fn(),
  };
}

/** A texture canvas whose 2D context records the colours it is given. */
function recordingTextureCanvas() {
  const fillStyles: string[] = [];
  const context = {
    set fillStyle(value: string) {
      fillStyles.push(value);
    },
    strokeStyle: "",
    lineWidth: 0,
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
  };
  const canvas = document.createElement("canvas");
  vi.spyOn(canvas, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D
  );
  return { canvas, fillStyles };
}

function textureCanvas() {
  const canvas = document.createElement("canvas");
  vi.spyOn(canvas, "getContext").mockReturnValue(
    null as unknown as CanvasRenderingContext2D
  );
  return canvas;
}

const identity = buildRotationMatrix(0, 0);

describe("sphereLayer — the shared textured globe (REQ-112)", () => {
  beforeAll(() => {
    if (typeof globalThis.Path2D === "undefined") {
      globalThis.Path2D = class {
        constructor(readonly d?: string) {}
      } as unknown as typeof Path2D;
    }
  });

  // @req REQ-112
  it("uploads both morph states and the index buffer once at creation", () => {
    const gl = fakeGl();

    createSphereLayer(
      gl as unknown as WebGLRenderingContext,
      palette,
      textureCanvas()
    );

    const uploaded = gl.bufferData.mock.calls.map(([, data]) => data);
    const mesh = buildSphereMesh();
    expect(uploaded).toHaveLength(4);
    expect(uploaded[0]).toHaveLength(mesh.spherePositions.length);
    expect(uploaded[1]).toHaveLength(mesh.flatPositions.length);
    expect(uploaded[2]).toHaveLength(mesh.uvs.length);
    expect(uploaded[3]).toHaveLength(mesh.indices.length);
  });

  // @req REQ-112
  it("returns null rather than a half-built layer when the program fails", () => {
    const gl = fakeGl();
    gl.createProgram.mockReturnValueOnce(null as unknown as object);

    expect(
      createSphereLayer(
        gl as unknown as WebGLRenderingContext,
        palette,
        textureCanvas()
      )
    ).toBeNull();
  });

  // @req REQ-112
  it("draws the whole indexed mesh as triangles, not points", () => {
    const gl = fakeGl();
    const layer = createSphereLayer(
      gl as unknown as WebGLRenderingContext,
      palette,
      textureCanvas()
    );

    layer!.draw({ rotation: identity, morph: 1, aspect: 1.5 });

    expect(gl.drawElements).toHaveBeenCalledWith(
      gl.TRIANGLES,
      buildSphereMesh().indices.length,
      gl.UNSIGNED_SHORT,
      0
    );
  });

  // @req REQ-112
  it("passes the drawn rotation and morph through to the shader", () => {
    const gl = fakeGl();
    const layer = createSphereLayer(
      gl as unknown as WebGLRenderingContext,
      palette,
      textureCanvas()
    );
    const rotation = buildRotationMatrix(0.4, 0.2);

    layer!.draw({ rotation, morph: 0.25, aspect: 2 });

    expect(gl.uniformMatrix3fv).toHaveBeenCalledWith(
      "uRotation",
      false,
      new Float32Array(rotation)
    );
    expect(gl.uniform1f).toHaveBeenCalledWith("uMorph", 0.25);
  });

  // A caller that knows nothing of the atlas camera — the still hero globe
  // — must keep the framing it had before the camera existed, so the
  // identity transform is the default rather than something every caller
  // has to remember to pass.
  // @req REQ-112
  it("leaves the body where it fits when no camera is given", () => {
    const gl = fakeGl();
    const layer = createSphereLayer(
      gl as unknown as WebGLRenderingContext,
      palette,
      textureCanvas()
    );

    layer!.draw({ rotation: buildRotationMatrix(0, 0), morph: 1, aspect: 1 });

    expect(gl.uniform1f).toHaveBeenCalledWith("uZoom", 1);
    expect(gl.uniform2f).toHaveBeenCalledWith("uOffset", 0, 0);
  });

  // On a fiche this layer is the ground under an entity outline. Both ride
  // the atlas camera, so a dolly the terrain ignored would leave the
  // boundary tracing a coastline that had moved out from under it.
  // @req REQ-112
  it("applies the camera dolly and panel bias it is handed", () => {
    const gl = fakeGl();
    const layer = createSphereLayer(
      gl as unknown as WebGLRenderingContext,
      palette,
      textureCanvas()
    );

    layer!.draw({
      rotation: buildRotationMatrix(0, 0),
      morph: 1,
      aspect: 1,
      zoom: 2.5,
      offsetX: -0.38,
      offsetY: 0.1,
    });

    expect(gl.uniform1f).toHaveBeenCalledWith("uZoom", 2.5);
    expect(gl.uniform2f).toHaveBeenCalledWith("uOffset", -0.38, 0.1);
  });

  // The indicatrices are a teal instrument laid over the terrain; on a
  // fiche they would sit under the entity overlay and read as data the
  // corpus does not hold. They are opt-in for that reason.
  // @req REQ-112
  it("leaves the indicatrices off unless a caller asks for them", () => {
    const painted = recordingTextureCanvas();

    createSphereLayer(
      fakeGl() as unknown as WebGLRenderingContext,
      palette,
      painted.canvas
    );
    expect(painted.fillStyles).not.toContain(palette.tissot);

    createSphereLayer(
      fakeGl() as unknown as WebGLRenderingContext,
      palette,
      painted.canvas,
      1,
      true
    );
    expect(painted.fillStyles).toContain(palette.tissot);
  });

  // @req REQ-112
  it("repaints and re-uploads the texture when the discs are toggled", () => {
    const gl = fakeGl();
    const layer = createSphereLayer(
      gl as unknown as WebGLRenderingContext,
      palette,
      textureCanvas()
    );
    const uploadsAtStart = gl.texImage2D.mock.calls.length;

    layer!.setTissot(true);

    expect(gl.texImage2D.mock.calls.length).toBe(uploadsAtStart + 1);
    expect(gl.bufferData).toHaveBeenCalledTimes(4);
  });

  // @req REQ-112
  it("stops drawing once disposed", () => {
    const gl = fakeGl();
    const layer = createSphereLayer(
      gl as unknown as WebGLRenderingContext,
      palette,
      textureCanvas()
    );

    layer!.dispose();
    layer!.draw({ rotation: identity, morph: 1, aspect: 1 });

    expect(gl.drawElements).not.toHaveBeenCalled();
    expect(gl.deleteProgram).toHaveBeenCalled();
  });
});

describe("fitScale — framing both states (REQ-112)", () => {
  // The flat Mercator map is π wide against the sphere's radius of 1, so a
  // fixed scale would either crop the map or shrink the globe to a dot.
  // @req REQ-112
  it("zooms out for the flat map and back in for the sphere", () => {
    expect(fitScale(0, 1.6)).toBeLessThan(fitScale(1, 1.6));
  });

  // @req REQ-112
  it("keeps the sphere inside the canvas on any aspect", () => {
    for (const aspect of [0.6, 1, 1.6, 2.4]) {
      expect(fitScale(1, aspect)).toBeLessThanOrEqual(1);
      expect(fitScale(1, aspect) * 1).toBeLessThanOrEqual(1);
    }
  });

  // @req REQ-112
  it("fits the flat map's full height on a tall canvas", () => {
    const { halfHeight } = flatHalfExtent();

    expect(fitScale(0, 0.5) * halfHeight).toBeLessThanOrEqual(1);
  });
});

// createSphereLayer already promised its caller null on failure — the hero
// and the fiche both restore their committed SVG basemap on it. But a
// driver that refuses a shader says so through COMPILE_STATUS, not by
// returning a falsy handle, so an unusable program was being handed back as
// if it worked and the canvas went blank instead of falling back.
describe("sphereLayer — refuses an unusable program (REQ-112)", () => {
  // @req REQ-112
  it("returns null when a shader will not compile", () => {
    const gl = fakeGl();
    gl.getShaderParameter = vi.fn(() => false);

    const layer = createSphereLayer(
      gl as unknown as WebGLRenderingContext,
      palette,
      textureCanvas()
    );

    expect(layer).toBeNull();
  });

  // @req REQ-112
  it("returns null when the program will not link", () => {
    const gl = fakeGl();
    gl.getProgramParameter = vi.fn(() => false);

    const layer = createSphereLayer(
      gl as unknown as WebGLRenderingContext,
      palette,
      textureCanvas()
    );

    expect(layer).toBeNull();
  });

  // A refused program still allocated GL objects; leaving them attached to
  // a context the page keeps using is a leak on exactly the low-end devices
  // most likely to hit this path.
  // @req REQ-112
  it("releases what it allocated before giving up", () => {
    const gl = fakeGl();
    gl.getProgramParameter = vi.fn(() => false);

    createSphereLayer(
      gl as unknown as WebGLRenderingContext,
      palette,
      textureCanvas()
    );

    expect(gl.deleteProgram).toHaveBeenCalled();
    expect(gl.deleteShader).toHaveBeenCalled();
  });
});
