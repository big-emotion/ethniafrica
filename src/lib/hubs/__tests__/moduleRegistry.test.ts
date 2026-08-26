import { describe, expect, it } from "vitest";

import {
  ACCESS_MODES,
  ACCENT_BY_ACCESS_MODE,
  MODULE_DEFINITIONS,
  getModulesForAccessMode,
} from "@/lib/hubs/moduleRegistry";

describe("moduleRegistry — access-mode → module mapping (REQ-114)", () => {
  // @req REQ-114
  it("enumerates the three intents a reader arrives with", () => {
    expect(ACCESS_MODES).toEqual(["explorer", "comprendre", "jouer"]);
  });

  // @req REQ-114
  it("maps every registered module to exactly one of the three access modes", () => {
    for (const def of MODULE_DEFINITIONS) {
      expect(ACCESS_MODES).toContain(def.accessMode);
    }
  });

  // @req REQ-114
  it("resolves each access mode to its module list with no orphans", () => {
    const grouped = ACCESS_MODES.flatMap((mode) =>
      getModulesForAccessMode(mode)
    );
    expect(grouped).toHaveLength(MODULE_DEFINITIONS.length);
    expect(new Set(grouped.map((m) => m.id)).size).toBe(
      MODULE_DEFINITIONS.length
    );
  });

  // @req REQ-114
  it("gives explorer the modules that answer a reader who knows what they seek", () => {
    const ids = getModulesForAccessMode("explorer").map((m) => m.id);
    expect(ids).toEqual(["peuples", "pays", "familles", "recherche", "noms"]);
  });

  // @req REQ-114
  it("gives comprendre the modules that account for where a claim comes from", () => {
    const ids = getModulesForAccessMode("comprendre").map((m) => m.id);
    expect(ids).toEqual(["doctrine", "about", "frise"]);
  });

  // @req REQ-114
  it("gives jouer the modules that make the corpus answer back", () => {
    const ids = getModulesForAccessMode("jouer").map((m) => m.id);
    expect(ids).toEqual(["comparer", "liens"]);
  });

  // @req REQ-114
  it("forces comparer and liens unavailable regardless of routing or data", () => {
    const comparer = MODULE_DEFINITIONS.find((m) => m.id === "comparer");
    const liens = MODULE_DEFINITIONS.find((m) => m.id === "liens");
    expect(comparer?.availability).toBe("unavailable");
    expect(liens?.availability).toBe("unavailable");
    expect(liens?.page).toBeNull();
  });

  // @req REQ-114
  it("gives every data module a dataSource and every other module none", () => {
    for (const def of MODULE_DEFINITIONS) {
      if (def.availability === "data") {
        expect(def.dataSource).toBeDefined();
      } else {
        expect(def.dataSource).toBeUndefined();
      }
    }
  });

  // A static module is a page that exists whatever the corpus holds, so
  // gating it behind a row count would hide a working route.
  // @req REQ-114
  it("routes every static module without asking the database", () => {
    const staticModules = MODULE_DEFINITIONS.filter(
      (m) => m.availability === "static"
    );
    expect(staticModules.map((m) => m.id)).toEqual([
      "recherche",
      "doctrine",
      "about",
    ]);
    for (const def of staticModules) {
      expect(def.page).not.toBeNull();
    }
  });

  // @req REQ-114
  it("scopes each access mode to its own categorical accent", () => {
    expect(ACCENT_BY_ACCESS_MODE).toEqual({
      explorer: "afh-accent-ocre",
      comprendre: "afh-accent-teal",
      jouer: "afh-accent-perv",
    });
  });
});
