import { describe, expect, it } from "vitest";
import { getTranslation } from "@/lib/translations";

/**
 * The three access axes are filed by one criterion: what the reader arrives
 * with, what they leave with. These tests assert that frame holds without
 * pinning the prose — the wording is editorial and expected to be reworked.
 */
describe("hub blurbs", () => {
  const { hubs } = getTranslation("fr");
  const axes = ["explorer", "comprendre", "jouer"] as const;

  // The hub paragraph renders inside max-w-[58ch]; past ~140 characters it
  // overflows the two lines the layout reserves for it.
  const BLURB_MAX_LENGTH = 140;

  // @req REQ-114
  it("states what the reader arrives with and leaves with on every axis", () => {
    for (const axis of axes) {
      expect(hubs[axis].blurb).toMatch(/\barrive\b/);
      expect(hubs[axis].blurb).toMatch(/\brepart\b/);
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
