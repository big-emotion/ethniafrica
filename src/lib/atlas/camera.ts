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

/** Bounds that keep the dolly useful without losing the continent around the subject. */
// @req REQ-117
export const MIN_ZOOM = 1;
// @req REQ-117
export const MAX_ZOOM = 3.2;

/** Share of the stage the subject should occupy once the camera settles. */
const SUBJECT_VIEW_FRACTION = 0.45;

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
 * A target of angular span S subtends 2·sin(S/2) of the sphere's diameter when
 * it faces the reader, and the stage is 2 clip units across — so the zoom that
 * makes it fill the wanted share of the stage falls straight out of the ratio.
 */
// @req REQ-117
export function zoomForAngularSpan(angularSpanDeg: number): number {
  const subjectExtent = 2 * Math.sin((angularSpanDeg / 2) * DEG2RAD);
  if (subjectExtent <= 0) return MAX_ZOOM;

  const zoom = (SUBJECT_VIEW_FRACTION * 2) / subjectExtent;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/**
 * The rotation that brings `(lon, lat)` to face the reader: the globe's
 * rotation is yaw-then-pitch, and the point at the centre of the near face is
 * the one whose longitude cancels the yaw and whose latitude equals the pitch.
 */
// @req REQ-117
export function poseForTarget(
  target: AtlasTarget,
  bias: CameraBias
): CameraPose {
  return {
    yaw: -target.center.lon * DEG2RAD,
    pitch: target.center.lat * DEG2RAD,
    zoom: zoomForAngularSpan(target.angularSpanDeg),
    offsetX: bias.offsetX,
    offsetY: bias.offsetY,
    morph: SPHERE_MORPH,
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
    morph: lerp(from.morph, to.morph, t),
  };
}
