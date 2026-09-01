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
  atlas: "ring",
  dossiers: "arc",
  jeux: "pair",
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
 * The type the card's label is set in. The card renders the token — this is
 * only its mirror, so the box reserved below can be worked out from it. The
 * two are held together by a test reading the token file, because a drift
 * between them is exactly the failure this module exists to prevent.
 *
 * @see src/styles/home-tokens.css — `--home-text-module-face`
 */
// @req REQ-114
export const MODULE_LABEL_FONT_SIZE = 15;

/**
 * The box one module card occupies. The panel's CSS reads these too, so the
 * room the geometry reserves and the room a card actually takes cannot
 * drift apart — which is how 11 cards ended up 36px apart while being
 * 50 to 85px tall.
 *
 * The height is what a **three**-line label needs. Two was the count the
 * box reserved and not the count the labels take: « Regards : colonisation
 * et résistances » wraps to three at 15px/600 in a 220px card, so the card
 * grew past its own slot and into its neighbour's. The gutter absorbs the
 * rest: perspective scales a card up to about 1.15x on the near side of the
 * scene, so the room between two nodes has to clear more than the card's
 * own CSS height.
 */
// @req REQ-114
export const MODULE_CARD_WIDTH = 220;
// @req REQ-114
export const MODULE_CARD_LINES = 3;
// @req REQ-114
export const MODULE_CARD_LINE_HEIGHT = 1.35;
// @req REQ-114
export const MODULE_CARD_PADDING_Y = 14;
const MODULE_CARD_BORDER = 1;
// @req REQ-114
export const MODULE_CARD_HEIGHT = Math.ceil(
  MODULE_CARD_LINES * MODULE_LABEL_FONT_SIZE * MODULE_CARD_LINE_HEIGHT +
    2 * (MODULE_CARD_PADDING_Y + MODULE_CARD_BORDER)
);
// @req REQ-114
export const MODULE_CARD_GUTTER = 22;

/**
 * The opened axis card, which the whole scene is deployed around. It sits at
 * the panel's origin, so it is an obstacle like any other card and the
 * geometry has to know its box — the arc used to lay « Premiers repères de
 * migrations » 31px across its title at every width, because the room kept
 * for it was one hand-set number per layout and nobody re-measured the card
 * after it grew a stake line.
 *
 * `AccessAxes` sizes the card from these two, so the box reserved here is
 * the box the reader sees rather than an estimate of it.
 */
// @req REQ-113
export const OPENED_CARD_WIDTH = 264;
// @req REQ-113
export const OPENED_CARD_HEIGHT = 240;

/**
 * The widest the panel ever gets: it spans the axis grid, which is capped
 * here — the grid's own `max-width` is interpolated from this constant, so
 * the cap has one home rather than two that can disagree.
 *
 * It is a ceiling, not the width to measure against. Sizing a scene against
 * it was the second half of the Comprendre collision: between 768 and
 * 1140px the guard compared cards against a window the panel does not have.
 */
// @req REQ-114
export const MAX_PANEL_WIDTH = 1140;

/**
 * Below this the panel stops being a scene and becomes a list, and the axis
 * cards it stands among fold into rows at the same width. It is the
 * project's mobile bound rather than a number of this page's own: the two
 * have to fold together, or a card laid out as a row would host a scene
 * positioning its modules around a centre that card no longer has.
 */
// @req REQ-114
export const SCENE_MIN_WIDTH = 768;

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
      // far the two coefficients are apart: at 1.05 the card the arc runs
      // over was 210px tall, and the 240px card it grew into left the two
      // middle modules lying across its title. `panelHeightFor` would now
      // buy that room back in panel height, which is worse — the arc is
      // cheaper raised than the panel is stretched.
      y: 0.25 - 1.5 * lift,
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

/**
 * The shape a layout is drawn as, on a panel wide enough to hold it. What
 * the panel actually renders is `sceneNodes`, which answers for the widths
 * that are not.
 */
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

/** The scene at rest — the pointer's parallax is a swing around this. */
const SCENE_TILT: Tilt = { x: BASE_TILT_X, y: 0 };

/**
 * A 2x2 box turns projectNode's output into the fraction of the panel's
 * half-width and half-height a node sits at, perspective included. Multiply
 * by the real half-width or half-height and it is pixels again.
 */
const UNIT_BOX: PanelBox = { width: 2, height: 2 };

/** Below this, two nodes sit at the same height and no height separates them. */
const COINCIDENT_Y = 1e-9;

/**
 * A panel that has not been measured yet is not a panel with no width. It
 * is read as the widest it can become, which is the shape the layout was
 * drawn for; the first measurement then corrects it.
 */
