"use client";

import { useEffect, useRef, useState } from "react";

import { CHARTER_OCRE_HEX } from "@/components/home/DottedContinent";
import { africaDots } from "@/lib/continentDots";
import {
  AFRICA_CENTER_LON,
  AFRICA_GEO_BOUNDS,
  BASEMAP_VIEWBOX,
  buildRotationMatrix,
  lonLatToSphere,
  projectLonLat,
} from "@/lib/atlas/projection";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const MAX_DEVICE_PIXEL_RATIO = 2;
// Sphere/flat points are drawn at 82% of clip space, leaving a margin so the
// globe never clips against the canvas edge while rotating.
const RENDER_SCALE = 0.82;
const AUTO_ROTATE_RADIANS_PER_SECOND = 0.12;
const DRAG_RADIANS_PER_PIXEL = 0.008;
const KEY_STEP_RADIANS = 0.12;
const PITCH_LIMIT_RADIANS = 1.15;
const MORPH_EASE = 0.14;
const POINT_SIZE_CSS_PX = 2.6;

const VERTEX_SHADER_SOURCE = `
  attribute vec3 aSpherePos;
  attribute vec2 aFlatPos;
  uniform mat3 uRotation;
  uniform float uMorph;
  uniform float uAspect;
  uniform float uPointSize;
  varying float vVisible;

  void main() {
    vec3 rotated = uRotation * aSpherePos;
    vec2 mixed = mix(rotated.xy, aFlatPos, uMorph);
    mixed.x = mixed.x / uAspect;
    gl_Position = vec4(mixed, 0.0, 1.0);
    gl_PointSize = uPointSize;
    float front = step(0.0, rotated.z);
    vVisible = mix(front, 1.0, uMorph);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  uniform vec4 uColor;
  varying float vVisible;

  void main() {
    if (vVisible < 0.5) {
      discard;
    }
    vec2 centered = gl_PointCoord - vec2(0.5);
    if (dot(centered, centered) > 0.25) {
      discard;
    }
    gl_FragColor = uColor;
  }
`;

interface GlobeGeometry {
  spherePositions: Float32Array;
  flatPositions: Float32Array;
  pointCount: number;
}

/**
 * Builds both the sphere (true-relative-area) and flat (equirectangular)
 * positions from the same lon/lat frame — ARCH-014's "one committed source
 * and one projection" — reusing the continent outline already shared with
 * DottedContinent (continentDots.ts) and the geographic projection already
 * shared with AfricaBasemap (projection.ts). This is a stylised outline,
 * not the survey-grade coastline in the committed SVG fallback; the two
 * views share a coordinate frame, not a pixel-identical silhouette.
 */
function buildGlobeGeometry(): GlobeGeometry {
  const dots = africaDots();
  const spherePositions = new Float32Array(dots.length * 3);
  const flatPositions = new Float32Array(dots.length * 2);
  const { lonMin, lonMax, latMin, latMax } = AFRICA_GEO_BOUNDS;

  dots.forEach(([x, y], index) => {
    const lon = lonMin + x * (lonMax - lonMin);
    const lat = latMax - y * (latMax - latMin);

    const sphere = lonLatToSphere(lon, lat);
    spherePositions[index * 3] = sphere.x * RENDER_SCALE;
    spherePositions[index * 3 + 1] = sphere.y * RENDER_SCALE;
    spherePositions[index * 3 + 2] = sphere.z * RENDER_SCALE;

    const flat = projectLonLat(lon, lat, BASEMAP_VIEWBOX);
    flatPositions[index * 2] =
      ((flat.x / BASEMAP_VIEWBOX.width) * 2 - 1) * RENDER_SCALE;
    flatPositions[index * 2 + 1] =
      -((flat.y / BASEMAP_VIEWBOX.height) * 2 - 1) * RENDER_SCALE;
  });

  return { spherePositions, flatPositions, pointCount: dots.length };
}

