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
 * The scene sits back on its heels so a ring reads as a ring. It lives here
 * rather than in the panel because the height a layout needs depends on it:
 * the tilt is what flattens the vertical spread of the nodes.
 */
// @req REQ-114
export const BASE_TILT_X = 0.42;

/**
 * The box one module card occupies. The panel's CSS reads these too, so the
 * room the geometry reserves and the room a card actually takes cannot
 * drift apart — which is how eleven cards ended up 36px apart while being
 * 50 to 85px tall.
 *
 * The height is what a two-line label needs, applied to every card so the
 * scene stops varying with how long a module happens to be named. The
 * gutter absorbs the rest: perspective scales a card up to about 1.15x on
 * the near side of the scene, so the room between two nodes has to clear
 * more than the card's own CSS height.
 */
// @req REQ-114
export const MODULE_CARD_WIDTH = 220;
// @req REQ-114
export const MODULE_CARD_HEIGHT = 72;
// @req REQ-114
export const MODULE_CARD_GUTTER = 22;

/**
 * The width the scene is sized against. The panel spans the axis grid,
 * capped at 1140px, and the scene only runs from 860px up — below that the
 * modules become a plain column and none of this applies.
 */
// @req REQ-114
export const REFERENCE_PANEL_WIDTH = 1140;

/**
 * Vertical room each layout needs to clear the opened card sitting at the
 * origin, before any question of how many modules it holds.
 */
const CENTRE_CLEARANCE: Record<AxisLayout, number> = {
  ring: 600,
  arc: 560,
  pair: 420,
  // Ordinary flow: the rows size the panel, not the other way round.
  column: 0,
};

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

/** Below this, two nodes sit at the same height and no height separates them. */
const COINCIDENT_Y = 1e-9;

/**
 * How tall the panel has to be for a scene of `count` modules.
 *
 * `pair` was written for the two modules Jouer held when it shipped and
 * kept a fixed 420px when REQ-120 handed it eleven: six rows over a fixed
 * span put them 36px apart under cards up to 85px tall, so three of the
 * eleven could not be clicked at their own centre. Deriving the height from
 * the node set means a layout can be handed any count without the author of
 * the next module having to remember this.
 */
// @req REQ-114
export function panelHeightFor(layout: AxisLayout, count: number): number {
  const clearance = CENTRE_CLEARANCE[layout];
  if (layout === "column" || count < 2) return clearance;

  const nodes = layoutNodes(layout, count);
  const tilt: Tilt = { x: BASE_TILT_X, y: 0 };
  // A unit box turns projectNode's output into the fraction of the panel's
  // half-height each node sits at, perspective included — so the height
  // solves straight out of the tightest gap.
  const unitBox: PanelBox = { width: 2, height: 2 };

  let tightest = Infinity;
  for (let i = 0; i < nodes.length; i += 1) {
    const a = projectNode(nodes[i], tilt, unitBox);
    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = projectNode(nodes[j], tilt, unitBox);
      // Two cards a full card-width apart in x never collide, whatever
      // their y — only the ones sharing a column constrain the height.
      const apart = Math.abs(a.x - b.x) * (REFERENCE_PANEL_WIDTH / 2);
      if (apart > MODULE_CARD_WIDTH) continue;
      // A pair the layout puts at the same height is side by side, not
      // stacked. No panel height separates them — arc does this at every
      // even count, where two nodes straddle the apex symmetrically — so
      // letting it through here would solve for an infinite height.
      const gap = Math.abs(a.y - b.y);
      if (gap > COINCIDENT_Y) tightest = Math.min(tightest, gap);
    }
  }

  if (!Number.isFinite(tightest)) return clearance;

  const needed = (2 * (MODULE_CARD_HEIGHT + MODULE_CARD_GUTTER)) / tightest;
  return Math.max(clearance, Math.ceil(needed));
}
