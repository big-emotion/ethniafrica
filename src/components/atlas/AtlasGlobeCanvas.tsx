"use client";

import { useEffect, useRef } from "react";

import { CHARTER_OCRE_HEX } from "@/components/home/DottedContinent";
import type { CameraPose } from "@/lib/atlas/camera";
import {
  buildPointField,
  buildRingFan,
  buildRingLineLoop,
} from "@/lib/atlas/globeGeometry";
import type { AtlasOverlay } from "@/lib/atlas/overlays";
import { buildRotationMatrix } from "@/lib/atlas/projection";
import { createSphereLayer, type SphereLayer } from "@/lib/atlas/sphereLayer";
import { resolveGlobePalette } from "@/lib/atlas/globePalette";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const MAX_DEVICE_PIXEL_RATIO = 2;
const REVEAL_DURATION_SECONDS = 0.9;
const FAMILY_FILL_MAX_OPACITY = 0.35;
const FAMILY_DASH_REPEATS_PER_RING = 18;
const PEOPLE_BASE_POINT_SIZE_CSS_PX = 46;

// uZoom / uOffset are the REQ-117 camera: the dolly is a clip-space scale
// because this globe is orthographic, and the offset is the share of the stage
// the open facts panel has claimed. Applying both AFTER the aspect division
// keeps the offset in stage units, which is what panelBias.ts computes.
const BOUNDARY_VERTEX_SHADER = `
  attribute vec3 aSpherePos;
  attribute float aArcFraction;
  uniform mat3 uRotation;
  uniform float uAspect;
  uniform float uZoom;
  uniform vec2 uOffset;
  varying float vArcFraction;
  varying float vVisible;

  void main() {
    vec3 rotated = uRotation * aSpherePos;
    vec2 mixed = rotated.xy;
    mixed.x = mixed.x / uAspect;
    mixed = mixed * uZoom + uOffset;
    gl_Position = vec4(mixed, 0.0, 1.0);
    vArcFraction = aArcFraction;
    vVisible = step(0.0, rotated.z);
  }
`;

// uIsStroke / uProgress / uDashRepeats: a fill draw (uIsStroke = 0) ignores
// arc fraction entirely; only a stroke draw ever reveals or dashes — the
// country's draw-in trace and the family's dashed boundary are the same
// program, the same discard logic, parameterised, not two shaders.
const BOUNDARY_FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec4 uColor;
  uniform float uIsStroke;
  uniform float uProgress;
  uniform float uDashRepeats;
  varying float vArcFraction;
  varying float vVisible;

  void main() {
    if (vVisible < 0.5) discard;
    if (uIsStroke > 0.5) {
      if (vArcFraction > uProgress) discard;
      if (uDashRepeats > 0.5 && fract(vArcFraction * uDashRepeats) > 0.5) {
        discard;
      }
    }
    gl_FragColor = uColor;
  }
`;

// The people field: GL_POINTS only. This shader has no notion of a ring or
// a line — it structurally cannot draw a closed boundary (atlas-charter §1).
const FIELD_VERTEX_SHADER = `
  attribute vec3 aSpherePos;
  attribute float aWeight;
  uniform mat3 uRotation;
  uniform float uAspect;
  uniform float uZoom;
  uniform vec2 uOffset;
  uniform float uBasePointSize;
  varying float vVisible;

  void main() {
    vec3 rotated = uRotation * aSpherePos;
    vec2 mixed = rotated.xy;
    mixed.x = mixed.x / uAspect;
    mixed = mixed * uZoom + uOffset;
    gl_Position = vec4(mixed, 0.0, 1.0);
    gl_PointSize = uBasePointSize * sqrt(max(aWeight, 0.05)) * uZoom;
    vVisible = step(0.0, rotated.z);
  }