const panelWidthOr = (panelWidth: number) =>
  panelWidth > 0 ? panelWidth : MAX_PANEL_WIDTH;

/** Ring radii are searched on this step, in pixels — finer than a reader sees. */
const RING_RADIUS_STEP = 2;

/** Smaller than this and the ring is inside the opened card whatever the count. */
const RING_MIN_RADIUS = 120;

/** No ring is drawn wider than the widest panel's own half-width. */
const RING_MAX_RADIUS = MAX_PANEL_WIDTH / 2;

/** Where a ring of `radius` puts each of its `count` cards, at rest. */
function ringPlacements(radius: number, count: number): ProjectedNode[] {
  const side = (2 * radius) / FILL;
  const box: PanelBox = { width: side, height: side };
  return layoutNodes("ring", count).map((node) =>
    projectNode(node, SCENE_TILT, box)
  );
}

/** Room between two boxes of the panel's card size, centred on these points. */
function cardGap(a: ProjectedNode, b: ProjectedNode): number {
  const apart =
    Math.abs(a.x - b.x) - (MODULE_CARD_WIDTH * (a.scale + b.scale)) / 2;
  const stacked =
    Math.abs(a.y - b.y) - (MODULE_CARD_HEIGHT * (a.scale + b.scale)) / 2;
  // Two boxes miss each other as soon as they miss on one axis.
  return Math.max(apart, stacked);
}

/**
 * Whether a ring of this radius leaves everything on the panel its own box —
 * the opened card at the origin, and each of its own cards — with `room` to
 * spare. A gutter is what the layout wants; zero is what it must have.
 */
function ringClears(radius: number, count: number, room: number): boolean {
  const placed = ringPlacements(radius, count);

  for (let i = 0; i < placed.length; i += 1) {
    // The opened card sits at the origin and is not a module card, so it is
    // measured through its own box rather than cardGap's.
    const beside =
      Math.abs(placed[i].x) -
      (OPENED_CARD_WIDTH + MODULE_CARD_WIDTH * placed[i].scale) / 2;
    const over =
      Math.abs(placed[i].y) -
      (OPENED_CARD_HEIGHT + MODULE_CARD_HEIGHT * placed[i].scale) / 2;
    if (Math.max(beside, over) < room) return false;

    for (let j = i + 1; j < placed.length; j += 1) {
      if (cardGap(placed[i], placed[j]) < room) return false;
    }
  }

  return true;
}

/** Whether every card of a ring this size is still fully on the panel. */
function ringInsidePanel(
  radius: number,
  count: number,
  panelWidth: number
): boolean {
  const halfWidth = panelWidthOr(panelWidth) / 2;
  return ringPlacements(radius, count).every(
    (placed) =>
      Math.abs(placed.x) + (MODULE_CARD_WIDTH * placed.scale) / 2 <= halfWidth
  );
}

/**
 * The radius, in pixels, of the circle the ring's modules sit on.
 *
 * The ring exists to say that its modules are peers of one centre, and a
 * reader reads that off one thing: they are all the same distance from it.
 * That is a length in pixels, so the ring is sized in pixels — where the arc
 * and the pair are shapes stretched across whatever panel they are given,
 * and are meant to be.
 *
 * It is the *smallest* circle that clears the opened card and keeps the
 * modules off each other, because every pixel of radius is paid for twice in
 * panel height. When even that does not fit the panel's width the largest
 * one that does is drawn instead: a tight ring is still a ring, a card
 * hanging over the edge is a card the reader has lost.
 */
// @req REQ-114
export function ringRadius(count: number, panelWidth: number): number {
  let widest = RING_MIN_RADIUS;

  for (
    let radius = RING_MIN_RADIUS;
    radius <= RING_MAX_RADIUS;
    radius += RING_RADIUS_STEP
  ) {
    if (!ringInsidePanel(radius, count, panelWidth)) break;
    widest = radius;
    if (ringClears(radius, count, MODULE_CARD_GUTTER)) return radius;
  }

  return widest;
}

/**
 * Whether a ring of this count can be drawn on a panel this wide at all.
 *
 * A circle has one radius, so it cannot be tightened on the side the panel
 * runs out of room and left wide on the side the opened card needs. Three
 * modules on a 720px panel is the case that does not resolve: their cards
 * carry 117px either side of nodes the panel cannot push past 242px out, and
 * the opened card claims the first 132 of those. The panel folds to its
 * column there rather than print two cards across the card they came out of.
 */
// @req REQ-114
export function ringFitsPanel(count: number, panelWidth: number): boolean {
  return ringClears(ringRadius(count, panelWidth), count, 0);
}

