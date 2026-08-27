/**
 * The fiche globe's camera (REQ-117, ARCH-015). Pure geometry: a pose is what
 * the renderers are handed, and both the WebGL and SVG paths apply it the same
 * way — rotate, scale by zoom, then translate by the panel bias.
 *
 * The globe is orthographic, so "dolly" is a clip-space scale rather than a
 * camera translation along z. Introducing a projection matrix would buy nothing
 * here and would make the SVG fallback unable to reproduce the same framing.
 */
import { AFRICA_CENTER_LON } from "@/lib/atlas/projection";
import type { CameraBias } from "@/lib/atlas/panelBias";
import type { AtlasTarget } from "@/lib/atlas/targets";

const DEG2RAD = Math.PI / 180;
const TWO_PI = 2 * Math.PI;

/** The two ends of the projection morph, named so callers stop passing raw 0/1. */
// @req REQ-117
export const SPHERE_MORPH = 1;
// @req REQ-117
export const FLAT_MORPH = 0;

export interface CameraPose {
  /** Radians around the polar axis. */
  yaw: number;
  /** Radians around the horizontal axis, positive tilting the northern hemisphere towards the reader. */
  pitch: number;
  /** Clip-space scale: 1 is the whole visible hemisphere. */
  zoom: number;
  offsetX: number;
  offsetY: number;
  /**
   * 0 = flat Mercator, 1 = sphere. It rides the camera rather than the
   * paint layer because it is a framing choice like zoom: the reader asks
   * what the flat map makes of a country, and the answer has to fly there
   * on the same journey as everything else.
   */
  morph: number;
}

// @req REQ-117
export const FLY_TO_DURATION_MS = 720;

/**
 * The dolly is expressed as a fraction of the distance at which the globe just
 * fits the stage, which is how the mockup states it: never nearer than 0.62 of
 * that distance, never further than 0.95, and linear in the target's span
 * between the two. Magnification is the reciprocal, so it tops out just under
 * 1.62x — close enough to read a country, far enough that its neighbours are
 * still on screen. A frontier without them says nothing.
 */
const FIT_DISTANCE_NEAREST = 0.62;
const FIT_DISTANCE_FURTHEST = 0.95;
const FIT_DISTANCE_AT_ZERO_SPAN = 0.46;
const FIT_DISTANCE_PER_DEG = 1 / 78;

/** The whole globe, undollied — what an unchosen fiche opens on. */
// @req REQ-117
export const MIN_ZOOM = 1;
/** The tightest framing the curve above can reach. */
// @req REQ-117
export const MAX_ZOOM = 1 / FIT_DISTANCE_NEAREST;

/** The unchosen globe: Africa facing the reader, undollied and uncentred by any panel. */
// @req REQ-117
export const IDLE_POSE: CameraPose = {
  yaw: -AFRICA_CENTER_LON * DEG2RAD,
  pitch: 0,
  zoom: MIN_ZOOM,
  offsetX: 0,
  offsetY: 0,
  morph: SPHERE_MORPH,
};

/**
 * A wide target is watched from further back than a narrow one, along the
 * straight line the mockup draws between the two ends of the curve.
 *
 * Deriving the dolly from the share of the stage the subject should fill — the
 * shape this had — is what let it reach 3.2x: a small country asks for so much
 * magnification that the sphere's limb leaves the stage on every side, and the
 * ceiling meant to stop that was set above the point where it happens.
 */
// @req REQ-117
export function zoomForAngularSpan(angularSpanDeg: number): number {
  const span = Number.isFinite(angularSpanDeg)
    ? Math.max(0, angularSpanDeg)
    : 0;
  const fitDistance = Math.min(
    FIT_DISTANCE_FURTHEST,
    Math.max(
      FIT_DISTANCE_NEAREST,
      FIT_DISTANCE_AT_ZERO_SPAN + span * FIT_DISTANCE_PER_DEG
    )
  );
  return Math.max(MIN_ZOOM, 1 / fitDistance);
}

/**
 * The rotation that brings `(lon, lat)` to face the reader: the globe's
 * rotation is yaw-then-pitch, and the point at the centre of the near face is
 * the one whose longitude cancels the yaw and whose latitude equals the pitch.
 */
// @req REQ-117
export function poseForTarget(
  target: AtlasTarget,
  bias: CameraBias,
  morph: number = SPHERE_MORPH
): CameraPose {
  return {
    yaw: -target.center.lon * DEG2RAD,
    pitch: target.center.lat * DEG2RAD,
    zoom: zoomForAngularSpan(target.angularSpanDeg),
    offsetX: bias.offsetX,
    offsetY: bias.offsetY,
    // Carried, not reset: choosing a country does not change which surface the
    // reader is on. A caller that omits it gets the sphere, which is where a
    // fiche opens.
    morph,
  };
}

/** The signed turn from one yaw to another, never longer than half a globe. */
// @req REQ-117
export function shortestYawDelta(from: number, to: number): number {
  const delta = (to - from) % TWO_PI;
  if (delta > Math.PI) return delta - TWO_PI;
  if (delta < -Math.PI) return delta + TWO_PI;
  return delta;
}

/** Keeps an idle rotation inside a single turn — an unbounded yaw loses float precision over a long session. */
// @req REQ-117
export function advanceYaw(yaw: number, deltaRadians: number): number {
  return (yaw + deltaRadians) % TWO_PI;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

// @req REQ-117
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * `t` outside 0..1 clamps to the endpoints rather than overshooting: a fly-to
 * that ran a frame long must land on its destination, not past it.
 */
// @req REQ-117
export function interpolatePose(
  from: CameraPose,
  to: CameraPose,
  t: number
): CameraPose {
  if (t <= 0) return from;
  if (t >= 1) return to;

  return {
    yaw: from.yaw + shortestYawDelta(from.yaw, to.yaw) * t,
    pitch: lerp(from.pitch, to.pitch, t),
    zoom: lerp(from.zoom, to.zoom, t),
    offsetX: lerp(from.offsetX, to.offsetX, t),
    offsetY: lerp(from.offsetY, to.offsetY, t),
    // Clamped: the surface is only defined between its two states, and an
    // overshooting easing would ask the shader to extrapolate past the plane.
    morph: Math.min(
      SPHERE_MORPH,
      Math.max(FLAT_MORPH, lerp(from.morph, to.morph, t))
    ),
  };
}
