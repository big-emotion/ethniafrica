import type { ProjectedNode } from "@/lib/home/axisGraphGeometry";

/**
 * The link network behind an opened axis panel (REQ-114): one edge from the
 * opened card to each module node, plus the nodes themselves.
 *
 * It is a plain WebGL module rather than a component, for the same reason
 * src/lib/atlas/sphereLayer.ts is: the panel already owns the canvas, the
 * context and the render loop, and it already knows where every node sits —
 * it has to, since it positions the module cards on those exact points.
 * Handing it a second component would mean a second source of truth for
 * the same coordinates, and links that miss the cards they connect.
 *
 * So the 3D happens upstream, in axisGraphGeometry.projectNode, exactly
 * where src/lib/atlas/projection.ts keeps it for the globe. What is left
 * here is rasterising: soft quads in screen space, depth-faded.
 */

const VERTEX_SHADER = `
  attribute vec2 aPos;
  attribute vec2 aFalloff;
  attribute float aAlpha;
  uniform vec2 uViewport;
  varying vec2 vFalloff;
  varying float vAlpha;

  void main() {
    vFalloff = aFalloff;
    vAlpha = aAlpha;
    // Pixels from the panel centre into clip space; y flips because the
    // panel measures downward and clip space measures up.
    vec2 clip = aPos / (uViewport * 0.5);
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec3 uAccent;
  varying vec2 vFalloff;
  varying float vAlpha;

  void main() {
    // One falloff serves both shapes: across the width for an edge,
    // radially for a node. Both are a unit disc in local coordinates.
    float edge = 1.0 - smoothstep(0.35, 1.0, length(vFalloff));
    gl_FragColor = vec4(uAccent, vAlpha * edge);
  }
`;

/** Floats per vertex: x, y, falloffX, falloffY, alpha. */
const STRIDE = 5;

/** Edge half-width in CSS pixels, before the depth scale is applied. */
const EDGE_HALF_WIDTH = 1.6;
const ACTIVE_EDGE_MULTIPLIER = 2.6;

/** Node disc radius in CSS pixels, before the depth scale. */
const NODE_RADIUS = 7;
const ACTIVE_NODE_MULTIPLIER = 1.7;

/** The far side of the scene keeps this share of its opacity. */
const MIN_DEPTH_ALPHA = 0.4;

export interface AxisGraphFrame {
  /**
   * Where each module node has actually landed, in CSS pixels from the
   * panel centre — the entrance lerp already applied, because the module
   * cards are sitting on these same points.
   */
  nodes: ProjectedNode[];
  /** 0..1 arrival of each node, used for opacity only. */
  entrance: number[];
  /** Index of the edge the reader is on, or null. */
  activeEdge: number | null;
}

export interface AxisGraphLayer {
  draw(frame: AxisGraphFrame): void;
  /** CSS pixels; the caller has already sized the backing store. */
  resize(width: number, height: number, devicePixelRatio: number): void;
  dispose(): void;
}

/**
 * A driver that refuses a shader says so through COMPILE_STATUS rather
 * than by withholding the handle — the same trap sphereLayer documents.
 */
function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function pushVertex(
  out: number[],
  x: number,
  y: number,
  falloffX: number,
  falloffY: number,
  alpha: number
): void {
  out.push(x, y, falloffX, falloffY, alpha);
}

/** Two triangles over four corners, in the order a TRIANGLES draw wants. */
function pushQuad(
  out: number[],
  corners: Array<[number, number]>,
  falloffs: Array<[number, number]>,
  alphas: number[]
): void {
  for (const index of [0, 1, 2, 0, 2, 3]) {
    pushVertex(
      out,
      corners[index][0],
      corners[index][1],
      falloffs[index][0],
      falloffs[index][1],
      alphas[index]
    );
  }
}

function depthAlpha(node: ProjectedNode): number {
  const normalized = Math.min(1, Math.max(0, (node.depth + 1) / 2));
  return MIN_DEPTH_ALPHA + (1 - MIN_DEPTH_ALPHA) * normalized;
}

