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
import { SPHERE_MORPH, type CameraPose } from "@/lib/atlas/camera";
import type { LonLat } from "@/lib/atlas/overlays";
import { fitScale } from "@/lib/atlas/sphereLayer";
import { lonLatToFlat } from "@/lib/atlas/sphereMesh";
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

/**
 * The ratio to place markers at before the stage has been measured.
 *
 * The stage is full-width over a fixed height, so its real ratio is a runtime
 * fact — 1512x520 on a laptop, far from this. Callers that can measure pass
 * their own; this only has to be a sane shape for the render that happens
 * before the first measurement, and the basemap's is the one already committed.
 */
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
  // The same mix the vertex shader performs between the two states of the
  // surface. Without it a marker stays over the sphere the reader has just
  // flattened away, naming ground that is no longer under it.
  const flat = lonLatToFlat(target.center.lon, target.center.lat);
  const x = flat.x + (rotated.x - flat.x) * pose.morph;
  const y = flat.y + (rotated.y - flat.y) * pose.morph;

  const scale = fitScale(pose.morph, aspect);

  return clipToStage(
    ((x * scale) / aspect) * pose.zoom + pose.offsetX,
    y * scale * pose.zoom + pose.offsetY,
    // A plane has no far side; only the sphere can turn a target away.
    pose.morph < SPHERE_MORPH || rotated.z >= 0
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

/**
 * Where the letterboxed basemap actually sits inside the stage.
 *
 * The stage is a fixed band and the basemap keeps its own ratio, so the drawn
 * map is centred inside the band with slack on one axis — exactly what an SVG
 * with `preserveAspectRatio="xMidYMid meet"` does. Markers are positioned as
 * percentages *of the stage*, while the projection produces percentages *of
 * the viewBox*; without this step the two are only equal when the band happens
 * to have the basemap's ratio, which at 1512x520 it does not.
 *
 * Returns the fraction of the stage the map covers on each axis, and the
 * fraction of slack before it starts.
 */
function basemapLetterbox(aspect: number): {
  spanX: number;
  spanY: number;
  originX: number;
  originY: number;
} {
  const mapAspect = BASEMAP_VIEWBOX.width / BASEMAP_VIEWBOX.height;
  const stageIsWider = aspect > mapAspect;

  const spanX = stageIsWider ? mapAspect / aspect : 1;
  const spanY = stageIsWider ? 1 : aspect / mapAspect;

  return {
    spanX,
    spanY,
    originX: (1 - spanX) / 2,
    originY: (1 - spanY) / 2,
  };
}

// @req REQ-117
export function placeTargetOnBasemap(
  target: AtlasTarget,
  pose: CameraPose,
  focus: LonLat | null,
  aspect: number = STAGE_ASPECT
): StagePlacement {
  const { translateX, translateY, scale } = basemapPanZoom(pose, focus);
  const projected = projectLonLat(
    target.center.lon,
    target.center.lat,
    BASEMAP_VIEWBOX
  );

  const inViewBoxX = (projected.x * scale + translateX) / BASEMAP_VIEWBOX.width;
  const inViewBoxY =
    (projected.y * scale + translateY) / BASEMAP_VIEWBOX.height;

  const { spanX, spanY, originX, originY } = basemapLetterbox(aspect);

  return {
    leftPercent: (originX + inViewBoxX * spanX) * 100,
    topPercent: (originY + inViewBoxY * spanY) * 100,
    facingReader: true,
  };
}

/**
 * How far from a country's projected centre a tap still reads as aiming at it,
 * as a share of stage width.
 *
 * Africa holds fifty-four countries across roughly a hundred degrees, so their
 * centres sit a few percent apart at continent zoom and this is generous
 * enough that no country is unreachable. It is a radius rather than a plain
 * nearest-wins because the stage is mostly ocean: a tap in the Atlantic should
 * dismiss, not silently open Mauritania.
 */
// @req REQ-117
export const TARGET_HIT_RADIUS_PERCENT = 14;

/**
 * Which country a tap on the stage aimed at (REQ-117).
 *
 * The continent scene draws a radial field for its twelve best-documented
 * countries but offers all fifty-four, because the charter's density rule is
 * about what the stage *draws* — fifty-four pastilles at 430px overlap into
 * noise — not about what it lets a reader reach. Hit-testing the stage keeps
 * both: twelve marks, fifty-four answers.
 *
 * Distance is measured in shares of stage width, so `topPercent` is divided by
 * the aspect ratio to bring a percentage point down onto the same footing as
 * one across. Without that, on a stage three times wider than tall, a tap
 * resolves to the country above it rather than the one beside it.
 */
// @req REQ-117
export function nearestFacingTarget(
  candidates: readonly { countryId: string; placement: StagePlacement }[],
  leftPercent: number,
  topPercent: number,
  aspect: number
): string | null {
  let nearestId: string | null = null;
  let nearestDistance = TARGET_HIT_RADIUS_PERCENT;

  for (const { countryId, placement } of candidates) {
    if (!placement.facingReader) continue;

    const distance = Math.hypot(
      placement.leftPercent - leftPercent,
      (placement.topPercent - topPercent) / aspect
    );
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestId = countryId;
    }
  }

  return nearestId;
}
