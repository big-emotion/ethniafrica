import { describe, it, expect } from "vitest";
import {
  getHomeModules,
  getModuleCategories,
  isModuleLive,
} from "@/lib/accessModeHubs";
import { getLocalizedRoute } from "@/lib/routing";

describe("accessModeHubs — 10-module light-home config", () => {
  // @req FR92
  // @req REQ-044
  it("exports exactly 10 module entries", () => {
    const modules = getHomeModules("fr");
    expect(modules).toHaveLength(10);
  });

  // @req FR92
  // @req REQ-044
  it("gives every module an id, FR title, category, accent, illustration and live|soon state", () => {
    const modules = getHomeModules("fr");

    for (const entry of modules) {
      expect(typeof entry.id).toBe("string");
      expect(entry.id.length).toBeGreaterThan(0);
      expect(typeof entry.title).toBe("string");
      expect(entry.title.length).toBeGreaterThan(0);
      expect(["explorer", "comprendre", "jouer"]).toContain(entry.category);
      expect(typeof entry.accent).toBe("string");
      expect(typeof entry.illustration).toBe("string");
      expect(["live", "soon"]).toContain(entry.state);
    }
  });

  // @req FR92
  // @req REQ-044
  it("marks a module live only when it resolves to an existing localized route", () => {
    const modules = getHomeModules("fr");
    const peuples = modules.find((module) => module.id === "peuples");

    expect(peuples?.state).toBe("live");
    expect(peuples?.href).toBe(getLocalizedRoute("fr", "peoples"));
  });

  // @req FR92
  // @req REQ-044
  it("marks a module soon («Bientôt») when it has no live route yet", () => {
    const modules = getHomeModules("fr");
    const soonModules = modules.filter((module) => module.state === "soon");

    expect(soonModules.length).toBeGreaterThan(0);
    for (const entry of soonModules) {
      expect(entry.href).toBeNull();
    }
  });

  // @req FR92
  // @req REQ-044
  it("computes live|soon generically from route resolution, not a hardcoded id list", () => {
    expect(isModuleLive(null)).toBe(false);
    expect(isModuleLive("peoples")).toBe(true);
  });

  // @req FR92
  // @req REQ-044
  it("derives the Tout/Explorer/Comprendre/Jouer categories from the config, in first-seen order", () => {
    expect(getModuleCategories()).toEqual(["explorer", "comprendre", "jouer"]);
  });
});
