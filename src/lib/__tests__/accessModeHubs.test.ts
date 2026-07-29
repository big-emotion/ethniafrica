import { describe, it, expect } from "vitest";
import {
  getAccessModeHubs,
  getVisibleAccessModeHubs,
  isHubVisible,
} from "@/lib/accessModeHubs";
import { getLocalizedRoute } from "@/lib/routing";

describe("accessModeHubs", () => {
  // @req REQ-091
  it("declares Explorer's live surfaces as localized routes resolved from routing.ts", () => {
    const hubs = getAccessModeHubs("fr");
    const explorer = hubs.find((hub) => hub.id === "explorer");

    expect(explorer?.surfaces.map((surface) => surface.href)).toEqual([
      getLocalizedRoute("fr", "countries"),
      getLocalizedRoute("fr", "families"),
      getLocalizedRoute("fr", "peoples"),
      getLocalizedRoute("fr", "search"),
    ]);
  });

  // @req REQ-091
  it("declares Comprendre's live surfaces as localized routes resolved from routing.ts", () => {
    const hubs = getAccessModeHubs("fr");
    const comprendre = hubs.find((hub) => hub.id === "comprendre");

    expect(comprendre?.surfaces.map((surface) => surface.href)).toEqual([
      getLocalizedRoute("fr", "doctrine"),
      getLocalizedRoute("fr", "about"),
    ]);
  });

  // @req REQ-091
  it("marks Explorer and Comprendre as visible given today's live surfaces", () => {
    const hubs = getAccessModeHubs("fr");

    expect(hubs.find((hub) => hub.id === "explorer")?.isVisible).toBe(true);
    expect(hubs.find((hub) => hub.id === "comprendre")?.isVisible).toBe(true);
  });

  // @req REQ-091
  it("marks Jouer as not visible since it has zero live surfaces today", () => {
    const hubs = getAccessModeHubs("fr");
    const jouer = hubs.find((hub) => hub.id === "jouer");

    expect(jouer?.surfaces).toHaveLength(0);
    expect(jouer?.isVisible).toBe(false);
  });

  // @req REQ-091
  it("filters out non-visible hubs via getVisibleAccessModeHubs", () => {
    const visible = getVisibleAccessModeHubs("fr");

    expect(visible.map((hub) => hub.id)).toEqual(["explorer", "comprendre"]);
  });

  // @req REQ-091
  it("computes visibility generically from the surface count, so a hub added to later becomes visible with no changes elsewhere", () => {
    expect(isHubVisible(0)).toBe(false);
    expect(isHubVisible(1)).toBe(true);
    expect(isHubVisible(2)).toBe(true);
  });
});
