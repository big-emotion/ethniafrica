import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  BASE_TILT_X,
  LAYOUT_BY_AXIS,
  MAX_PANEL_WIDTH,
  MODULE_CARD_GUTTER,
  MODULE_CARD_HEIGHT,
  MODULE_CARD_LINES,
  MODULE_CARD_LINE_HEIGHT,
  MODULE_CARD_PADDING_Y,
  MODULE_CARD_WIDTH,
  MODULE_LABEL_FONT_SIZE,
  OPENED_CARD_HEIGHT,
  OPENED_CARD_WIDTH,
  SCENE_MIN_WIDTH,
  panelHeightFor,
  entranceProgress,
  layoutNodes,
  nearestEdge,
  projectNode,
  sceneNodes,
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
 * Every panel width the plan's own measurements name, as the panel actually
 * gets them: the axis grid is the viewport less the page gutters, capped at
 * MAX_PANEL_WIDTH. 720px is the 768px viewport the scene now switches on at,
 * 812px the 860px where « Regards » used to sit 31px inside « Premiers
 * repères ».
 */
const PANEL_WIDTHS = [720, 812, 912, 976, MAX_PANEL_WIDTH];

const SCENE_TILT = { x: BASE_TILT_X, y: 0 };

/**
 * The pairs of cards that would actually overlap on screen: two boxes of
 * MODULE_CARD_WIDTH by MODULE_CARD_HEIGHT, placed where the render loop
 * places them, at the height the panel is given for that width.
 */
const overlappingPairs = (
  layout: Parameters<typeof layoutNodes>[0],
  count: number,
  panelWidth: number
) => {
  const height = panelHeightFor(layout, count, panelWidth);
  const panel = { width: panelWidth, height };
  const projected = sceneNodes(layout, count, panelWidth).map((node) =>
    projectNode(node, SCENE_TILT, panel)
  );
  const overlaps: Array<[number, number]> = [];

  for (let i = 0; i < projected.length; i += 1) {
    for (let j = i + 1; j < projected.length; j += 1) {
      const apart = Math.abs(projected[i].x - projected[j].x);
      const stacked = Math.abs(projected[i].y - projected[j].y);
      if (apart < MODULE_CARD_WIDTH && stacked < MODULE_CARD_HEIGHT) {
        overlaps.push([i, j]);
      }
    }
  }

  return overlaps;
};

describe("sceneNodes — the shape a panel of a given width can actually hold", () => {
  // Above the width its shape needs, nothing moves: the arc is the arc, and
  // a desktop reader sees exactly what the layout was drawn as.
  // @req REQ-114
  it("leaves the layout untouched on a panel wide enough to hold it", () => {
    for (const layout of ["ring", "arc"] as const) {
      expect(sceneNodes(layout, 4, MAX_PANEL_WIDTH)).toEqual(
        layoutNodes(layout, 4)
      );
    }
  });

  /**
   * `pair` is the exception, and not because of its width: it sets its two
   * columns at the very edge of the unit box and leans them toward the
   * reader, so perspective carries the outer half of each card past the
   * panel at every width there is. Pulling them in is the same rule as
   * everything else here — a card that hangs off the panel has not been
   * placed, it has been lost.
   */
  // @req REQ-114
  it("pulls a card back in rather than let it hang off the panel", () => {
    const placed = sceneNodes("pair", 3, MAX_PANEL_WIDTH);
    const ideal = layoutNodes("pair", 3);

    expect(Math.abs(placed[2].x)).toBeLessThan(Math.abs(ideal[2].x));
    for (const node of placed) {
      const shown = projectNode(node, SCENE_TILT, {
        width: MAX_PANEL_WIDTH,
        height: panelHeightFor("pair", 3, MAX_PANEL_WIDTH),
      });
      expect(
        Math.abs(shown.x) + (MODULE_CARD_WIDTH * shown.scale) / 2
      ).toBeLessThanOrEqual(MAX_PANEL_WIDTH / 2 + 0.5);
    }
  });

  /**
   * The defect this exists for. Comprendre's four modules put « Premiers
   * repères de migrations » and « Regards : colonisation et résistances »
   * either side of the arc's apex at the SAME height — 189px apart for
   * 220px cards on an 812px panel. No panel height separates two cards at
   * the same height, so the collision is settled on the axis it happens on.
   */
  // @req REQ-114
  it("spreads the arc's apex pair once the panel is too narrow to sit them side by side", () => {
    const ideal = layoutNodes("arc", 4);
    const narrow = sceneNodes("arc", 4, 812);

    expect(narrow[1].x).toBeLessThan(ideal[1].x);
    expect(narrow[2].x).toBeGreaterThan(ideal[2].x);
    expect(narrow[1].x).toBeCloseTo(-narrow[2].x, 5);
  });

  /**
   * Only x moves. The height a layout gives a node is what makes the run
   * read as a trajectory, and a node that changed height to dodge its
   * neighbour would be telling a different story than the layout drew.
   */
  // @req REQ-114
  it("keeps every node at the height its layout gave it, and inside the panel", () => {
    for (const width of PANEL_WIDTHS) {
      for (const layout of ["ring", "arc", "pair"] as const) {
        for (let count = 2; count <= 6; count += 1) {
          const ideal = layoutNodes(layout, count);
          sceneNodes(layout, count, width).forEach((node, index) => {
            expect(node.y).toBeCloseTo(ideal[index].y, 5);
            expect(node.z).toBeCloseTo(ideal[index].z, 5);
            expect(Math.abs(node.x)).toBeLessThanOrEqual(1);
          });
        }
      }
    }
  });
});

