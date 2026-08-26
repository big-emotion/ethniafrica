import { describe, expect, it } from "vitest";

import {
  LAYOUT_BY_AXIS,
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
