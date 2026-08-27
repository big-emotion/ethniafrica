import { afterEach, describe, expect, it } from "vitest";

import {
  ACCENT_CYCLE,
  ACCESS_MODES,
  ACCENT_BY_ACCESS_MODE,
  MODULE_DEFINITIONS,
  MODULE_GROUPS,
  accentForModule,
  getModulesForAccessMode,
  getNavModules,
  isModuleEnabled,
  type HubModuleDefinition,
} from "@/lib/hubs/moduleRegistry";
import { getModuleHref } from "@/lib/hubs/moduleHref";

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
    expect(ids).toEqual(["noms", "frise", "regards-colonisation", "doctrine"]);
  });

  // @req REQ-114 @req REQ-120
  it("gives jouer the quiz and the three games, in playing order", () => {
    const ids = getModulesForAccessMode("jouer").map((m) => m.id);
    expect(ids).toEqual(["quiz", "appellations", "mercator", "pays-davant"]);
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

  // A hub entry left behind by a retired game would link to a 404 and, worse,
  // make loadHeroPreview log an unregistered slug on every home render.
  // @req REQ-120
  it("keeps no hub entry for a retired game", () => {
    const retired = new Set([
      "plus-ou-moins",
      "vraie-taille",
      "repartition",
      "royaumes",
      "migrations",
      "liens",
      "familles",
      "frontieres",
    ]);
    for (const def of MODULE_DEFINITIONS) {
      expect(retired.has(def.gameSlug ?? "")).toBe(false);
    }
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
      "regards-colonisation",
      "doctrine",
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

describe("moduleRegistry — the editorial gazes are an axis module (REQ-114)", () => {
  // The header is generated from the registry, so a destination absent from
  // it is a destination the reader can no longer reach from the header.
  // @req REQ-114
  it("files the colonial gazes under Comprendre", () => {
    const gazes = getModulesForAccessMode("comprendre").find(
      (def) => def.page === "colonization"
    );

    expect(gazes).toBeDefined();
    expect(getModuleHref(gazes, "fr")).toBe(
      "/fr/regards/colonisation-et-resistances"
    );
  });
});

describe("moduleRegistry — the list the header may show (REQ-114)", () => {
  // @req REQ-114
  it("lists a flagged module only while its flag is lit", () => {
    process.env.NEXT_PUBLIC_FEATURE_QUIZ = "false";
    expect(getNavModules("jouer").map((def) => def.id)).not.toContain("quiz");

    process.env.NEXT_PUBLIC_FEATURE_QUIZ = "true";
    expect(getNavModules("jouer").map((def) => def.id)).toContain("quiz");
  });

  // Dropping it would hide that the module is coming; listing it as a link
  // would promise a route that answers notFound().
  // @req REQ-106
  it("keeps an unbuilt module listed so it can carry its Bientôt state", () => {
    const unbuilt = MODULE_DEFINITIONS.filter(
      (def) => def.availability === "unavailable"
    );

    for (const def of unbuilt) {
      expect(getNavModules(def.accessMode)).toContainEqual(def);
    }
  });

  // @req REQ-114
  it("keeps the registry order so the accent cycle is stable across renders", () => {
    process.env.NEXT_PUBLIC_FEATURE_QUIZ = "true";

    expect(getNavModules("explorer").map((def) => def.id)).toEqual(
      getModulesForAccessMode("explorer").map((def) => def.id)
    );
  });
});

describe("moduleRegistry — per-module accent (atlas charter §2)", () => {
  // The mockup walks the four categorical accents across the whole registry
  // rather than restarting at each axis, which is what makes Explorer read
  // ocre · teal · terre · perv in docs/design/mockups/parts/nav-core.js.
  // @req REQ-114
  it("walks the four categorical accents in registry order", () => {
    const explorer = getModulesForAccessMode("explorer").slice(0, 4);

    expect(explorer.map(accentForModule)).toEqual([
      "afh-accent-ocre",
      "afh-accent-teal",
      "afh-accent-terre",
      "afh-accent-perv",
    ]);
  });

  // @req REQ-114
  it("gives every registered module one of the four categorical accents", () => {
    for (const def of MODULE_DEFINITIONS) {
      expect(ACCENT_CYCLE).toContain(accentForModule(def));
    }
  });
});

describe("moduleRegistry — the shelf a jouer module sits on (REQ-120)", () => {
  // @req REQ-120
  it("gives every game a shelf, so none can fall off the surface", () => {
    for (const def of getModulesForAccessMode("jouer")) {
      expect(def.group).toBeTruthy();
      expect(MODULE_GROUPS[def.group]).toBeTruthy();
    }
  });

  // Grouping is a jouer concern: the other two axes hold few enough
  // modules to read at once, and filing them would add a level for nothing.
  // @req REQ-120
  it("leaves explorer and comprendre unfiled", () => {
    for (const mode of ["explorer", "comprendre"] as const) {
      for (const def of getModulesForAccessMode(mode)) {
        expect(def.group).toBeUndefined();
      }
    }
  });

  // The quiz questions the reader rather than the corpus, so it belongs on
  // no entity's shelf — and it is the one jouer module addressed by page.
  // @req REQ-120
  it("keeps the quiz on a shelf of its own", () => {
    const quiz = MODULE_DEFINITIONS.find((m) => m.id === "quiz");
    expect(quiz?.group).toBe("jeux-quiz");
  });
});
