import { afterEach, describe, expect, it } from "vitest";

import {
  ACCESS_MODES,
  ACCENT_BY_ACCESS_MODE,
  MODULE_DEFINITIONS,
  getModulesForAccessMode,
  isModuleEnabled,
  type HubModuleDefinition,
} from "@/lib/hubs/moduleRegistry";

const ORIGINAL_QUIZ_FLAG = process.env.NEXT_PUBLIC_FEATURE_QUIZ;

afterEach(() => {
  if (ORIGINAL_QUIZ_FLAG === undefined) {
    delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;
  } else {
    process.env.NEXT_PUBLIC_FEATURE_QUIZ = ORIGINAL_QUIZ_FLAG;
  }
});

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

  // A reader arrives at Explorer with a name and leaves with a fiche, so
  // every module here is a nominal entry point into the corpus.
  // @req REQ-114
  it("gives explorer the modules a reader reaches by name", () => {
    const ids = getModulesForAccessMode("explorer").map((m) => m.id);
    expect(ids).toEqual(["peuples", "pays", "familles", "recherche"]);
  });

  // Ordered from the most concrete question to the method that answers it.
  // @req REQ-114
  it("gives comprendre the modules a reader reaches by question", () => {
    const ids = getModulesForAccessMode("comprendre").map((m) => m.id);
    expect(ids).toEqual(["noms", "frise", "doctrine"]);
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

  // "Noms & appellations" answers *why does this people carry this name* —
  // a question, not a name, so it belongs to Comprendre.
  // @req REQ-114
  it("files noms under the question axis, not the naming axis", () => {
    const noms = MODULE_DEFINITIONS.find((m) => m.id === "noms");
    expect(noms?.accessMode).toBe("comprendre");
  });

  // About is a page about the project, not a way into the corpus; it lives
  // in the site chrome now.
  // @req REQ-114
  it("drops about from the registry entirely", () => {
    expect(MODULE_DEFINITIONS.map((m) => m.id)).not.toContain("about");
  });

  // The quiz is gated on its build flag rather than on a row count: with the
  // flag dark its route answers notFound(), and a corpus probe cannot see
  // that.
  // @req REQ-114
  it("registers the quiz behind its feature flag under jouer", () => {
    const quiz = MODULE_DEFINITIONS.find((m) => m.id === "quiz");
    expect(quiz?.accessMode).toBe("jouer");
    expect(quiz?.availability).toBe("flagged");
    expect(quiz?.featureFlag).toBe("quiz");
    expect(quiz?.page).toBe("quiz");
  });

  // comparer and liens shipped as "Bientôt" placeholders; the surfaces they
  // stood in for now exist, so their ids are reused rather than duplicated.
  // @req REQ-120
  it("leaves no jouer module stranded on the unavailable placeholder", () => {
    for (const def of getModulesForAccessMode("jouer")) {
      expect(def.availability).not.toBe("unavailable");
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

  // liens shipped without one because it had no surface of its own; the game
  // it became reads the relations table like any other.
  // @req REQ-120
  it("backs the liens game with the relations it questions", () => {
    const liens = MODULE_DEFINITIONS.find((m) => m.id === "liens");
    expect(liens?.dataSource).toBe("afrik_people_relations");
    expect(liens?.gameSlug).toBe("liens");
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
    expect(staticModules.map((m) => m.id)).toEqual(["recherche", "doctrine"]);
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

describe("moduleRegistry — isModuleEnabled (REQ-106)", () => {
  const flaggedQuiz = (
    featureFlag?: HubModuleDefinition["featureFlag"]
  ): HubModuleDefinition => ({
    id: "quiz",
    name: "Le quiz des parcours",
    accessMode: "jouer",
    page: "quiz",
    availability: "flagged",
    featureFlag,
  });

  // @req REQ-106
  it("holds a flagged module off while its flag is unset", () => {
    delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    expect(isModuleEnabled(flaggedQuiz("quiz"))).toBe(false);
  });

  // @req REQ-106
  it("brings a flagged module in once its flag is on", () => {
    process.env.NEXT_PUBLIC_FEATURE_QUIZ = "true";
    expect(isModuleEnabled(flaggedQuiz("quiz"))).toBe(true);
  });

  // A flagged module naming no flag names no switch that could turn it on,
  // so the safe reading is that it is off.
  // @req REQ-106
  it("holds a flagged module off when it names no flag", () => {
    process.env.NEXT_PUBLIC_FEATURE_QUIZ = "true";
    expect(isModuleEnabled(flaggedQuiz(undefined))).toBe(false);
  });

  // Stated against a definition built here: REQ-120 left no registry entry
  // in the `unavailable` state, and the rule outlives the last module that
  // was in it.
  // @req REQ-106
  it("never enables a module forced unavailable", () => {
    expect(
      isModuleEnabled({ availability: "unavailable", featureFlag: "quiz" })
    ).toBe(false);
  });

  // Data and static modules are decided elsewhere — by the corpus and by
  // the route respectively — so neither is held back here.
  // @req REQ-106
  it("lets data and static modules through without consulting the corpus", () => {
    const peuples = MODULE_DEFINITIONS.find((m) => m.id === "peuples");
    const recherche = MODULE_DEFINITIONS.find((m) => m.id === "recherche");
    expect(isModuleEnabled(peuples)).toBe(true);
    expect(isModuleEnabled(recherche)).toBe(true);
  });
});
