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

  // The migrations atlas (ETNI-521) and the comparator (epic 9) both shipped,
  // and the nav already links to /fr/migrations — leaving their cards on
  // «Bientôt» made the home contradict the rest of the site.
  // @req FR92
  // @req REQ-044
  it("marks the shipped migrations atlas live", () => {
    const modules = getHomeModules("fr");
    const frise = modules.find((module) => module.id === "frise");

    expect(frise?.state).toBe("live");
    expect(frise?.href).toBe(getLocalizedRoute("fr", "migrations"));
  });

  // ETNI-1198/ETNI-1220: the corpus behind this card is 6 sourced events —
  // far short of what «3 000 ans de migrations» implies. Until the sourcing
  // floor set by the spike is met, the card copy must not claim coverage the
  // corpus doesn't have.
  // @req FR92
  // @req REQ-044
  it("does not claim '3 000 ans' coverage on the migrations card before the sourcing floor is met", () => {
    const modules = getHomeModules("fr");
    const frise = modules.find((module) => module.id === "frise");

    expect(frise?.title).not.toMatch(/3\s?000\s+ans/i);
  });

  // @req FR92
  // @req REQ-044
  it("marks the shipped comparator live", () => {
    const modules = getHomeModules("fr");
    const comparer = modules.find((module) => module.id === "comparer");

    expect(comparer?.state).toBe("live");
    expect(comparer?.href).toBe(getLocalizedRoute("fr", "compare"));
  });

  // Only a per-people ego graph exists (/fr/peuples/{slug}/liens); there is no
  // standalone hub to send the home card to, so it stays «Bientôt».
  // @req FR92
  // @req REQ-044
  it("keeps the invisible-links game soon while it has no standalone hub", () => {
    const modules = getHomeModules("fr");
    const liens = modules.find((module) => module.id === "liens");

    expect(liens?.state).toBe("soon");
    expect(liens?.href).toBeNull();
  });

  // @req FR92
  // @req REQ-044
  it("derives the Tout/Explorer/Comprendre/Jouer categories from the config, in first-seen order", () => {
    expect(getModuleCategories()).toEqual(["explorer", "comprendre", "jouer"]);
  });
});
