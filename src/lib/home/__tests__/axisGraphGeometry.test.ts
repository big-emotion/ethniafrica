import { describe, expect, it } from "vitest";

import {
  BASE_TILT_X,
  LAYOUT_BY_AXIS,
  MODULE_CARD_GUTTER,
  MODULE_CARD_HEIGHT,
  MODULE_CARD_WIDTH,
  REFERENCE_PANEL_WIDTH,
  panelHeightFor,
  entranceProgress,
  layoutNodes,
  nearestEdge,
  projectNode,
  type GraphNode,
} from "@/lib/home/axisGraphGeometry";

const box = { width: 900, height: 480 };
const noTilt = { x: 0, y: 0 };

const distanceFromOrigin = (node: GraphNode) =>
  Math.hypot(node.x, node.y, node.z);

describe("axisGraphGeometry — where the module nodes sit and how they project", () => {
  // @req REQ-114
  it("gives each axis the layout its opening choreography needs", () => {
    expect(LAYOUT_BY_AXIS.explorer).toBe("ring");
    expect(LAYOUT_BY_AXIS.comprendre).toBe("arc");
    expect(LAYOUT_BY_AXIS.jouer).toBe("pair");
  });

  // @req REQ-114
  it("places one node per module, and nothing at all for an empty axis", () => {
    expect(layoutNodes("ring", 5)).toHaveLength(5);
    expect(layoutNodes("arc", 3)).toHaveLength(3);
    expect(layoutNodes("pair", 2)).toHaveLength(2);
    expect(layoutNodes("column", 4)).toHaveLength(4);
    expect(layoutNodes("ring", 0)).toEqual([]);
  });

  // @req REQ-114
  it("spreads the ring evenly around the opened card, starting at the top", () => {
    const nodes = layoutNodes("ring", 5);

    for (const node of nodes) {
      expect(distanceFromOrigin(node)).toBeCloseTo(1, 5);
    }
    expect(nodes[0].x).toBeCloseTo(0, 5);
    expect(nodes[0].y).toBeCloseTo(-1, 5);

    const angles = nodes.map((node) => Math.atan2(node.y, node.x));
    const gaps = angles
      .slice(1)
      .map((angle, index) => angle - angles[index])
      .map((gap) => (gap + Math.PI * 4) % (Math.PI * 2));
    for (const gap of gaps) {
      expect(gap).toBeCloseTo((Math.PI * 2) / 5, 5);
    }
  });

  // @req REQ-114
  it("writes the arc left to right and lifts its middle, so it reads as a trajectory", () => {
    const nodes = layoutNodes("arc", 3);

    const xs = nodes.map((node) => node.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    // Screen coordinates: a smaller y is higher on the page.
    expect(nodes[1].y).toBeLessThan(nodes[0].y);
    expect(nodes[1].y).toBeLessThan(nodes[2].y);
  });

  // @req REQ-114
  it("sets the pair face to face, mirrored across the centre", () => {
    const [left, right] = layoutNodes("pair", 2);

    expect(left.x).toBeLessThan(0);
    expect(right.x).toBeCloseTo(-left.x, 5);
    expect(right.y).toBeCloseTo(left.y, 5);
  });

  // @req REQ-114
  it("stacks the column on a single vertical spine, top to bottom", () => {
    const nodes = layoutNodes("column", 4);

    for (const node of nodes) {
      expect(node.x).toBeCloseTo(0, 5);
      expect(node.z).toBeCloseTo(0, 5);
    }
    const ys = nodes.map((node) => node.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });

  // @req REQ-114
  it("projects unit space into the panel's pixels, centred on its origin", () => {
    const projected = projectNode({ x: 0, y: 0, z: 0 }, noTilt, box);

    expect(projected.x).toBeCloseTo(0, 5);
    expect(projected.y).toBeCloseTo(0, 5);
    expect(projected.scale).toBeCloseTo(1, 5);
  });

  // @req REQ-114
  it("makes depth legible: a node nearer the reader projects larger than one behind", () => {
    const near = projectNode({ x: 0.5, y: 0, z: 0.8 }, noTilt, box);
    const far = projectNode({ x: 0.5, y: 0, z: -0.8 }, noTilt, box);

    expect(near.scale).toBeGreaterThan(far.scale);
    expect(near.depth).toBeGreaterThan(far.depth);
    expect(Math.abs(near.x)).toBeGreaterThan(Math.abs(far.x));
  });

  // @req REQ-114
  it("swings the scene with the tilt rather than ignoring it", () => {
    const still = projectNode({ x: 0, y: 0, z: 1 }, noTilt, box);
    const swung = projectNode({ x: 0, y: 0, z: 1 }, { x: 0, y: 0.4 }, box);

    expect(swung.x).not.toBeCloseTo(still.x, 3);
  });

  // @req REQ-114
  it("returns the same projection for the same input, frame after frame", () => {
    const node = { x: -0.3, y: 0.7, z: 0.2 };
    const tilt = { x: 0.1, y: -0.2 };

    expect(projectNode(node, tilt, box)).toEqual(projectNode(node, tilt, box));
  });

  // @req REQ-114
  it("picks out the edge under the pointer, and none when the pointer is off them", () => {
    const centre = { x: 0, y: 0 };
    const projected = [
      { x: 100, y: 0, depth: 0, scale: 1 },
      { x: -100, y: 0, depth: 0, scale: 1 },
    ];

    expect(nearestEdge({ x: 50, y: 2 }, projected, centre, 8)).toBe(0);
    expect(nearestEdge({ x: -50, y: -2 }, projected, centre, 8)).toBe(1);
    expect(nearestEdge({ x: 50, y: 60 }, projected, centre, 8)).toBeNull();
  });

  // The segment stops at the node: past it there is no edge to light up.
  // @req REQ-114
  it("does not light an edge for a pointer beyond the node it ends on", () => {
    const centre = { x: 0, y: 0 };
    const projected = [{ x: 100, y: 0, depth: 0, scale: 1 }];

    expect(nearestEdge({ x: 160, y: 0 }, projected, centre, 8)).toBeNull();
  });
});

describe("entranceProgress — how each axis lets its modules arrive", () => {
  // @req REQ-114
  it("holds every module at the centre before the opening starts", () => {
    expect(entranceProgress("ring", 0, 0)).toBe(0);
    expect(entranceProgress("ring", 3, 0)).toBe(0);
    expect(entranceProgress("arc", 2, 0)).toBe(0);
  });

  // @req REQ-114
  it("brings every module fully out, however late its turn", () => {
    for (const layout of ["ring", "arc", "pair", "column"] as const) {
      expect(entranceProgress(layout, 6, 5000)).toBe(1);
    }
  });

  // @req REQ-114
  it("never sends a module backwards once it has started arriving", () => {
    let previous = 0;
    for (let elapsed = 0; elapsed <= 1200; elapsed += 25) {
      const current = entranceProgress("ring", 2, elapsed);
      expect(current).toBeGreaterThanOrEqual(previous);
      expect(current).toBeLessThanOrEqual(1);
      previous = current;
    }
  });

  // Each axis reads its own glyph: Explorer's dots scatter almost at once,
  // Comprendre's arc lays its modules down one after another.
  // @req REQ-114
  it("staggers the arc more than the ring, so one scatters and the other writes", () => {
    const ringGap =
      entranceProgress("ring", 0, 260) - entranceProgress("ring", 3, 260);
    const arcGap =
      entranceProgress("arc", 0, 260) - entranceProgress("arc", 3, 260);

    expect(arcGap).toBeGreaterThan(ringGap);
  });
});

/**
 * Walks every pair of cards a scene would render and splits them the way
 * `panelHeightFor` does: those a taller panel separates, and those the
 * layout puts side by side at the same height, which no height separates.
 */
const cardPairs = (
  layout: Parameters<typeof layoutNodes>[0],
  count: number,
  height: number
) => {
  const nodes = layoutNodes(layout, count);
  const panel = { width: REFERENCE_PANEL_WIDTH, height };
  let tightestStacked = Infinity;
  let sideBySide = 0;

  for (let i = 0; i < nodes.length; i += 1) {
    const a = projectNode(nodes[i], { x: BASE_TILT_X, y: 0 }, panel);
    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = projectNode(nodes[j], { x: BASE_TILT_X, y: 0 }, panel);
      // Two cards a full card-width apart in x never collide, whatever
      // their y.
      if (Math.abs(a.x - b.x) > MODULE_CARD_WIDTH) continue;
      const gap = Math.abs(a.y - b.y);
      if (gap < 1e-6) sideBySide += 1;
      else tightestStacked = Math.min(tightestStacked, gap);
    }
  }

  return { tightestStacked, sideBySide };
};

describe("panelHeightFor — the room a scene needs for the count it was handed", () => {
  // The regression this exists to prevent: `pair` was sized for the two
  // modules Jouer held when it shipped, and REQ-120 handed it eleven. At a
  // fixed 420px the rows landed 36px apart under cards up to 85px tall, and
  // three of the eleven could not be clicked at their own centre.
  // @req REQ-114
  it("grows the panel once the modules stack tighter than a card", () => {
    expect(panelHeightFor("pair", 11)).toBeGreaterThan(
      panelHeightFor("pair", 2)
    );
    // A facing pair fits the floor with room to spare; every row added
    // past that has to be paid for.
    expect(panelHeightFor("pair", 2)).toBe(panelHeightFor("pair", 4));
    expect(panelHeightFor("pair", 7)).toBeGreaterThan(
      panelHeightFor("pair", 4)
    );
    expect(panelHeightFor("pair", 11)).toBeGreaterThan(
      panelHeightFor("pair", 7)
    );
  });

  // @req REQ-114
  it("leaves every stacked card its full box, at every count a scene can hold", () => {
    for (const layout of ["ring", "arc", "pair"] as const) {
      for (let count = 2; count <= 12; count += 1) {
        const { tightestStacked } = cardPairs(
          layout,
          count,
          panelHeightFor(layout, count)
        );
        if (!Number.isFinite(tightestStacked)) continue;
        expect(tightestStacked).toBeGreaterThanOrEqual(
          MODULE_CARD_HEIGHT + MODULE_CARD_GUTTER
        );
      }
    }
  });

  /**
   * A limit of the arc itself, not of the height. `arcNodes` lifts each
   * node by sin(pi * progress), which is symmetric about the apex, so
   * beyond five nodes the innermost mirrored pair comes within a card
   * width of itself at the same height. No panel height separates two
   * cards side by side, and solving for one would ask for an infinite
   * panel — which is why `panelHeightFor` skips these pairs rather than
   * dividing by their zero gap.
   *
   * Comprendre holds three, so nothing hits this today. Whoever gives it a
   * sixth module has to break the apex symmetry, not reach for height.
   */
  // @req REQ-114
  it("keeps the arc clear up to five, and stops pretending past that", () => {
    for (const count of [2, 3, 4, 5]) {
      expect(
        cardPairs("arc", count, panelHeightFor("arc", count)).sideBySide
      ).toBe(0);
    }
    expect(
      cardPairs("arc", 6, panelHeightFor("arc", 6)).sideBySide
    ).toBeGreaterThan(0);
    // And it does not solve for an infinite panel trying: the pairs it
    // cannot separate are left out of the arithmetic, not divided by.
    expect(Number.isFinite(panelHeightFor("arc", 6))).toBe(true);
  });

  // Neither of the two layouts that carry a real axis today has that
  // problem, at any count they could be handed.
  // @req REQ-114
  it("keeps the ring and the pair free of side-by-side collisions", () => {
    for (const layout of ["ring", "pair"] as const) {
      for (let count = 2; count <= 12; count += 1) {
        expect(
          cardPairs(layout, count, panelHeightFor(layout, count)).sideBySide
        ).toBe(0);
      }
    }
  });

  // A count small enough to fit keeps the floor that clears the opened
  // card sitting at the origin — the room is needed whether or not the
  // cards would have collided.
  // @req REQ-114
  it("never drops below the room the opened card needs at the centre", () => {
    expect(panelHeightFor("pair", 2)).toBe(420);
    expect(panelHeightFor("ring", 4)).toBe(600);
    expect(panelHeightFor("arc", 3)).toBe(560);
  });

  // The column layout is ordinary flow: the rows size the panel, not the
  // other way round.
  // @req REQ-114
  it("asks for no height at all when the scene is a plain column", () => {
    expect(panelHeightFor("column", 11)).toBe(0);
  });
});
