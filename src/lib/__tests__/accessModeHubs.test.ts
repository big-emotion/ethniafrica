import { describe, it, expect } from "vitest";
import {
  MODULE_DEFINITIONS,
  getModuleCategories,
  isModuleLive,
} from "@/lib/accessModeHubs";

describe("accessModeHubs — 10-module light-home config", () => {
  // @req FR92
  // @req REQ-044
  it("exports exactly 10 module entries", () => {
    expect(MODULE_DEFINITIONS).toHaveLength(10);
  });

  // @req FR92
  // @req REQ-044
  it("gives every module an id, FR title, category, accent, illustration and availability mode", () => {
    for (const def of MODULE_DEFINITIONS) {
      expect(typeof def.id).toBe("string");
      expect(def.id.length).toBeGreaterThan(0);
      expect(typeof def.title).toBe("string");
      expect(def.title.length).toBeGreaterThan(0);
      expect(["explorer", "comprendre", "jouer"]).toContain(def.category);
      expect(typeof def.accent).toBe("string");
      expect(typeof def.illustration).toBe("string");
      expect(["static", "data", "unavailable"]).toContain(def.availability);
    }
  });

  // @req FR92
  // @req REQ-044
  it("derives the Tout/Explorer/Comprendre/Jouer categories from the config, in first-seen order", () => {
    expect(getModuleCategories()).toEqual(["explorer", "comprendre", "jouer"]);
  });

  // @req REQ-106
  it("marks a static module live once its route resolves, without needing a data probe", () => {
    expect(isModuleLive({ page: "about", availability: "static" }, false)).toBe(
      true
    );
  });

  // @req REQ-106
  it("marks a data module live only when its probe confirms at least one row", () => {
    expect(isModuleLive({ page: "peoples", availability: "data" }, true)).toBe(
      true
    );
    expect(isModuleLive({ page: "peoples", availability: "data" }, false)).toBe(
      false
    );
  });

  // @req REQ-106
  it("never marks an unavailable module live, regardless of routing or data", () => {
    expect(
      isModuleLive({ page: "compare", availability: "unavailable" }, true)
    ).toBe(false);
  });

  // @req REQ-106
  it("never marks a module live without a resolved route", () => {
    expect(isModuleLive({ page: null, availability: "static" }, true)).toBe(
      false
    );
    expect(isModuleLive({ page: null, availability: "data" }, true)).toBe(
      false
    );
  });

  // Only a per-people ego graph exists (/fr/peuples/{slug}/liens); there is no
  // standalone hub to send the home card to, so it has no route.
  // @req FR92
  // @req REQ-044
  it("keeps the invisible-links game routeless while it has no standalone hub", () => {
    const liens = MODULE_DEFINITIONS.find((def) => def.id === "liens");

    expect(liens?.page).toBeNull();
  });

  // ETNI-1189/REQ-106: the picker built under PR #338 is not wired into any
  // route, so the comparator must never be advertised as available.
  // @req REQ-106
  it("marks the comparator forced-unavailable — its picker is not wired", () => {
    const comparer = MODULE_DEFINITIONS.find((def) => def.id === "comparer");

    expect(comparer?.availability).toBe("unavailable");
  });

  // @req REQ-106
  it("resolves each data module's dataSource to a known Supabase table", () => {
    const dataModules = MODULE_DEFINITIONS.filter(
      (def) => def.availability === "data"
    );

    expect(dataModules.length).toBeGreaterThan(0);
    for (const def of dataModules) {
      expect(typeof def.dataSource).toBe("string");
    }
  });

  // ETNI-1198/ETNI-1220: the corpus behind this card is 6 sourced events —
  // far short of what «3 000 ans de migrations» implies. Until the sourcing
  // floor set by the spike is met, the card copy must not claim coverage the
  // corpus doesn't have.
  // @req FR92
  // @req REQ-044
  it("does not claim '3 000 ans' coverage on the migrations card before the sourcing floor is met", () => {
    const frise = MODULE_DEFINITIONS.find((def) => def.id === "frise");

    expect(frise?.title).not.toMatch(/3\s?000\s+ans/i);
  });

  // ETNI-1196/DEC-019: the corpus behind this card is ethnonyms attached to a
  // people (endonym/exonym/historical spelling), not personal-name
  // genealogy — the label must not promise a question the module cannot
  // answer.
  // @req FR92
  // @req REQ-044
  it("names the ethnonym atlas on the noms card, not personal-name origin", () => {
    const noms = MODULE_DEFINITIONS.find((def) => def.id === "noms");

    expect(noms?.title).toBe("Noms & appellations");
    expect(noms?.title).not.toMatch(/d'où vient un nom/i);
  });
});
