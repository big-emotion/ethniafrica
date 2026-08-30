"use client";

import { useEffect, useRef } from "react";

import { CHARTER_OCRE_HEX } from "@/components/home/DottedContinent";
import { cameraOffset, type CameraPose } from "@/lib/atlas/camera";
import {
  buildPointField,
  buildRingFill,
  buildRingLineLoop,
} from "@/lib/atlas/globeGeometry";
import {
  FOOTPRINT_REVEAL_DURATION_SECONDS,
  footprintDashRepeats,
  footprintFillOpacity,
  footprintRevealEase,
  footprintStrokeOpacity,
} from "@/lib/atlas/footprintStyle";
import type { AtlasOverlay, PeopleFieldArea } from "@/lib/atlas/overlays";
import type { CountryId } from "@/types/afrik";
import { buildRotationMatrix } from "@/lib/atlas/projection";
import {
  createSphereLayer,
  DEFAULT_FIT_MARGIN,
  fitScale,
  type SphereLayer,
  type SphereLighting,
} from "@/lib/atlas/sphereLayer";
import {
  FICHE_LIGHTING,
  GLOBE_LIGHTING,
  resolveGlobePalette,
  type GlobeSurface,
} from "@/lib/atlas/globePalette";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const MAX_DEVICE_PIXEL_RATIO = 2;
const REVEAL_DURATION_SECONDS = 0.9;
const PEOPLE_BASE_POINT_SIZE_CSS_PX = 46;

