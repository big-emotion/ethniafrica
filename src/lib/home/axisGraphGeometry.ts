import type { AccessMode } from "@/lib/hubs/moduleRegistry";

/**
 * The geometry behind the home's axis panels (REQ-114): where each module
 * node sits around the opened card, how that unit-space position becomes a
 * pixel on the panel, and which edge the pointer is over.
 *
 * These are pure functions on purpose, in the same spirit as
 * src/lib/atlas/projection.ts: the WebGL layer and the DOM cards must agree
 * on every node's position to the pixel, so both read it from here rather
 * than each computing its own. That also means the layout is testable
 * without a GL context — the part that actually holds the rules.
 */

export type AxisLayout = "ring" | "arc" | "pair" | "column";

/** Unit-space position; the opened card is the origin. */
export interface GraphNode {
  x: number;
  y: number;
  /** Depth. Positive is toward the reader. */
  z: number;
}

export interface PanelBox {
  width: number;
  height: number;
}

/** Scene rotation in radians — base tilt plus whatever the pointer adds. */
export interface Tilt {
  x: number;
  y: number;
}

export interface ProjectedNode {
  /** Pixels from the panel centre. */
  x: number;
  y: number;
  /** Rotated depth, for painter's-order sorting and fog. */
  depth: number;
  /** Perspective factor; 1 at the centre plane. */
  scale: number;
}

/**
 * Each axis deploys its modules the way its glyph moves: Explorer's dots
 * scatter into a ring, Comprendre's arc writes them along its course,
 * Jouer's two discs set them face to face.
 */
// @req REQ-114
export const LAYOUT_BY_AXIS: Record<AccessMode, AxisLayout> = {
  explorer: "ring",
  comprendre: "arc",
  jouer: "pair",
};

/** Camera distance in unit space. Shallow enough that depth reads. */
const CAMERA_DISTANCE = 3.2;

/**
 * How much of the panel half-box the unit circle spans. It has to clear
 * the opened card sitting at the origin, so the ring cannot hug the
 * centre — at 0.62 the top node landed on the card's own title.
 */
const FILL = 0.72;

function ringNodes(count: number): GraphNode[] {
  return Array.from({ length: count }, (_, index) => {
    // Screen coordinates, so -PI/2 is straight up: the first module always
    // sits at the top of the ring, whatever the count.
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return { x: Math.cos(angle), y: Math.sin(angle), z: 0 };
  });
}

function arcNodes(count: number): GraphNode[] {
  return Array.from({ length: count }, (_, index) => {
    const progress = count === 1 ? 0.5 : index / (count - 1);
    const lift = Math.sin(Math.PI * progress);
    return {
      x: -1 + 2 * progress,
      // The ends sit under the centre line and the apex rises well above
      // it, so the run reads as a trajectory and not a row. The apex has
      // to clear the opened card at the origin, which is what sets how
      // far the two coefficients are apart.
      y: 0.25 - 1.05 * lift,
      z: -0.25 + 0.5 * lift,
    };
  });
}

function pairNodes(count: number): GraphNode[] {
  const rows = Math.ceil(count / 2);
  return Array.from({ length: count }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    const rowOffset = rows === 1 ? 0 : (row / (rows - 1)) * 1.4 - 0.7;
    return { x: side, y: 0.05 + rowOffset, z: 0.1 };
  });
}

function columnNodes(count: number): GraphNode[] {
  return Array.from({ length: count }, (_, index) => ({
    x: 0,
    y: count === 1 ? 0 : (index / (count - 1)) * 1.8 - 0.9,
    z: 0,
  }));
}

// @req REQ-114
export function layoutNodes(layout: AxisLayout, count: number): GraphNode[] {
  if (count <= 0) return [];
  if (layout === "ring") return ringNodes(count);
  if (layout === "arc") return arcNodes(count);
  if (layout === "pair") return pairNodes(count);
  return columnNodes(count);
}

// @req REQ-114
export function projectNode(
  node: GraphNode,
  tilt: Tilt,
  box: PanelBox
): ProjectedNode {
  const cosY = Math.cos(tilt.y);
  const sinY = Math.sin(tilt.y);
  const xy = node.x * cosY + node.z * sinY;
  const zy = -node.x * sinY + node.z * cosY;

  const cosX = Math.cos(tilt.x);
  const sinX = Math.sin(tilt.x);
  const yx = node.y * cosX - zy * sinX;
  const depth = node.y * sinX + zy * cosX;

  const scale = CAMERA_DISTANCE / (CAMERA_DISTANCE - depth);

  return {
    x: xy * (box.width / 2) * FILL * scale,
    y: yx * (box.height / 2) * FILL * scale,
    depth,
    scale,
  };
}

/**
 * Opening choreography, one per layout: how long each module waits before
 * it leaves the centre, and how long it takes to get where it is going.
 * Explorer's dots scatter nearly together, Comprendre's arc lays its
 * modules down in sequence, Jouer's pair pushes apart in one movement.
 */
const ENTRANCE: Record<AxisLayout, { stagger: number; duration: number }> = {
  ring: { stagger: 70, duration: 420 },
  arc: { stagger: 150, duration: 380 },
  pair: { stagger: 90, duration: 460 },
  column: { stagger: 60, duration: 300 },
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * How far along its arrival a given module is, from 0 (still at the centre,
 * under the opened card) to 1 (settled on its node).
 */
// @req REQ-114
export function entranceProgress(
  layout: AxisLayout,
  index: number,
  elapsedMs: number
): number {
  const { stagger, duration } = ENTRANCE[layout];
  const started = elapsedMs - index * stagger;
  if (started <= 0) return 0;
  if (started >= duration) return 1;
  return easeOutCubic(started / duration);
}

interface Point {
  x: number;
  y: number;
}

function distanceToSegment(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0)
    return Math.hypot(point.x - from.x, point.y - from.y);

  // Clamped so the edge stops at the node: past it there is nothing to
  // light up, which is what makes a pointer beyond a node miss.
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared
    )
  );
  return Math.hypot(point.x - (from.x + t * dx), point.y - (from.y + t * dy));
}

/**
 * Index of the edge under the pointer, or null when the pointer is on none
 * of them. Edges run from the opened card to each module node.
 */
// @req REQ-114
export function nearestEdge(
  pointer: Point,
  projected: ProjectedNode[],
  centre: Point,
  tolerance: number
): number | null {
  let best: number | null = null;
  let bestDistance = tolerance;

  projected.forEach((node, index) => {
    const distance = distanceToSegment(pointer, centre, node);
    if (distance <= bestDistance) {
      // Strictly closer wins; an exact tie keeps the earlier edge.
      if (best === null || distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    }
  });

  return best;
}