function hexToRgbFloats(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
  ];
}

function clampPitch(value: number): number {
  return Math.min(PITCH_LIMIT_RADIANS, Math.max(-PITCH_LIMIT_RADIANS, value));
}

function compileShader(
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

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    VERTEX_SHADER_SOURCE
  );
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    FRAGMENT_SHADER_SOURCE
  );
  const program = gl.createProgram();
  if (!program || !vertexShader || !fragmentShader) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  return program;
}

interface HomeGlobeProps {
  dotColorHex?: string;
}

/**
 * The interactive WebGL globe (ARCH-014, REQ-112): a raw-WebGL point cloud
 * (no three.js — not an existing dependency) rotated by pointer drag or
 * keyboard arrows, with one control that morphs it toward the flat
 * projection so the reader sees the area distortion for themselves.
 * Mounted only once HomeGlobeStage has confirmed WebGL support.
 */
// @req REQ-112
export function HomeGlobe({
  dotColorHex = CHARTER_OCRE_HEX,
}: HomeGlobeProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const yawRef = useRef(-(AFRICA_CENTER_LON * Math.PI) / 180);
  const pitchRef = useRef(0);
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const morphRef = useRef(0);
  const targetMorphRef = useRef(0);
  const reducedMotionRef = useRef(reducedMotion);
  const requestDrawRef = useRef<(() => void) | null>(null);

  const [morphOn, setMorphOn] = useState(false);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    const geometry = buildGlobeGeometry();
    const program = createProgram(gl);
    if (!program) return;
    gl.useProgram(program);

    const sphereBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.spherePositions, gl.STATIC_DRAW);
    const aSpherePos = gl.getAttribLocation(program, "aSpherePos");
    gl.enableVertexAttribArray(aSpherePos);
    gl.vertexAttribPointer(aSpherePos, 3, gl.FLOAT, false, 0, 0);

    const flatBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, flatBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.flatPositions, gl.STATIC_DRAW);
    const aFlatPos = gl.getAttribLocation(program, "aFlatPos");
    gl.enableVertexAttribArray(aFlatPos);
    gl.vertexAttribPointer(aFlatPos, 2, gl.FLOAT, false, 0, 0);

    const uRotation = gl.getUniformLocation(program, "uRotation");
    const uMorph = gl.getUniformLocation(program, "uMorph");
    const uAspect = gl.getUniformLocation(program, "uAspect");
    const uPointSize = gl.getUniformLocation(program, "uPointSize");
    const uColor = gl.getUniformLocation(program, "uColor");

    const [r, g, b] = hexToRgbFloats(dotColorHex);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let aspect = 1;
    let devicePixelRatio = 1;
    let disposed = false;
    let visible = true;
    let frameId: number | null = null;
    let lastTimestamp: number | null = null;

    const resize = () => {
      const width = canvas.clientWidth || parent.clientWidth;
      const height = parent.clientHeight || canvas.clientHeight;
      devicePixelRatio = Math.min(
        window.devicePixelRatio || 1,
        MAX_DEVICE_PIXEL_RATIO
      );

      canvas.width = Math.max(1, Math.round(width * devicePixelRatio));
      canvas.height = Math.max(1, Math.round(height * devicePixelRatio));
      aspect = canvas.height > 0 ? canvas.width / canvas.height : 1;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = () => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      const rotation = new Float32Array(
        buildRotationMatrix(yawRef.current, pitchRef.current)
      );
      gl.uniformMatrix3fv(uRotation, false, rotation);
      gl.uniform1f(uMorph, morphRef.current);
      gl.uniform1f(uAspect, aspect);
      gl.uniform1f(uPointSize, POINT_SIZE_CSS_PX * devicePixelRatio);
      gl.uniform4f(uColor, r, g, b, 0.85);
      gl.drawArrays(gl.POINTS, 0, geometry.pointCount);
    };

    requestDrawRef.current = draw;

    const scheduleFrame = () => {
      if (
        disposed ||
        reducedMotionRef.current ||
        !visible ||
        frameId !== null
      ) {
        return;
      }
      frameId = window.requestAnimationFrame((timestamp) => {
        frameId = null;
        if (disposed || !visible) return;

        const dt =
          lastTimestamp === null ? 0 : (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        if (!draggingRef.current) {
          yawRef.current += AUTO_ROTATE_RADIANS_PER_SECOND * dt;
        }
        morphRef.current +=
          (targetMorphRef.current - morphRef.current) * MORPH_EASE;
        draw();
        scheduleFrame();
      });
    };

    const handleResize = () => {
      resize();
      if (reducedMotionRef.current) draw();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find(({ target }) => target === canvas);
        if (!entry) return;

        visible = entry.isIntersecting;
        if (!visible && frameId !== null) {
          window.cancelAnimationFrame(frameId);
          frameId = null;
        } else if (visible) {
          scheduleFrame();
        }
      },
      { threshold: 0.05 }
    );
    const resizeObserver = new ResizeObserver(handleResize);

    resize();
    observer.observe(canvas);
    resizeObserver.observe(parent);
    window.addEventListener("resize", handleResize);

    if (reducedMotionRef.current) draw();
    else scheduleFrame();

    return () => {
      disposed = true;
      requestDrawRef.current = null;
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [dotColorHex]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    draggingRef.current = true;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;

    const dx = event.clientX - lastPointerRef.current.x;
    const dy = event.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };

    yawRef.current += dx * DRAG_RADIANS_PER_PIXEL;
    pitchRef.current = clampPitch(
      pitchRef.current - dy * DRAG_RADIANS_PER_PIXEL
    );
    if (reducedMotionRef.current) requestDrawRef.current?.();
  };

  const stopDragging = () => {
    draggingRef.current = false;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case "ArrowLeft":
        yawRef.current -= KEY_STEP_RADIANS;
        break;
      case "ArrowRight":
        yawRef.current += KEY_STEP_RADIANS;
        break;
      case "ArrowUp":
        pitchRef.current = clampPitch(pitchRef.current - KEY_STEP_RADIANS);
        break;
      case "ArrowDown":
        pitchRef.current = clampPitch(pitchRef.current + KEY_STEP_RADIANS);
        break;
      default:
        return;
    }
    event.preventDefault();
    if (reducedMotionRef.current) requestDrawRef.current?.();
  };

  const handleToggleMorph = () => {
    const next = targetMorphRef.current === 0;
    targetMorphRef.current = next ? 1 : 0;
    if (reducedMotionRef.current) {
      morphRef.current = targetMorphRef.current;
      requestDrawRef.current?.();
    }
    setMorphOn(next);
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <button
        type="button"
        aria-label="Globe interactif de l'Afrique. Glissez ou utilisez les flèches du clavier pour le faire pivoter."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onPointerLeave={stopDragging}
        onKeyDown={handleKeyDown}
        style={{
          position: "absolute",
          inset: 0,
          border: "none",
          background: "none",
          padding: 0,
          margin: 0,
          cursor: "grab",
          touchAction: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      </button>
      <button
        type="button"
        onClick={handleToggleMorph}
        aria-pressed={morphOn}
        data-testid="home-globe-morph-toggle"
        style={{
          position: "absolute",
          right: "12px",
          bottom: "12px",
          zIndex: 1,
          fontFamily: "var(--afh-font-body)",
          fontSize: "12px",
          padding: "6px 10px",
          borderRadius: "999px",
          border: "1px solid var(--afh-border)",
          backgroundColor: "var(--afh-bg-warm)",
          color: "var(--afh-text)",
          cursor: "pointer",
        }}
      >
        {morphOn ? "Vue globe" : "Vue plate"}
      </button>
    </div>
  );
}

export default HomeGlobe;