describe("panelHeightFor — the room a scene needs for the count it was handed", () => {
  // The regression this exists to prevent: `pair` was sized for the two
  // modules Jouer held when it shipped, and REQ-120 handed it eleven. At a
  // fixed 420px the rows landed 36px apart under cards up to 85px tall, and
  // three of the eleven could not be clicked at their own centre.
  // @req REQ-114
  it("grows the panel once the modules stack tighter than a card", () => {
    const width = MAX_PANEL_WIDTH;
    expect(panelHeightFor("pair", 11, width)).toBeGreaterThan(
      panelHeightFor("pair", 2, width)
    );
    // A facing pair fits the floor with room to spare; every row added
    // past that has to be paid for.
    expect(panelHeightFor("pair", 2, width)).toBe(
      panelHeightFor("pair", 4, width)
    );
    expect(panelHeightFor("pair", 7, width)).toBeGreaterThan(
      panelHeightFor("pair", 4, width)
    );
    expect(panelHeightFor("pair", 11, width)).toBeGreaterThan(
      panelHeightFor("pair", 7, width)
    );
  });

  /**
   * The second defect: the guard measured every horizontal gap against a
   * hardcoded 1140px panel. Between 768 and 1140 it was comparing cards
   * against a window the panel does not have, so a scene that overlapped
   * on screen measured clear.
   */
  // @req REQ-114
  it("measures the gaps against the panel it was given, not against the widest one", () => {
    expect(panelHeightFor("arc", 4, 720)).toBeGreaterThanOrEqual(
      panelHeightFor("arc", 4, MAX_PANEL_WIDTH)
    );
    expect(panelHeightFor("ring", 6, 720)).toBeGreaterThanOrEqual(
      panelHeightFor("ring", 6, MAX_PANEL_WIDTH)
    );
  });

  /**
   * The contract the whole file exists for, stated in the only terms a
   * reader can check: two cards of the panel's own size, at the position
   * the render loop puts them, never share pixels. It runs at every width
   * the panel can be given, not only the widest.
   */
  // @req REQ-114
  it("never lets two module cards share the same pixels, at any width a panel can have", () => {
    for (const width of PANEL_WIDTHS) {
      for (const layout of ["ring", "arc", "pair"] as const) {
        for (let count = 2; count <= 6; count += 1) {
          expect(overlappingPairs(layout, count, width)).toEqual([]);
        }
      }
    }
  });

  /**
   * A card is placed by its centre and hangs half its own box off it, so a
   * scene can be perfectly free of collisions and still lose a card over
   * the panel's edge — onto the lead line and the close button that sit
   * there, or into the page gutter beside it.
   */
  // @req REQ-114
  it("keeps every card inside the panel it is drawn in", () => {
    for (const width of PANEL_WIDTHS) {
      for (const layout of ["ring", "arc", "pair"] as const) {
        for (let count = 2; count <= 6; count += 1) {
          const height = panelHeightFor(layout, count, width);
          const panel = { width, height };
          for (const node of sceneNodes(layout, count, width)) {
            const placed = projectNode(node, SCENE_TILT, panel);
            const sideways =
              Math.abs(placed.x) + (MODULE_CARD_WIDTH * placed.scale) / 2;
            const vertical =
              Math.abs(placed.y) + (MODULE_CARD_HEIGHT * placed.scale) / 2;
            expect(sideways).toBeLessThanOrEqual(width / 2 + 0.5);
            expect(vertical).toBeLessThanOrEqual(height / 2);
          }
        }
      }
    }
  });

  // A count small enough to fit keeps the floor that clears the opened
  // card sitting at the origin — the room is needed whether or not the
  // cards would have collided.
  // @req REQ-114
  it("never drops below the room the opened card needs at the centre", () => {
    expect(panelHeightFor("pair", 2, MAX_PANEL_WIDTH)).toBeGreaterThanOrEqual(
      420
    );
    expect(panelHeightFor("ring", 4, MAX_PANEL_WIDTH)).toBeGreaterThanOrEqual(
      600
    );
    expect(panelHeightFor("arc", 3, MAX_PANEL_WIDTH)).toBeGreaterThanOrEqual(
      560
    );
  });

  /**
   * The opened axis card is at the panel's origin and is an obstacle like
   * any other: the arc laid its two middle modules 31px across the card's
   * own title at every width above 860px, and the hand-set floor that was
   * meant to keep them off it had not been re-measured since the card grew
   * a stake line.
   */
  // @req REQ-113
  it("leaves the opened axis card its own box, whatever the scene around it", () => {
    for (const width of PANEL_WIDTHS) {
      for (const layout of ["ring", "arc", "pair"] as const) {
        for (let count = 2; count <= 6; count += 1) {
          const height = panelHeightFor(layout, count, width);
          const panel = { width, height };
          for (const node of sceneNodes(layout, count, width)) {
            const placed = projectNode(node, SCENE_TILT, panel);
            const apart =
              Math.abs(placed.x) -
              (OPENED_CARD_WIDTH + MODULE_CARD_WIDTH * placed.scale) / 2;
            const stacked =
              Math.abs(placed.y) -
              (OPENED_CARD_HEIGHT + MODULE_CARD_HEIGHT * placed.scale) / 2;
            expect(Math.max(apart, stacked)).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  // The column layout is ordinary flow: the rows size the panel, not the
  // other way round.
  // @req REQ-114
  it("asks for no height at all when the scene is a plain column", () => {
    expect(panelHeightFor("column", 11, MAX_PANEL_WIDTH)).toBe(0);
  });

  // A panel that has not been measured yet is not a panel 0px wide. It is
  // read as the widest it can become, which is the shape the layout was
  // drawn for; the first measurement then corrects it.
  // @req REQ-114
  it("reads an unmeasured panel as the widest one, not as a panel with no width", () => {
    expect(panelHeightFor("arc", 4, 0)).toBe(
      panelHeightFor("arc", 4, MAX_PANEL_WIDTH)
    );
    expect(sceneNodes("arc", 4, 0)).toEqual(
      sceneNodes("arc", 4, MAX_PANEL_WIDTH)
    );
  });
});

describe("the module card's own box", () => {
  /**
   * « Regards : colonisation et résistances » wraps to three lines at
   * 15px/600 inside a 220px card. The box reserved two, so the card grew
   * past the room the scene had kept for it and into its neighbour.
   */
  // @req REQ-114
  it("reserves the room a three-line label actually takes", () => {
    expect(MODULE_CARD_LINES).toBe(3);
    expect(MODULE_CARD_HEIGHT).toBeGreaterThanOrEqual(
      MODULE_CARD_LINES * MODULE_LABEL_FONT_SIZE * MODULE_CARD_LINE_HEIGHT +
        2 * MODULE_CARD_PADDING_Y
    );
  });

  /**
   * The height is computed from a type size this file only mirrors — the
   * card itself renders the token. If the two drift, the reserved box
   * silently stops matching the card, which is the failure the module was
   * written to prevent.
   */
  // @req REQ-114
  it("mirrors the type size the card is actually rendered at", () => {
    const tokens = readFileSync(
      path.join(process.cwd(), "src/styles/home-tokens.css"),
      "utf8"
    );
    const declared = /--home-text-module-face:\s*([\d.]+)px/.exec(tokens);

    expect(declared).not.toBeNull();
    expect(Number(declared?.[1])).toBe(MODULE_LABEL_FONT_SIZE);
  });

  // The panel and the axis cards it stands among fold at the same width, or
  // a card laid out as a row would host a scene positioning its modules
  // around a centre that card no longer has.
  // @req REQ-114
  it("switches the scene on at the project's mobile bound", () => {
    expect(SCENE_MIN_WIDTH).toBe(768);
  });
});