`;

const FIELD_FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec3 uColorRgb;
  varying float vVisible;

  void main() {
    if (vVisible < 0.5) discard;
    vec2 centered = gl_PointCoord - vec2(0.5);
    float dist = length(centered) * 2.0;
    if (dist > 1.0) discard;
    float alpha = smoothstep(1.0, 0.0, dist) * 0.85;
    gl_FragColor = vec4(uColorRgb, alpha);
  }
`;

function hexToRgbFloats(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
  ];
}

function resolveAccentHex(element: Element): string {
  const value = getComputedStyle(element).getPropertyValue("--accent").trim();
  return value.startsWith("#") ? value : CHARTER_OCRE_HEX;
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

function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram | null {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program || !vertexShader || !fragmentShader) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  return program;
}

export interface AtlasGlobeCanvasProps {
  overlay: Exclude<AtlasOverlay, { kind: "people-field-missing" }>;
  /** The camera AtlasGlobe owns (REQ-117). Every change to it repaints one frame. */
  pose: CameraPose;
  accentHex?: string;
}

/**
 * The WebGL half of AtlasGlobe (ADR-0007). Draws exactly the overlay
 * descriptor it is given: a country/family ring as a filled, stroked
 * GL_LINE_LOOP + GL_TRIANGLE_FAN pair, or a people field as GL_POINTS —
 * never the other geometry, so a people overlay is structurally incapable
 * of producing a closed line here.
 *
 * The continent scene reaches this file as its frame only: the radial fields
 * are still SVG-side, pending the ring-batching measurements that decide
 * whether 52 outlines belong in one GL_LINES buffer. The frame draws no fill
 * either way, so what is rendered here cannot contradict the SVG path — it is
 * a smaller scene, not a different one.
 *
 * It no longer owns any camera state: the pose arrives as a prop, so the only
 * animation left in this file is the country outline's trace-in reveal, and
 * that is the only reason a frame loop still runs.
 */
