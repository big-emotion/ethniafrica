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

  // @req REQ-114 @req REQ-120
  it("gives jouer the quiz and the eleven games, in playing order", () => {
    const ids = getModulesForAccessMode("jouer").map((m) => m.id);
    expect(ids).toEqual([
      "quiz",
      "appellations",
      "plus-ou-moins",
      "mercator",
      "comparer",
      "repartition",
      "pays-davant",
      "royaumes",
      "migrations",
      "liens",
      "jeu-familles",
      "frontieres",
    ]);
  });

  // comparer and liens shipped as "Bientôt" placeholders; the surfaces they
  // stood in for now exist, so their ids are reused rather than duplicated.
  // @req REQ-120
  it("leaves no jouer module stranded on the unavailable placeholder", () => {
    for (const def of getModulesForAccessMode("jouer")) {
      expect(def.availability).toBe("data");
    }
  });

  // A game is addressed by slug under /jouer, which keeps PageType a closed
  // union instead of growing one variant per game.
  // @req REQ-120
  it("addresses every game by slug and the quiz by its own page", () => {
    const jouer = getModulesForAccessMode("jouer");
    const quiz = jouer.find((m) => m.id === "quiz");
    expect(quiz?.page).toBe("quiz");
    expect(quiz?.gameSlug).toBeUndefined();

    for (const game of jouer.filter((m) => m.id !== "quiz")) {
      expect(game.gameSlug).toBeTruthy();
      expect(game.page).toBeNull();
    }
  });

  // @req REQ-120
  it("keeps every game slug distinct so two games cannot share a route", () => {
    const slugs = MODULE_DEFINITIONS.map((m) => m.gameSlug).filter(Boolean);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  // The placeholder's id survives so nothing referencing it breaks, but the
  // game it became is named and routed for what it does.
  // @req REQ-120
  it("keeps the comparer id while routing it to the vraie-taille game", () => {
    const comparer = MODULE_DEFINITIONS.find((m) => m.id === "comparer");
    expect(comparer?.name).toBe("Vraie taille");
    expect(comparer?.gameSlug).toBe("vraie-taille");
  });

  // @req REQ-120
  it("backs the two games that shipped without a data source", () => {
    const liens = MODULE_DEFINITIONS.find((m) => m.id === "liens");
    const quiz = MODULE_DEFINITIONS.find((m) => m.id === "quiz");
    expect(liens?.dataSource).toBe("afrik_people_relations");
    expect(quiz?.dataSource).toBe("quiz_questions");
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