function buildVertices(frame: AxisGraphFrame): Float32Array {
  const out: number[] = [];

  // Painter's order: the far side of the scene goes down first, so a near
  // node reads as being in front of the edge that passes behind it.
  const order = frame.nodes
    .map((node, index) => ({ node, index }))
    .sort((a, b) => a.node.depth - b.node.depth);

  for (const { node, index } of order) {
    const arrived = frame.entrance[index] ?? 1;
    if (arrived <= 0) continue;

    const active = frame.activeEdge === index;
    const fade = depthAlpha(node) * arrived;
    const length = Math.hypot(node.x, node.y);
    if (length < 0.001) continue;

    const dirX = node.x / length;
    const dirY = node.y / length;
    // A hairline cannot be softened: under a pixel the smoothstep has no
    // room to work in and the line strobes as the scene turns, so the
    // width has a floor whatever the depth scale says.
    const halfWidth = Math.max(
      EDGE_HALF_WIDTH * node.scale * (active ? ACTIVE_EDGE_MULTIPLIER : 1),
      1
    );
    const normalX = -dirY * halfWidth;
    const normalY = dirX * halfWidth;

    // The edge fades toward the card it leaves and brightens at the module
    // it reaches — the reader's eye travels outward, which is the way the
    // panel wants to be read.
    const rootAlpha = fade * (active ? 0.5 : 0.16);
    const tipAlpha = fade * (active ? 0.95 : 0.5);

    pushQuad(
      out,
      [
        [-normalX, -normalY],
        [normalX, normalY],
        [node.x + normalX, node.y + normalY],
        [node.x - normalX, node.y - normalY],
      ],
      [
        [0, -1],
        [0, 1],
        [0, 1],
        [0, -1],
      ],
      [rootAlpha, rootAlpha, tipAlpha, tipAlpha]
    );

    const radius =
      NODE_RADIUS * node.scale * (active ? ACTIVE_NODE_MULTIPLIER : 1);
    const nodeAlpha = fade * (active ? 1 : 0.72);

    pushQuad(
      out,
      [
        [node.x - radius, node.y - radius],
        [node.x + radius, node.y - radius],
        [node.x + radius, node.y + radius],
        [node.x - radius, node.y + radius],
      ],
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ],
      [nodeAlpha, nodeAlpha, nodeAlpha, nodeAlpha]
    );
  }

  return new Float32Array(out);
}

/**
 * Mounts the graph on an existing GL context. Returns null when the context
 * cannot give us a program, so the panel falls back to its plain module
 * list rather than showing an empty canvas over it.
 */
// @req REQ-114
export function createAxisGraphLayer(
  gl: WebGLRenderingContext,
  accent: [number, number, number]
): AxisGraphLayer | null {
  const vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();

  if (!program || !vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    if (program) gl.deleteProgram(program);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(program);
    return null;
  }

  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(program);
    return null;
  }

  const aPos = gl.getAttribLocation(program, "aPos");
  const aFalloff = gl.getAttribLocation(program, "aFalloff");
  const aAlpha = gl.getAttribLocation(program, "aAlpha");
  const uViewport = gl.getUniformLocation(program, "uViewport");
  const uAccent = gl.getUniformLocation(program, "uAccent");

  let viewportWidth = 1;
  let viewportHeight = 1;

  gl.useProgram(program);
  gl.uniform3f(uAccent, accent[0], accent[1], accent[2]);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return {
    draw(frame) {
      const vertices = buildVertices(frame);

      gl.useProgram(program);
      gl.uniform2f(uViewport, viewportWidth, viewportHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (vertices.length === 0) return;

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

      const bytes = STRIDE * Float32Array.BYTES_PER_ELEMENT;
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, bytes, 0);
      gl.enableVertexAttribArray(aFalloff);
      gl.vertexAttribPointer(aFalloff, 2, gl.FLOAT, false, bytes, 8);
      gl.enableVertexAttribArray(aAlpha);
      gl.vertexAttribPointer(aAlpha, 1, gl.FLOAT, false, bytes, 16);

      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / STRIDE);
    },

    resize(width, height, devicePixelRatio) {
      viewportWidth = Math.max(width, 1);
      viewportHeight = Math.max(height, 1);
      gl.viewport(
        0,
        0,
        Math.round(viewportWidth * devicePixelRatio),
        Math.round(viewportHeight * devicePixelRatio)
      );
    },

    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    },
  };
}
