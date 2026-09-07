import { describe, expect, it } from "vitest";

import { HOME_HERO_IMAGES } from "@/lib/home/homeHeroVisuals";
import { drawHubSpread } from "@/lib/hubs/hubSpread";

function sequence(...values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}

describe("drawHubSpread", () => {
  // @req REQ-114
  it("splits the sides evenly on the first draw", () => {
    expect(drawHubSpread(sequence(0, 0)).orientation).toBe("text-first");
    expect(drawHubSpread(sequence(0.5 - Number.EPSILON, 0)).orientation).toBe(
      "text-first"
    );
    expect(drawHubSpread(sequence(0.5, 0)).orientation).toBe("plate-first");
    expect(drawHubSpread(sequence(0.999999, 0)).orientation).toBe(
      "plate-first"
    );
  });

  // @req REQ-114
  it("can reach every plate in the archive pool on the second draw", () => {
    const drawnIds = HOME_HERO_IMAGES.map((_, index) => {
      const plateRoll = (index + 0.25) / HOME_HERO_IMAGES.length;
      return drawHubSpread(sequence(0, plateRoll)).plate.id;
    });

    expect(drawnIds).toEqual(HOME_HERO_IMAGES.map((image) => image.id));
  });

  /**
   * The plate is always a picture. The home draws the globe half the time
   * because the globe is the thing the home is about; a hub is about its own
   * tiles, and a WebGL stage beside them would be the page's loudest object
   * arguing for a module none of them is.
   */
  // @req REQ-114
  it("never puts the globe on a hub", () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999999]) {
      expect(drawHubSpread(sequence(roll, roll)).plate.src).toMatch(
        /^\/images\//
      );
    }
  });

  /**
   * Both halves of the spread are drawn from one source of randomness, in a
   * fixed order, so a caller that seeds it gets the same page twice — which
   * is what lets the charter contract assert a layout rather than sample it.
   */
  // @req REQ-114
  it("draws the same spread twice from the same rolls", () => {
    expect(drawHubSpread(sequence(0.7, 0.4))).toEqual(
      drawHubSpread(sequence(0.7, 0.4))
    );
  });
});
