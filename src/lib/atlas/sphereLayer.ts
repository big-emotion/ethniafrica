import { buildSphereMesh, flatHalfExtent } from "@/lib/atlas/sphereMesh";
import {
  GLOBE_TEXTURE_SIZE,
  paintGlobeTexture,
  type GlobePalette,
} from "@/lib/atlas/globeTexture";
import type { Mat3 } from "@/lib/atlas/projection";

/**
 * The lit, textured sphere every globe in the app stands on — the home
 * hero and each fiche's atlas alike (REQ-112/REQ-116).
 *
 * It is a plain WebGL module rather than a React component because both
 * callers already own a canvas, a GL context and a render loop; handing
 * them a second component would mean a second context over the same
 * pixels. What they get instead is a layer they draw first, with the
 * entity overlays going on top in their own programs — which is what
 * keeps the cartographic grammar intact: this layer draws terrain and
 * graticule and nothing else, so it can never be the thing that puts a
 * closed boundary around a people.
 */

const VERTEX_SHADER = `
  attribute vec3 aSphere;
  attribute vec3 aFlat;
  attribute vec2 aUv;
  uniform mat3 uRotation;
  uniform float uMorph;
  uniform float uAspect;
  uniform float uScale;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = aUv;
    vec3 rotated = uRotation * aSphere;
    vec3 position = mix(aFlat, rotated, uMorph);
    // Flat ground faces the reader head-on; on the sphere the normal is
    // the position itself. Interpolating between them keeps the lighting
    // continuous through the morph instead of popping at the ends.
    vNormal = normalize(mix(vec3(0.0, 0.0, 1.0), normalize(rotated), uMorph));

    vec2 screen = position.xy * uScale;
    screen.x = screen.x / uAspect;
    gl_Position = vec4(screen, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D uMap;
  uniform vec3 uLight;
  uniform float uAmbient;
  uniform float uRim;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec3 normal = normalize(vNormal);
    // The far side of an opaque body is not visible. Discarding it here
    // rather than with a depth buffer leaves the overlay programs that
    // draw after this one free of depth state they never asked for.
    if (normal.z < 0.0) {
      discard;
    }

    vec4 texel = texture2D(uMap, vUv);
    float lambert = max(dot(normal, normalize(uLight)), 0.0);
    float limb = pow(1.0 - abs(normal.z), 2.5);

    vec3 colour = texel.rgb * (uAmbient + (1.0 - uAmbient) * lambert);
    // Without a lifted limb the sphere's edge dissolves into the night
    // ground and the body stops reading as round.
    colour += vec3(0.55, 0.40, 0.16) * limb * uRim;

    gl_FragColor = vec4(colour, 1.0);
  }
`;

const AMBIENT = 0.44;
const LIMB_LIFT = 0.3;

/**
 * A margin of 1 puts the unit sphere edge-to-edge in clip space, which is
 * exactly the projection the overlay shaders in AtlasGlobeCanvas use — so
 * a fiche's country outline or people field lands on the terrain it
 * describes. Only a caller with no overlay to align to (the home hero)
 * pulls the body in from the edge.
 */
const DEFAULT_FIT_MARGIN = 1;

export interface SphereDrawState {
  rotation: Mat3;
  /** 0 = flat Mercator, 1 = sphere. */
  morph: number;
  /** Canvas width / height, in device pixels. */
  aspect: number;
}

export interface SphereLayer {
  draw(state: SphereDrawState): void;
  /**
   * Repaints and re-uploads the texture with or without Tissot's
   * indicatrices. The geometry and the program are untouched — the discs
   * live in the texture, so showing them costs one upload rather than a
   * second pass over 120 000 indices every frame.
   */
  setTissot(show: boolean): void;
  dispose(): void;
}

function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

/**
 * Half-extent the surface occupies at a given morph, so the camera frames
 * the flat map and the sphere equally well without a perspective matrix.
 */
// @req REQ-112
export function fitScale(
  morph: number,
  aspect: number,
  margin: number = DEFAULT_FIT_MARGIN
): number {
  const { halfWidth, halfHeight } = flatHalfExtent();
  const width = halfWidth + (1 - halfWidth) * morph;
  const height = halfHeight + (1 - halfHeight) * morph;
  return margin / Math.max(height, width / Math.max(aspect, 0.0001));
}

/**
 * Mounts the sphere on an existing GL context. Returns null when the
 * context cannot give us a program — the caller then falls back to its
 * committed SVG basemap rather than showing an empty canvas.
 */
// @req REQ-112
export function createSphereLayer(
  gl: WebGLRenderingContext,
  palette: GlobePalette,
  textureCanvas: HTMLCanvasElement,
  margin: number = DEFAULT_FIT_MARGIN,
  showTissot = false
): SphereLayer | null {
  const vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program || !vertexShader || !fragmentShader) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const mesh = buildSphereMesh();

  const uploadAttribute = (
    data: Float32Array,
    name: string,
    size: number
  ): WebGLBuffer | null => {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    return buffer;
  };

  gl.useProgram(program);
  const sphereBuffer = uploadAttribute(mesh.spherePositions, "aSphere", 3);
  const flatBuffer = uploadAttribute(mesh.flatPositions, "aFlat", 3);
  const uvBuffer = uploadAttribute(mesh.uvs, "aUv", 2);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

  textureCanvas.width = GLOBE_TEXTURE_SIZE.width;
  textureCanvas.height = GLOBE_TEXTURE_SIZE.height;
  const textureContext = textureCanvas.getContext("2d");

  const texture = gl.createTexture();

  const uploadTexture = (showTissot: boolean) => {
    if (textureContext) {
      paintGlobeTexture(textureContext, palette, { showTissot });
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      textureCanvas
    );
  };

  uploadTexture(showTissot);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  // The texture wraps the globe, so u has to repeat across the seam at
  // ±180°; v is clamped because latitude has no far side to wrap to.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const uRotation = gl.getUniformLocation(program, "uRotation");
  const uMorph = gl.getUniformLocation(program, "uMorph");
  const uAspect = gl.getUniformLocation(program, "uAspect");
  const uScale = gl.getUniformLocation(program, "uScale");
  const uMap = gl.getUniformLocation(program, "uMap");
  const uLight = gl.getUniformLocation(program, "uLight");
  const uAmbient = gl.getUniformLocation(program, "uAmbient");
  const uRim = gl.getUniformLocation(program, "uRim");

  let disposed = false;

  return {
    draw({ rotation, morph, aspect }) {
      if (disposed) return;

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
      gl.vertexAttribPointer(
        gl.getAttribLocation(program, "aSphere"),
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, flatBuffer);
      gl.vertexAttribPointer(
        gl.getAttribLocation(program, "aFlat"),
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.vertexAttribPointer(
        gl.getAttribLocation(program, "aUv"),
        2,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uMap, 0);

      gl.uniformMatrix3fv(uRotation, false, new Float32Array(rotation));
      gl.uniform1f(uMorph, morph);
      gl.uniform1f(uAspect, aspect);
      gl.uniform1f(uScale, fitScale(morph, aspect, margin));
      gl.uniform3f(uLight, 0.5, 0.42, 0.9);
      gl.uniform1f(uAmbient, AMBIENT);
      gl.uniform1f(uRim, LIMB_LIFT);

      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    },

    setTissot(show) {
      if (disposed) return;
      uploadTexture(show);
    },

    dispose() {
      disposed = true;
      gl.deleteTexture(texture);
      gl.deleteBuffer(sphereBuffer);
      gl.deleteBuffer(flatBuffer);
      gl.deleteBuffer(uvBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteProgram(program);
    },
  };
}