// uZoom / uOffset are the REQ-117 camera: the dolly is a clip-space scale
// because this globe is orthographic, and the offset is the share of the stage
// the open facts panel has claimed. Applying both AFTER the aspect division
// keeps the offset in stage units, which is what panelBias.ts computes.
const BOUNDARY_VERTEX_SHADER = `
  attribute vec3 aSpherePos;
  attribute vec3 aFlat;
  attribute float aArcFraction;
  uniform mat3 uRotation;
  uniform float uAspect;
  uniform float uZoom;
  uniform vec2 uOffset;
  uniform float uMorph;
  uniform float uScale;
  varying float vArcFraction;
  varying float vVisible;

  void main() {
    vec3 rotated = uRotation * aSpherePos;
    // The same mix, and then the same fit, sphereLayer applies to the ground.
    // Without the mix the terrain would flatten and the boundary would stay
    // wrapped around a sphere that is no longer there; without the fit it
    // would land on the right shape at the wrong size.
    vec3 position = mix(aFlat, rotated, uMorph);
    vec2 mixed = position.xy * uScale;
    mixed.x = mixed.x / uAspect;
    mixed = mixed * uZoom + uOffset;
    gl_Position = vec4(mixed, 0.0, 1.0);
    vArcFraction = aArcFraction;
    // On the plane every point faces the reader; the hemisphere test only
    // means anything while there is a far side to be on.
    vVisible = max(step(0.0, rotated.z), 1.0 - uMorph);
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
  attribute vec3 aFlat;
  attribute float aWeight;
  uniform mat3 uRotation;
  uniform float uAspect;
  uniform float uZoom;
  uniform vec2 uOffset;
  uniform float uBasePointSize;
  uniform float uMorph;
  uniform float uScale;
  varying float vVisible;

  void main() {
    vec3 rotated = uRotation * aSpherePos;
    vec3 position = mix(aFlat, rotated, uMorph);
    vec2 mixed = position.xy * uScale;
    mixed.x = mixed.x / uAspect;
    mixed = mixed * uZoom + uOffset;
    gl_Position = vec4(mixed, 0.0, 1.0);
    gl_PointSize = uBasePointSize * sqrt(max(aWeight, 0.05)) * uZoom;
    vVisible = max(step(0.0, rotated.z), 1.0 - uMorph);
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

/** Falls back to the accent itself: a focus ring in the accent still reads, one in a missing colour does not. */
function resolveAccentTintHex(element: Element): string {
  const value = getComputedStyle(element)
    .getPropertyValue("--accent-tint")
    .trim();
  return value.startsWith("#") ? value : resolveAccentHex(element);
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
  // Linking is asked about, not assumed. A driver that refuses to link still
  // hands back a program object, and drawing with it paints nothing at all —
  // which is the low-end-hardware failure REQ-112 AC2 exists for. Returning it
  // unchecked made every `if (!program)` below unreachable in exactly the case
  // they were written for.
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/**
 * How each surface is lit. Night is the fiche's near framing, which is also
 * sphereLayer's own default; parchment needs saying, because on a ground
 * *lighter* than the ocean the disc already states its edge — the warm limb rim
 * reads as a halo there, and the low ambient floor turns the unlit half into a
 * shadow the page has nowhere to put.
 *
 * A function rather than an inline ternary because the layer's construction and
 * setSurface both need the answer, and the two drifting apart would light a
 * globe one way on mount and another way after a theme flip.
 */
function lightingFor(surface: GlobeSurface): SphereLighting {
  return surface === "night" ? FICHE_LIGHTING : GLOBE_LIGHTING.parchment;
}

export interface AtlasGlobeCanvasProps {
  overlay: Exclude<AtlasOverlay, { kind: "people-field-missing" }>;
  /** The camera AtlasGlobe owns (REQ-117). Every change to it repaints one frame. */
  pose: CameraPose;
  accentHex?: string;
  /**
   * Which country of the overlay is currently being read, if any. A view
   * state, deliberately not a field on the overlay: the overlay states facts
   * about the family, and which country the reader is looking at is not one of
   * them. Changing it also replays the reveal, so the trace redraws itself
   * around the new subject.
   */
  focusedCountryId?: CountryId | null;
  /**
   * Called when the globe cannot be built after all (REQ-112 AC2).
   *
   * Every bail-out below is a bare `return` that leaves a transparent canvas:
   * no context, or a shader the driver refuses to compile or link — the common
   * failure on low-end hardware, and one that arrives *after* a caller has
   * already swapped its own fallback out. Without this the map is simply
   * missing, with nothing thrown and nothing logged.
   */
  onUnavailable?: () => void;
  /**
   * Which of the two painted surfaces the sphere is (globePalette.ts).
   *
   * Night is the fiche's, and the default. The parchment half had been
   * unreachable since ETNI-1360 — this call passed no argument, so ten
   * `--afh-globe-parchment-*` tokens and half of GLOBE_LIGHTING were
   * maintained code nothing could render.
   */
  surface?: GlobeSurface;
}

/**
 * The WebGL half of AtlasGlobe (ADR-0007). Draws exactly the overlay
 * descriptor it is given: a country/family ring as a filled, stroked
 * GL_LINE_LOOP + GL_TRIANGLES pair, or a people field as GL_POINTS —
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
  focusedCountryId = null,
  onUnavailable,
  surface = "night",
}: AtlasGlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  const poseRef = useRef(pose);
  const drawRef = useRef<(() => void) | null>(null);
  // The live layer, so a surface change repaints it instead of rebuilding it.
  const sphereRef = useRef<SphereLayer | null>(null);
  // Read inside the mount effect, which deliberately does not depend on the
  // surface; the effect below is what carries a change across.
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;
  // What the live texture was actually painted for, which is not the same as
  // the prop the moment the mount effect re-runs for an overlay change.
  const appliedSurfaceRef = useRef(surface);
  const focusRef = useRef<CountryId | null>(focusedCountryId);
  const replayRevealRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  // Held in a ref rather than listed as a dependency: a caller that passes an
  // inline arrow would otherwise tear down and rebuild the whole GL context on
  // every render of its own.
  const giveUpRef = useRef(onUnavailable);
  useEffect(() => {
    giveUpRef.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    // Every path out of this effect that leaves nothing painted goes through
    // here, so a caller learns the canvas is transparent rather than reading
    // an empty stage as a slow one.
    const giveUp = () => giveUpRef.current?.();

    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) {
      giveUp();
      return;
    }

    const [r, g, b] = hexToRgbFloats(accentHex ?? resolveAccentHex(canvas));
    // The focused country's outline lifts towards the accent's light tint so it
    // separates from its neighbours by hue as well as by width — on a footprint
    // of seventeen adjacent countries, width alone is not enough to find it.
    const focusRgb = hexToRgbFloats(resolveAccentTintHex(canvas));

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let aspect = 1;
    let devicePixelRatio = 1;
    let disposed = false;
    let visible = true;
    let frameId: number | null = null;
    let lastTimestamp: number | null = null;

    // The people field has no line to draw, so nothing to reveal. Both closed
    // encodings trace themselves in.
    const progressRef = { current: overlay.kind === "people-field" ? 1 : 0 };
    const revealDurationSeconds =
      overlay.kind === "family-footprint"
        ? FOOTPRINT_REVEAL_DURATION_SECONDS
        : REVEAL_DURATION_SECONDS;

    // The same lit sphere the home hero stands on. Drawn at margin 1 so it
    // shares the overlay shaders' projection exactly — an outline traced
    // over terrain that sat at a different scale would be describing
    // ground it does not touch. It draws first and only ever draws
    // terrain, so it can never be what closes a boundary around a people
    // (atlas-charter §1).
    const sphere: SphereLayer | null = createSphereLayer(
      gl,
      resolveGlobePalette(surfaceRef.current),
      document.createElement("canvas"),
      undefined,
      false,
      lightingFor(surfaceRef.current),
      // A fiche paints the national boundaries: a chosen country has to be
      // read against its neighbours, not float on a blank continent.
      //
      // Pinned true, which the continent scene does not need: it draws the
      // same 52 outlines again as its overlay frame, so the hubs, the home and
      // the Mercator game pay for the mesh twice. Left pinned deliberately —
      // the hinge is the scene, not the surface, and moving it touches four
      // surfaces that are not what this change is about.
      true
    );
    sphereRef.current = sphere;
    // The layer was just built for this surface, so the effect below has
    // nothing to carry across — including when an overlay change rebuilds it
    // in the same commit as a theme flip.
    appliedSurfaceRef.current = surfaceRef.current;

    // The terrain rides the same camera as the overlay drawn over it. A
    // boundary that dollies toward the reader while the ground stays put
    // would be tracing a coastline it no longer touches — the very thing
    // drawing this layer at margin 1 was meant to prevent.
    const paintBase = (camera: CameraPose) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      sphere?.draw({
        rotation: buildRotationMatrix(camera.yaw, camera.pitch),
        morph: camera.morph,
        aspect,
        zoom: camera.zoom,
        offsetX: cameraOffset(camera).x,
        offsetY: cameraOffset(camera).y,
      });
    };

    let draw: () => void = () => {};

    /**
     * The radial field, as a layer rather than a branch.
     *
     * A people fiche is made of nothing else, so there it is the whole
     * overlay. The continent scene draws it *over* its frame — the frame
     * locates, the field is the only thing carrying a count — which is why
     * this had to stop being the other half of an if/else. Returns null when
     * the program will not compile, so a caller can fall back rather than
     * paint nothing.
     */
    const createFieldLayer = (
      areas: PeopleFieldArea[]
    ): ((camera: CameraPose) => void) | null => {
      const program = createProgram(
        gl,
        FIELD_VERTEX_SHADER,
        FIELD_FRAGMENT_SHADER
      );
      if (!program) return null;
      gl.useProgram(program);

      const field = buildPointField(areas);
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, field.positions, gl.STATIC_DRAW);
      const aSpherePos = gl.getAttribLocation(program, "aSpherePos");
      gl.enableVertexAttribArray(aSpherePos);
      gl.vertexAttribPointer(aSpherePos, 3, gl.FLOAT, false, 0, 0);

      const flatBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, flatBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, field.flatPositions, gl.STATIC_DRAW);
      const aFlat = gl.getAttribLocation(program, "aFlat");
      gl.enableVertexAttribArray(aFlat);
      gl.vertexAttribPointer(aFlat, 3, gl.FLOAT, false, 0, 0);

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
      const uMorph = gl.getUniformLocation(program, "uMorph");
      const uScale = gl.getUniformLocation(program, "uScale");

      return (camera: CameraPose) => {
        // The sphere layer — and, on the continent, the frame drawn after it —
        // left their own program and buffers bound, so the field's have to be
        // restated every frame rather than once at setup.
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(aSpherePos);
        gl.vertexAttribPointer(aSpherePos, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, flatBuffer);
        gl.enableVertexAttribArray(aFlat);
        gl.vertexAttribPointer(aFlat, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, weightBuffer);
        gl.enableVertexAttribArray(aWeight);
        gl.vertexAttribPointer(aWeight, 1, gl.FLOAT, false, 0, 0);

        gl.uniform1f(uMorph, camera.morph);
        // The margin the sphere layer is mounted at, so both land on the same
        // ground — see the createSphereLayer call above.
        gl.uniform1f(
          uScale,
          fitScale(camera.morph, aspect, DEFAULT_FIT_MARGIN)
        );

        gl.uniformMatrix3fv(
          uRotation,
          false,
          new Float32Array(buildRotationMatrix(camera.yaw, camera.pitch))
        );
        gl.uniform1f(uAspect, aspect);
        gl.uniform1f(uZoom, camera.zoom);
        gl.uniform2f(uOffset, cameraOffset(camera).x, cameraOffset(camera).y);
        gl.uniform1f(
          uBasePointSize,
          PEOPLE_BASE_POINT_SIZE_CSS_PX * devicePixelRatio
        );
        gl.uniform3f(uColorRgb, r, g, b);
        gl.drawArrays(gl.POINTS, 0, field.vertexCount);
      };
    };

    if (overlay.kind === "people-field") {
      const drawField = createFieldLayer(overlay.areas);
      if (!drawField) {
        giveUp();
        return;
      }

      draw = () => {
        const camera = poseRef.current;
        // paintBase clears, so the overlay must not clear again after it.
        paintBase(camera);
        drawField(camera);
      };
    } else {
      const program = createProgram(
        gl,
        BOUNDARY_VERTEX_SHADER,
        BOUNDARY_FRAGMENT_SHADER
      );
      if (!program) {
        giveUp();
        return;
      }
      gl.useProgram(program);

      const aSpherePos = gl.getAttribLocation(program, "aSpherePos");
      const aFlat = gl.getAttribLocation(program, "aFlat");
      const aArcFraction = gl.getAttribLocation(program, "aArcFraction");
      const uRotation = gl.getUniformLocation(program, "uRotation");
      const uAspect = gl.getUniformLocation(program, "uAspect");
      const uZoom = gl.getUniformLocation(program, "uZoom");
      const uOffset = gl.getUniformLocation(program, "uOffset");
      const uColor = gl.getUniformLocation(program, "uColor");
      const uIsStroke = gl.getUniformLocation(program, "uIsStroke");
      const uProgress = gl.getUniformLocation(program, "uProgress");
      const uDashRepeats = gl.getUniformLocation(program, "uDashRepeats");
      const uMorph = gl.getUniformLocation(program, "uMorph");
      const uScale = gl.getUniformLocation(program, "uScale");

      const isFamily = overlay.kind === "family-footprint";

      // The family's fill is per country and resolved at draw time, because it
      // also depends on which country currently holds the focus. The other two
      // encodings carry one fill for the whole overlay.
      const staticFillOpacity = isFamily ? 0 : overlay.fillOpacity;

      // A frame declared at zero fill (CONTINENT_FRAME_FILL_OPACITY) does not
      // draw a transparent area, it draws no area at all — skipping the pass
      // is what makes a per-country fill impossible rather than merely
      // invisible (atlas-charter §1). No fill drawn, so no fill triangulated either.
      const fillsRings = isFamily || staticFillOpacity > 0;

      // The continent frame is 51 reference outlines and carries no count of
      // its own, so it reaches this program as rings like any other boundary.
      const ringSource =
        overlay.kind === "continent-field"
          ? overlay.frame.flatMap((country) => country.rings)
          : overlay.kind === "family-footprint"
            ? []
            : overlay.rings;

      // One entry per ring, each carrying the paint its own country earned.
      // A single fillOpacity for the whole overlay can only draw a flat wash,
      // and a choropleth is the entire point of a derived footprint: it turns
      // "the family is here" into "this is where it is concentrated".
      const shapes = isFamily
        ? overlay.countries.flatMap((country) =>
            country.rings.map((ring) => ({
              countryId: country.countryId,
              weight: country.weight,
              dashRepeats: footprintDashRepeats(ring),
              fill: buildRingFill(ring),
              loop: buildRingLineLoop(ring),
            }))
          )
        : ringSource.map((ring) => ({
            countryId:
              overlay.kind === "country-outline" ? overlay.countryId : null,
            weight: 1,
            dashRepeats: 0,
            fill: fillsRings ? buildRingFill(ring) : null,
            loop: buildRingLineLoop(ring),
          }));

      const fillBuffer = gl.createBuffer();
      const fillFlatBuffer = gl.createBuffer();
      const loopPositionBuffer = gl.createBuffer();
      const loopFlatBuffer = gl.createBuffer();
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
        gl.uniform2f(uOffset, cameraOffset(camera).x, cameraOffset(camera).y);
        gl.uniform1f(uMorph, camera.morph);
        // The margin the sphere layer is mounted at, so the boundary and the
        // ground land on the same surface at the same size.
        gl.uniform1f(
          uScale,
          fitScale(camera.morph, aspect, DEFAULT_FIT_MARGIN)
        );

        const focusedCountryId = focusRef.current;
        // Eased here rather than in the frame loop so both the stroke reveal
        // and any future consumer read the same curve.
        const revealed = footprintRevealEase(progressRef.current);

        shapes.forEach(({ countryId, weight, dashRepeats, fill, loop }) => {
          const isFocused = focusedCountryId === countryId;
          const dimmed = focusedCountryId !== null && !isFocused;

          const fillOpacity = isFamily
            ? footprintFillOpacity({ weight, dimmed })
            : staticFillOpacity;
          const strokeOpacity = isFamily ? footprintStrokeOpacity(dimmed) : 1;
          const [sr, sg, sb] = isFocused ? focusRgb : [r, g, b];

          if (fill) {
            gl.bindBuffer(gl.ARRAY_BUFFER, fillBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, fill.positions, gl.STATIC_DRAW);
            gl.enableVertexAttribArray(aSpherePos);
            gl.vertexAttribPointer(aSpherePos, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, fillFlatBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, fill.flatPositions, gl.STATIC_DRAW);
            gl.enableVertexAttribArray(aFlat);
            gl.vertexAttribPointer(aFlat, 3, gl.FLOAT, false, 0, 0);
            gl.disableVertexAttribArray(aArcFraction);
            gl.vertexAttrib1f(aArcFraction, 0);
            gl.uniform1f(uIsStroke, 0);
            gl.uniform1f(uProgress, 1);
            gl.uniform1f(uDashRepeats, 0);
            gl.uniform4f(uColor, r, g, b, fillOpacity);
            gl.drawArrays(gl.TRIANGLES, 0, fill.vertexCount);
          }

          gl.bindBuffer(gl.ARRAY_BUFFER, loopPositionBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, loop.positions, gl.STATIC_DRAW);
          gl.enableVertexAttribArray(aSpherePos);
          gl.vertexAttribPointer(aSpherePos, 3, gl.FLOAT, false, 0, 0);

          gl.bindBuffer(gl.ARRAY_BUFFER, loopFlatBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, loop.flatPositions, gl.STATIC_DRAW);
          gl.enableVertexAttribArray(aFlat);
          gl.vertexAttribPointer(aFlat, 3, gl.FLOAT, false, 0, 0);

          gl.bindBuffer(gl.ARRAY_BUFFER, loopArcBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, loop.arcFractions, gl.STATIC_DRAW);
          gl.enableVertexAttribArray(aArcFraction);
          gl.vertexAttribPointer(aArcFraction, 1, gl.FLOAT, false, 0, 0);

          gl.uniform1f(uIsStroke, 1);
          gl.uniform1f(uProgress, revealed);
          gl.uniform1f(uDashRepeats, dashRepeats);
          gl.uniform4f(uColor, sr, sg, sb, strokeOpacity);
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
          progressRef.current + seconds / revealDurationSeconds
        );
        draw();
        scheduleReveal();
      });
    };

    // Replayed on every country choice, so the trace redraws itself around the
    // new subject instead of the map simply recolouring under the reader.
    replayRevealRef.current = () => {
      if (reducedMotionRef.current) {
        progressRef.current = 1;
        draw();
        return;
      }
      progressRef.current = 0;
      lastTimestamp = null;
      draw();
      scheduleReveal();
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
      sphereRef.current = null;
    };
  }, [overlay, accentHex]);

  /**
   * A theme flip repaints the surface; it does not rebuild the layer.
   *
   * Listing `surface` in the effect above would be the obvious wiring and the
   * wrong one: tearing the layer down recompiles both shader programs,
   * re-uploads the whole mesh, and drops the angle the reader had turned the
   * globe to — they would ask for a different colour and be handed back to the
   * Atlantic. `setSurface` re-paints one texture and keeps the camera.
   *
   * Guarded on the applied value because the mount effect already built the
   * layer with the current surface; without it, every mount would repaint a
   * 2048×1024 texture to arrive at the picture it just drew.
   */
  useEffect(() => {
    if (appliedSurfaceRef.current === surface) return;
    appliedSurfaceRef.current = surface;
    sphereRef.current?.setSurface(
      resolveGlobePalette(surface),
      lightingFor(surface)
    );
    drawRef.current?.();
  }, [surface]);

  useEffect(() => {
    poseRef.current = pose;
    drawRef.current?.();
  }, [pose]);

  useEffect(() => {
    focusRef.current = focusedCountryId;
    // Replaying redraws, so this must not also call draw() — the trace would
    // paint once complete before restarting from nothing, which reads as a
    // flash.
    replayRevealRef.current?.();
  }, [focusedCountryId]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        // AtlasGlobe's interaction surface is laid over the stage and this is
        // mounted over that, later in the DOM and positioned, so without this
        // the canvas won every hit test and the globe could not be turned.
        // It is aria-hidden paint: it has no business taking a pointer.
        pointerEvents: "none",
      }}
    />
  );
}

export default AtlasGlobeCanvas;
