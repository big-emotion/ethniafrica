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
import type { TargetFrame } from "@/lib/atlas/targets";

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
  /**
   * The panel's bias: where the open sheet asks the subject to sit so the
   * panel does not cover it. Set by the layout, never by the reader.
   */
  offsetX: number;
  offsetY: number;
  /**
   * The reader's own pan, in the same clip units as the bias and added to it.
   *
   * Separate from the bias rather than folded into it because the two answer
   * to different owners: opening a sheet recomputes the bias, and a reader who
   * had dragged the map would have that drag silently overwritten. They sum at
   * exactly one place, `cameraOffset`.
   */
  panX: number;
  panY: number;
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

/**
 * How far in the reader may go by hand, which is further than any automatic
 * framing goes. The 1.62x ceiling above answers "frame this country with its
 * neighbours"; a reader dragging towards the Gambia, the Comoros or São Tomé is
 * asking the opposite question — make this thing big enough to aim at — and a
 * ceiling set for the first question makes the second unanswerable. At 6x the
 * near face spans roughly 30°, which is a country and its border rather than a
 * continent.
 *
 * The limb does leave the stage up there. That is what zooming in is; it is
 * only a defect when nobody asked for it.
 */
// @req REQ-117
export const READER_MAX_ZOOM = 6;

/**
 * One press of the zoom controls, as a factor rather than an increment: the
 * apparent step of a multiplicative zoom is constant, so the last press near
 * the ceiling moves the surface as much as the first press from rest. Seven
 * presses cover the whole range.
 */
// @req REQ-117
export const ZOOM_STEP = 1.35;

/** Keeps a hand-driven zoom between the whole hemisphere and the reader's ceiling. */
// @req REQ-117
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return MIN_ZOOM;
  return Math.min(READER_MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/**
 * How far the reader may pan at a given dolly: exactly the slack the dolly
 * created, and no more.
 *
 * The stage spans two clip units. A surface magnified by `zoom` spans `2·zoom`,
 * so `zoom - 1` of it hangs off each side — that is the whole of what panning
 * can reveal. Deriving the bound from the zoom rather than picking a constant
 * means an undollied map cannot be panned at all: there is nothing off-stage to
 * go and find, and a map that slides away from a reader who has not zoomed is
 * just a map they have lost.
 */
// @req REQ-117
export function panLimitForZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 0;
  return Math.max(0, zoom - 1);
}

/** Holds one axis of the reader's pan inside the slack the dolly created. */
// @req REQ-117
export function clampPan(value: number, zoom: number): number {
  if (!Number.isFinite(value)) return 0;
  const limit = panLimitForZoom(zoom);
  return Math.min(limit, Math.max(-limit, value));
}

/**
 * The one place the layout's bias and the reader's pan become a single
 * translation. Every renderer goes through it, so neither can be applied
 * without the other — the failure that would put a marker and the shape it
 * names on different parts of the stage.
 */
// @req REQ-117
export function cameraOffset(pose: CameraPose): { x: number; y: number } {
  return {
    x: pose.offsetX + pose.panX,
    y: pose.offsetY + pose.panY,
  };
}

/** The unchosen globe: Africa facing the reader, undollied and uncentred by any panel. */
// @req REQ-117
export const IDLE_POSE: CameraPose = {
  yaw: -AFRICA_CENTER_LON * DEG2RAD,
  pitch: 0,
  zoom: MIN_ZOOM,
  offsetX: 0,
  offsetY: 0,
  panX: 0,
  panY: 0,
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
  target: TargetFrame,
  bias: CameraBias,
  morph: number = SPHERE_MORPH
): CameraPose {
  return {
    yaw: -target.center.lon * DEG2RAD,
    pitch: target.center.lat * DEG2RAD,
    zoom: zoomForAngularSpan(target.angularSpanDeg),
    offsetX: bias.offsetX,
    offsetY: bias.offsetY,
    // A flight reframes, so it lands on the subject rather than on the subject
    // plus wherever the reader had dragged to. Same precedence as the zoom: a
    // choice beats the hand, and the hand beats a flight in progress.
    panX: 0,
    panY: 0,
    // Carried, not reset: choosing a country does not change which surface the
    // reader is on. A caller that omits it gets the sphere, which is where a
    // fiche opens.
    morph,
  };
}

/**
 * How far the reader may tip a pole towards themselves. Past this the horizon
 * leaves the stage and the sphere reads as a disc.
 *
 * It lives here rather than with the drag handler that used to own it because
 * the reader's turn is now applied inside the camera: a bound the camera does
 * not enforce is a bound the next caller forgets.
 */
// @req REQ-117
export const PITCH_LIMIT_RADIANS = 1.1;

// @req REQ-117
export function clampPitch(pitch: number): number {
  return Math.min(PITCH_LIMIT_RADIANS, Math.max(-PITCH_LIMIT_RADIANS, pitch));
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
    panX: lerp(from.panX, to.panX, t),
    panY: lerp(from.panY, to.panY, t),
    // Clamped: the surface is only defined between its two states, and an
    // overshooting easing would ask the shader to extrapolate past the plane.
    morph: Math.min(
      SPHERE_MORPH,
      Math.max(FLAT_MORPH, lerp(from.morph, to.morph, t))
    ),
  };
}

/**
 * Whether two poses frame the same thing, within the precision a renderer can
 * show. Compared rather than identity-tested because a fly-to's own frames are
 * interpolated, and yaws are compared the short way round: `advanceYaw` keeps a
 * turned yaw inside one revolution, so the same framing can be stated as 0 or
 * as 2π.
 */
// @req REQ-117
export function posesMatch(first: CameraPose, second: CameraPose): boolean {
  const tolerance = 1e-6;
  return (
    Math.abs(shortestYawDelta(first.yaw, second.yaw)) < tolerance &&
    Math.abs(first.pitch - second.pitch) < tolerance &&
    Math.abs(first.zoom - second.zoom) < tolerance &&
    Math.abs(first.offsetX - second.offsetX) < tolerance &&
    Math.abs(first.offsetY - second.offsetY) < tolerance &&
    Math.abs(first.panX - second.panX) < tolerance &&
    Math.abs(first.panY - second.panY) < tolerance &&
    Math.abs(first.morph - second.morph) < tolerance
  );
}
