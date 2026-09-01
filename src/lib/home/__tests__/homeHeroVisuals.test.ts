import { describe, expect, it } from "vitest";

import {
  HOME_HERO_IMAGES,
  drawHomeHeroVisual,
} from "@/lib/home/homeHeroVisuals";

function sequence(...values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}

describe("drawHomeHeroVisual", () => {
  // @req REQ-115
  it("uses the lower half of the random draw for the globe", () => {
    expect(drawHomeHeroVisual(() => 0)).toEqual({ kind: "globe" });
    expect(drawHomeHeroVisual(() => 0.5 - Number.EPSILON)).toEqual({
      kind: "globe",
    });
  });

  // @req REQ-115
  it("uses the upper half of the random draw for an image", () => {
    expect(drawHomeHeroVisual(sequence(0.5, 0))).toEqual({
      kind: "image",
      image: HOME_HERO_IMAGES[0],
    });
    expect(drawHomeHeroVisual(sequence(0.999999, 0.999999))).toEqual({
      kind: "image",
      image: HOME_HERO_IMAGES.at(-1),
    });
  });

  // @req REQ-115
  it("can reach every curated image in the project stock", () => {
    const drawnIds = HOME_HERO_IMAGES.map((_, index) => {
      const imageRoll = (index + 0.25) / HOME_HERO_IMAGES.length;
      const visual = drawHomeHeroVisual(sequence(0.5, imageRoll));
      return visual.kind === "image" ? visual.image.id : null;
    });

    expect(drawnIds).toEqual(HOME_HERO_IMAGES.map((image) => image.id));
  });

  // @req REQ-115
  it("keeps every image accessible and visibly credited", () => {
    expect(HOME_HERO_IMAGES.length).toBeGreaterThan(1);

    for (const image of HOME_HERO_IMAGES) {
      expect(image.src).toMatch(/^\/images\//);
      expect(image.alt.trim()).not.toBe("");
      expect(image.credit.trim()).not.toBe("");
    }
  });
});