// @req REQ-116
export function AtlasGlobeCanvas({
  overlay,
  pose,
  accentHex,
}: AtlasGlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  const poseRef = useRef(pose);
  const drawRef = useRef<(() => void) | null>(null);

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

    const [r, g, b] = hexToRgbFloats(accentHex ?? resolveAccentHex(canvas));

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let aspect = 1;
    let devicePixelRatio = 1;
    let disposed = false;
    let visible = true;
    let frameId: number | null = null;
    let lastTimestamp: number | null = null;

    const progressRef = { current: overlay.kind === "country-outline" ? 0 : 1 };

    // The same lit sphere the home hero stands on. Drawn at margin 1 so it
    // shares the overlay shaders' projection exactly — an outline traced
    // over terrain that sat at a different scale would be describing
    // ground it does not touch. It draws first and only ever draws
    // terrain, so it can never be what closes a boundary around a people
    // (atlas-charter §1).
    const sphere: SphereLayer | null = createSphereLayer(
      gl,
      resolveGlobePalette(),
      document.createElement("canvas")
    );

    // The terrain rides the same camera as the overlay drawn over it. A
    // boundary that dollies toward the reader while the ground stays put
    // would be tracing a coastline it no longer touches — the very thing
    // drawing this layer at margin 1 was meant to prevent.
    const paintBase = (camera: CameraPose) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      sphere?.draw({
        rotation: buildRotationMatrix(camera.yaw, camera.pitch),
        morph: 1,
        aspect,
        zoom: camera.zoom,
        offsetX: camera.offsetX,
        offsetY: camera.offsetY,
      });
    };

    let draw: () => void = () => {};

    if (overlay.kind === "people-field") {
      const program = createProgram(
        gl,
        FIELD_VERTEX_SHADER,
        FIELD_FRAGMENT_SHADER
      );
      if (!program) return;
      gl.useProgram(program);

      const field = buildPointField(overlay.areas);
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, field.positions, gl.STATIC_DRAW);
      const aSpherePos = gl.getAttribLocation(program, "aSpherePos");
      gl.enableVertexAttribArray(aSpherePos);
      gl.vertexAttribPointer(aSpherePos, 3, gl.FLOAT, false, 0, 0);

      const weightBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, weightBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, field.weights, gl.STATIC_DRAW);
      const aWeight = gl.getAttribLocation(program, "aWeight");
      gl.enableVertexAttribArray(aWeight);
      gl.vertexAttribPointer(aWeight, 1, gl.FLOAT, false, 0, 0);

      const uRotation = gl.getUniformLocation(program, "uRotation");
      const uAspect = gl.getUniformLocation(program, "uAspect");
      const uZoom = gl.getUniformLocation(program, "uZoom");
      const uOffset = gl.getUniformLocation(program, "uOffset");
      const uBasePointSize = gl.getUniformLocation(program, "uBasePointSize");
      const uColorRgb = gl.getUniformLocation(program, "uColorRgb");

      draw = () => {
        const camera = poseRef.current;
        // paintBase clears, so the overlay must not clear again after it.
        paintBase(camera);
        // The sphere layer left its own program and buffers bound, so the
        // field's have to be restated every frame rather than once at
        // setup.
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(aSpherePos);
        gl.vertexAttribPointer(aSpherePos, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, weightBuffer);
        gl.enableVertexAttribArray(aWeight);
        gl.vertexAttribPointer(aWeight, 1, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix3fv(
          uRotation,
          false,
          new Float32Array(buildRotationMatrix(camera.yaw, camera.pitch))
        );
        gl.uniform1f(uAspect, aspect);
        gl.uniform1f(uZoom, camera.zoom);
        gl.uniform2f(uOffset, camera.offsetX, camera.offsetY);
        gl.uniform1f(
          uBasePointSize,
          PEOPLE_BASE_POINT_SIZE_CSS_PX * devicePixelRatio
        );
        gl.uniform3f(uColorRgb, r, g, b);
        gl.drawArrays(gl.POINTS, 0, field.vertexCount);
      };
    } else {
      const program = createProgram(
        gl,
        BOUNDARY_VERTEX_SHADER,
        BOUNDARY_FRAGMENT_SHADER
      );
      if (!program) return;
      gl.useProgram(program);

      const aSpherePos = gl.getAttribLocation(program, "aSpherePos");
      const aArcFraction = gl.getAttribLocation(program, "aArcFraction");
      const uRotation = gl.getUniformLocation(program, "uRotation");
      const uAspect = gl.getUniformLocation(program, "uAspect");
      const uZoom = gl.getUniformLocation(program, "uZoom");
      const uOffset = gl.getUniformLocation(program, "uOffset");
      const uColor = gl.getUniformLocation(program, "uColor");
      const uIsStroke = gl.getUniformLocation(program, "uIsStroke");
      const uProgress = gl.getUniformLocation(program, "uProgress");
      const uDashRepeats = gl.getUniformLocation(program, "uDashRepeats");

      const fillOpacity =
        overlay.kind === "family-footprint"
          ? overlay.tint * FAMILY_FILL_MAX_OPACITY
          : overlay.fillOpacity;
      const dashRepeats =
        overlay.kind === "family-footprint" ? FAMILY_DASH_REPEATS_PER_RING : 0;

      // The continent frame is 51 reference outlines and carries no count of
      // its own, so it reaches this program as rings like any other boundary.
      const ringSource =
        overlay.kind === "continent-field"
          ? overlay.frame.flatMap((country) => country.rings)
          : overlay.rings;

      // A frame declared at zero fill (CONTINENT_FRAME_FILL_OPACITY) does not
      // draw a transparent area, it draws no area at all — skipping the pass
      // is what makes a per-country fill impossible rather than merely
      // invisible (atlas-charter §1). No fan drawn, so no fan built either.
      const fillsRings = fillOpacity > 0;

      const rings = ringSource.map((ring) => ({
        fan: fillsRings ? buildRingFan(ring) : null,
        loop: buildRingLineLoop(ring),
      }));

      const fanBuffer = gl.createBuffer();
      const loopPositionBuffer = gl.createBuffer();
      const loopArcBuffer = gl.createBuffer();

      draw = () => {
        const camera = poseRef.current;
        // paintBase clears, so the overlay must not clear again after it.
        paintBase(camera);
        // The sphere layer bound its own program; the boundary's has to be
        // made current again before its uniforms mean anything.
        gl.useProgram(program);

        gl.uniformMatrix3fv(
          uRotation,
          false,
          new Float32Array(buildRotationMatrix(camera.yaw, camera.pitch))
        );
        gl.uniform1f(uAspect, aspect);
        gl.uniform1f(uZoom, camera.zoom);
        gl.uniform2f(uOffset, camera.offsetX, camera.offsetY);

        rings.forEach(({ fan, loop }) => {
          if (fan) {
            gl.bindBuffer(gl.ARRAY_BUFFER, fanBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, fan.positions, gl.STATIC_DRAW);
            gl.enableVertexAttribArray(aSpherePos);
            gl.vertexAttribPointer(aSpherePos, 3, gl.FLOAT, false, 0, 0);
            gl.disableVertexAttribArray(aArcFraction);
            gl.vertexAttrib1f(aArcFraction, 0);
            gl.uniform1f(uIsStroke, 0);
            gl.uniform1f(uProgress, 1);
            gl.uniform1f(uDashRepeats, 0);
            gl.uniform4f(uColor, r, g, b, fillOpacity);
            gl.drawArrays(gl.TRIANGLE_FAN, 0, fan.vertexCount);
          }

          gl.bindBuffer(gl.ARRAY_BUFFER, loopPositionBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, loop.positions, gl.STATIC_DRAW);
          gl.enableVertexAttribArray(aSpherePos);
          gl.vertexAttribPointer(aSpherePos, 3, gl.FLOAT, false, 0, 0);

          gl.bindBuffer(gl.ARRAY_BUFFER, loopArcBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, loop.arcFractions, gl.STATIC_DRAW);
          gl.enableVertexAttribArray(aArcFraction);
          gl.vertexAttribPointer(aArcFraction, 1, gl.FLOAT, false, 0, 0);

          gl.uniform1f(uIsStroke, 1);
          gl.uniform1f(uProgress, progressRef.current);
          gl.uniform1f(uDashRepeats, dashRepeats);
          gl.uniform4f(uColor, r, g, b, 1);
          gl.drawArrays(gl.LINE_LOOP, 0, loop.vertexCount);
        });
      };
    }

    drawRef.current = draw;

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

    /** The reveal is the only thing left that needs successive frames; the camera repaints on demand. */
    const scheduleReveal = () => {
      if (disposed || !visible || frameId !== null) return;
      if (progressRef.current >= 1) return;

      frameId = window.requestAnimationFrame((timestamp) => {
        frameId = null;
        if (disposed || !visible) return;

        const seconds =
          lastTimestamp === null ? 0 : (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        progressRef.current = Math.min(
          1,
          progressRef.current + seconds / REVEAL_DURATION_SECONDS
        );
        draw();
        scheduleReveal();
      });
    };

    const handleResize = () => {
      resize();
      draw();
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
          scheduleReveal();
        }
      },
      { threshold: 0.05 }
    );
    const resizeObserver = new ResizeObserver(handleResize);

    resize();
    observer.observe(canvas);
    resizeObserver.observe(parent);
    window.addEventListener("resize", handleResize);

    if (reducedMotionRef.current) {
      progressRef.current = 1;
      draw();
    } else {
      draw();
      scheduleReveal();
    }

    return () => {
      disposed = true;
      drawRef.current = null;
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      sphere?.dispose();
    };
  }, [overlay, accentHex]);

  useEffect(() => {
    poseRef.current = pose;
    drawRef.current?.();
  }, [pose]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}

export default AtlasGlobeCanvas;