/**
 * The box a layout is projected in.
 *
 * For the arc, the pair and the column it is the panel itself — those shapes
 * are drawn across the panel and read correctly at any proportion. The ring
 * is the one that does not: `projectNode` scales x by the half-width and y by
 * the half-height, so a unit circle in a 1140x600 panel reaches 410px out to
 * the sides and 197px to the top, which is an ellipse and not a ring. The
 * top module then sat inside the opened card's own 240px box while its peers
 * stood twice as far away.
 *
 * So the ring is handed a square, and `ringRadius` is what that square is
 * worth.
 */
// @req REQ-114
export function sceneBox(
  layout: AxisLayout,
  count: number,
  panel: PanelBox
): PanelBox {
  if (layout !== "ring") return panel;
  const side = (2 * ringRadius(count, panel.width)) / FILL;
  return { width: side, height: side };
}

/**
 * The pairs the panel's height can do nothing for: two nodes within a card
 * of each other horizontally and at the very same height. Every other tight
 * pair is the height's business, and taking those away from `panelHeightFor`
 * would undo REQ-120's fix — Jouer's 11 rows were close because the panel
 * was short, and the answer was a taller panel.
 */
function tiedPairs(
  nodes: GraphNode[],
  halfWidth: number
): Array<[number, number]> {
  const tied: Array<[number, number]> = [];

  for (let i = 1; i < nodes.length; i += 1) {
    const later = projectNode(nodes[i], SCENE_TILT, UNIT_BOX);
    for (let j = 0; j < i; j += 1) {
      const earlier = projectNode(nodes[j], SCENE_TILT, UNIT_BOX);
      const apart = Math.abs(later.x - earlier.x) * halfWidth;
      if (apart >= MODULE_CARD_WIDTH + MODULE_CARD_GUTTER) continue;
      if (Math.abs(later.y - earlier.y) > COINCIDENT_Y) continue;
      tied.push([i, j]);
    }
  }

  return tied;
}

/**
 * The nodes a panel of this width actually renders.
 *
 * `layoutNodes` draws the ideal shape, which assumes every node has a column
 * of its own. On a narrower panel two of them share one: the arc puts
 * « Premiers repères de migrations » and « Regards : colonisation et
 * résistances » either side of its apex at the **same height** — 189px apart
 * for 220px cards on an 812px panel, so the two overlap by 31px.
 *
 * No panel height separates two cards at the same height, which is why the
 * height guard alone could never answer for them: it skipped exactly the
 * pairs that were colliding. The collision is on the horizontal axis, so it
 * is settled there — the two are pushed apart along x until a card fits
 * between their centres, which is a move the height never has to pay for.
 * A node's depth does not depend on its x, so the room a step buys is the
 * room it asked for, and one step is enough.
 *
 * The same width answers a second question the ideal shape does not ask:
 * a node at the end of its run carries a card half its own width past it,
 * and on a narrow panel that hangs over the edge. Both moves are clamped to
 * the room a card actually has, so nothing is fixed by pushing something
 * else outside.
 *
 * Above the width the shape needs — around 1024px for Comprendre's four —
 * nothing moves and the arc is the arc.
 */
// @req REQ-114
export function sceneNodes(
  layout: AxisLayout,
  count: number,
  panelWidth: number
): GraphNode[] {
  const nodes = layoutNodes(layout, count);
  if (nodes.length < 2) return nodes;

  // The ring answers for its own fit in `ringRadius`, by shrinking as a
  // circle. Pushing one of its nodes sideways here is the move the arc and
  // the pair need and the one thing the ring cannot survive: it is a circle
  // or it is no longer saying its modules are peers.
  if (layout === "ring") return nodes;

  const halfWidth = panelWidthOr(panelWidth) / 2;
  const insidePanel = (node: GraphNode): GraphNode => {
    const scale = projectNode(node, SCENE_TILT, UNIT_BOX).scale;
    const room = halfWidth - (MODULE_CARD_WIDTH * scale) / 2;
    const limit = Math.max(0, room / (halfWidth * FILL * scale));
    return { ...node, x: Math.max(-limit, Math.min(limit, node.x)) };
  };

  const placed = nodes.map(insidePanel);
  const tied = tiedPairs(nodes, halfWidth);

  for (const [i, j] of tied) {
    const later = projectNode(placed[i], SCENE_TILT, UNIT_BOX);
    const earlier = projectNode(placed[j], SCENE_TILT, UNIT_BOX);
    const owed =
      MODULE_CARD_WIDTH +
      MODULE_CARD_GUTTER -
      Math.abs(later.x - earlier.x) * halfWidth;
    if (owed <= 0) continue;

    // Each takes half the step, so the run stays centred on the panel and
    // the layout keeps its symmetry. The step is asked for in pixels and
    // applied in unit space, so it is divided back through everything
    // projectNode multiplies x by.
    const step = (side: ProjectedNode) =>
      owed / 2 / (halfWidth * FILL * side.scale);
    const outward = later.x >= earlier.x ? 1 : -1;

    placed[i] = insidePanel({
      ...placed[i],
      x: placed[i].x + outward * step(later),
    });
    placed[j] = insidePanel({
      ...placed[j],
      x: placed[j].x - outward * step(earlier),
    });
  }

  return placed;
}

