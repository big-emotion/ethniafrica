import { describe, expect, it } from "vitest";
import { getTranslation } from "@/lib/translations";

/**
 * A hub blurb describes the axis, not the reader.
 *
 * The three axes are still filed by one criterion — what a reader hands in,
 * what the axis hands back — but that is the shelving rule, and stating it
 * as « il arrive avec…, il repart avec… » spent the opening sentence of
 * three pages, and their three meta descriptions, on a figure of speech
 * where a description was owed. These tests assert the frame that replaced
 * it without pinning the prose: the wording stays editorial.
 */
describe("hub blurbs", () => {
  const { hubs } = getTranslation("fr");
  const axes = ["explorer", "comprendre", "jouer"] as const;

  // The hub paragraph renders inside max-w-[58ch]; past ~140 characters it
  // overflows the two lines the layout reserves for it.
  const BLURB_MAX_LENGTH = 140;

  // @req REQ-114
  it("names what the axis holds rather than narrating the reader", () => {
    for (const axis of axes) {
      expect(hubs[axis].blurb).not.toMatch(/\bil arrive\b/i);
      expect(hubs[axis].blurb).not.toMatch(/\bil repart\b/i);
      expect(hubs[axis].blurb).toMatch(/^L'axe /);
    }
  });

  // The same rewrite has to reach the home's cards: a reader who read the
  // formula on /fr and the description on /fr/explorer would be looking at
  // two different products.
  // @req REQ-113
  it("keeps the header panel's blurbs free of the formula too", () => {
    for (const axis of axes) {
      expect(hubs[axis].menuBlurb).not.toMatch(/\bil arrive\b/i);
      expect(hubs[axis].menuBlurb).not.toMatch(/\bil repart\b/i);
    }
  });

  // @req REQ-114
  it("keeps every blurb within the paragraph width budget", () => {
    for (const axis of axes) {
      expect(hubs[axis].blurb.trim().length).toBeGreaterThan(0);
      expect(hubs[axis].blurb.length).toBeLessThanOrEqual(BLURB_MAX_LENGTH);
    }
  });

  // @req REQ-114
  it("gives each axis its own promise rather than a shared template", () => {
    const blurbs = axes.map((axis) => hubs[axis].blurb);

    expect(new Set(blurbs).size).toBe(axes.length);
  });
});
