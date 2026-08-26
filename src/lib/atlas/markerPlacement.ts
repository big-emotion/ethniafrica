/**
 * Where a target's marker sits on the globe stage (REQ-117). The `<canvas>` is
 * aria-hidden, so the choosable things are real buttons laid over the stage —
 * which means their position has to be derived in TypeScript with exactly the
 * arithmetic the shader performs, or the button and the shape it names drift
 * apart.
 *
 * Two projections, one output: the WebGL path rotates a sphere, the fallback
 * pans a flat basemap, and both return the same stage percentages so the rest
 * of the component never has to know which path it is on.
 */
import type { CameraPose } from "@/lib/atlas/camera";
import type { LonLat } from "@/lib/atlas/overlays";
import {
  BASEMAP_VIEWBOX,
  buildRotationMatrix,
  lonLatToSphere,
  projectLonLat,
  rotateSpherePoint,
} from "@/lib/atlas/projection";
import type { AtlasTarget } from "@/lib/atlas/targets";

export interface StagePlacement {
  /** Percentage across the stage, 0 at its left edge. */
  leftPercent: number;
  /** Percentage down the stage, 0 at its top edge. */
  topPercent: number;
  /** False for a point on the far side of the sphere, which must not be clickable. */
  facingReader: boolean;
}

/** The stage is laid out at the basemap's own fixed aspect ratio, so this never varies at runtime. */
// @req REQ-117
export const STAGE_ASPECT = BASEMAP_VIEWBOX.width / BASEMAP_VIEWBOX.height;

function clipToStage(
  clipX: number,
  clipY: number,
  facingReader: boolean
): StagePlacement {
  return {
    leftPercent: (clipX + 1) * 50,
    topPercent: (1 - clipY) * 50,
    facingReader,
  };
}

/**
 * Mirrors AtlasGlobeCanvas's vertex shader step for step: rotate, divide x by
 * the aspect, scale by the dolly, then translate by the panel bias.
 */
// @req REQ-117
export function placeTargetOnSphere(
  target: AtlasTarget,
  pose: CameraPose,
  aspect: number = STAGE_ASPECT
): StagePlacement {
  const rotated = rotateSpherePoint(
    buildRotationMatrix(pose.yaw, pose.pitch),
    lonLatToSphere(target.center.lon, target.center.lat)
  );

  return clipToStage(
    (rotated.x / aspect) * pose.zoom + pose.offsetX,
    rotated.y * pose.zoom + pose.offsetY,
    rotated.z >= 0
  );
}

/**
 * The flat map has no rotation to apply, so the pose reaches it as a pan and a
 * scale: `focus` is brought to the place the bias asks for, at the dolly's
 * scale. A null focus — nothing chosen yet — is the identity, which is the
 * plain REQ-116 basemap.
 */
function basemapPanZoom(pose: CameraPose, focus: LonLat | null) {
  if (!focus) return { translateX: 0, translateY: 0, scale: 1 };

  const { width, height } = BASEMAP_VIEWBOX;
  const projected = projectLonLat(focus.lon, focus.lat, BASEMAP_VIEWBOX);

  return {
    translateX: ((pose.offsetX + 1) / 2) * width - projected.x * pose.zoom,
    translateY: ((1 - pose.offsetY) / 2) * height - projected.y * pose.zoom,
    scale: pose.zoom,
  };
}

// @req REQ-117
export function basemapTransform(
  pose: CameraPose,
  focus: LonLat | null
): string {
  const { translateX, translateY, scale } = basemapPanZoom(pose, focus);
  return `translate(${translateX} ${translateY}) scale(${scale})`;
}

// @req REQ-117
export function placeTargetOnBasemap(
  target: AtlasTarget,
  pose: CameraPose,
  focus: LonLat | null
): StagePlacement {
  const { translateX, translateY, scale } = basemapPanZoom(pose, focus);
  const projected = projectLonLat(
    target.center.lon,
    target.center.lat,
    BASEMAP_VIEWBOX
  );

  return {
    leftPercent:
      ((projected.x * scale + translateX) / BASEMAP_VIEWBOX.width) * 100,
    topPercent:
      ((projected.y * scale + translateY) / BASEMAP_VIEWBOX.height) * 100,
    facingReader: true,
  };
}