/**
 * How tall the panel has to be for a scene of `count` modules on a panel
 * `panelWidth` wide.
 *
 * `pair` was written for the two modules Jouer held when it shipped and
 * kept a fixed 420px when REQ-120 handed it 11: six rows over a fixed
 * span put them 36px apart under cards up to 85px tall, so three of the
 * 11 could not be clicked at their own centre. Deriving the height from
 * the node set means a layout can be handed any count without the author of
 * the next module having to remember this.
 *
 * The width is a parameter and not a constant for the same reason: the two
 * cards a panel puts in one column depend on how wide that panel is, and
 * measuring them against a 1140px panel the reader does not have is how the
 * Comprendre collision measured clear.
 *
 * Three things are owed, and the tallest wins: the room the opened card
 * needs at the centre, the room the tightest stacked pair needs between
 * them, and the room the outermost card needs to sit inside the panel at
 * all. The third only binds once a node has been pushed out past the band
 * its layout drew, which is the price of stacking a pair the width could
 * not sit side by side.
 */
// @req REQ-114
export function panelHeightFor(
  layout: AxisLayout,
  count: number,
  panelWidth: number
): number {
  const clearance = CENTRE_CLEARANCE[layout];
  if (layout === "column" || count < 2) return clearance;

  // The ring is drawn in a square of its own, so its height is not a share
  // of the panel's — it is the room the circle and the cards hanging off it
  // actually take, whatever the panel around them.
  if (layout === "ring") {
    const reach = ringPlacements(ringRadius(count, panelWidth), count).reduce(
      (held, placed) =>
        Math.max(
          held,
          Math.abs(placed.y) + (MODULE_CARD_HEIGHT * placed.scale) / 2
        ),
      0
    );
    return Math.ceil(Math.max(clearance, 2 * reach));
  }

  const halfWidth = panelWidthOr(panelWidth) / 2;
  const nodes = sceneNodes(layout, count, panelWidth);

  let tightest = Infinity;
  let held = clearance;
  for (let i = 0; i < nodes.length; i += 1) {
    const a = projectNode(nodes[i], SCENE_TILT, UNIT_BOX);
    // A node sits at a fraction of the panel's half-height, so the panel has
    // to be tall enough that the card hanging off it still ends inside the
    // panel. Perspective is in the fraction and in the card, which the
    // render loop scales by the same factor.
    if (Math.abs(a.y) < 1) {
      held = Math.max(
        held,
        (MODULE_CARD_HEIGHT * a.scale) / (1 - Math.abs(a.y))
      );
    }
    // And the opened card is at the origin, so a node passing over it has
    // to be far enough up or down the panel to clear it.
    const overCard =
      Math.abs(a.x) * halfWidth <
      (OPENED_CARD_WIDTH + MODULE_CARD_WIDTH * a.scale) / 2;
    if (overCard && Math.abs(a.y) > COINCIDENT_Y) {
      held = Math.max(
        held,
        (OPENED_CARD_HEIGHT +
          MODULE_CARD_HEIGHT * a.scale +
          2 * MODULE_CARD_GUTTER) /
          Math.abs(a.y)
      );
    }
    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = projectNode(nodes[j], SCENE_TILT, UNIT_BOX);
      // Two cards a full card-width apart in x never collide, whatever
      // their y — only the ones sharing a column constrain the height.
      const apart = Math.abs(a.x - b.x) * halfWidth;
      if (apart > MODULE_CARD_WIDTH) continue;
      // A tie this close together has already been pushed apart by
      // `sceneNodes`, so one surviving to here is one its passes could not
      // settle. Solving for it would ask for an infinite panel.
      const gap = Math.abs(a.y - b.y);
      if (gap > COINCIDENT_Y) tightest = Math.min(tightest, gap);
    }
  }

  if (!Number.isFinite(tightest)) return Math.ceil(held);

  const stacked = (2 * (MODULE_CARD_HEIGHT + MODULE_CARD_GUTTER)) / tightest;
  return Math.ceil(Math.max(clearance, held, stacked));
}
