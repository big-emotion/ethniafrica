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
} from "@/lib/hubs/moduleRegistry";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import { getLocalizedRoute } from "@/lib/routing";

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
  //
  // Pays leads. A reader arriving with a name most often arrives with a
  // country's — it is the one entity of the four they already hold before
  // the atlas teaches them anything, and the fiche it opens lists the
  // peoples underneath it. Peuples first asked them to name a people to
  // find a people.
  // @req REQ-114
  it("gives explorer the modules a reader reaches by name, country first", () => {
    const ids = getModulesForAccessMode("explorer").map((m) => m.id);
    expect(ids).toEqual(["pays", "peuples", "familles", "recherche"]);
  });

  // Ordered from the most concrete question to the method that answers it,
  // with the project itself closing the axis.
  // @req REQ-114 @req REQ-132
  it("gives comprendre the modules a reader reaches by question", () => {
    const ids = getModulesForAccessMode("comprendre").map((m) => m.id);
    expect(ids).toEqual([
      "anecdotes",
      "noms",
      "frise",
      "regards-colonisation",
      "doctrine",
      "about",
    ]);
  });

  // @req REQ-114 @req REQ-120
  it("gives jouer the quiz and the one surviving game, in playing order", () => {
    const ids = getModulesForAccessMode("jouer").map((m) => m.id);
    expect(ids).toEqual(["quiz", "mercator"]);
  });

  // "Noms & appellations" answers *why does this people carry this name* —
  // a question, not a name, so it belongs to Comprendre.
  // @req REQ-114
  it("files noms under the question axis, not the naming axis", () => {
    const noms = MODULE_DEFINITIONS.find((m) => m.id === "noms");
    expect(noms?.accessMode).toBe("comprendre");
  });

  // About answers how and why the project exists, so it closes Comprendre.
  // Keeping it last preserves every positional accent already assigned.
  // @req REQ-132
  it("registers about once, last, ready, and under Comprendre", () => {
    const aboutModules = MODULE_DEFINITIONS.filter((m) => m.id === "about");

    expect(aboutModules).toHaveLength(1);
    expect(MODULE_DEFINITIONS.at(-1)).toBe(aboutModules[0]);
    expect(aboutModules[0]).toMatchObject({
      name: "À propos du projet",
      accessMode: "comprendre",
      page: "about",
      availability: "static",
      editorialReadiness: "ready",
    });
    expect(getModulesForAccessMode("comprendre")).toContain(aboutModules[0]);
  });

  // @req REQ-132
  it("routes about to its French-only project page", () => {
    const about = MODULE_DEFINITIONS.find((m) => m.id === "about");

    expect(about).toBeDefined();
    expect(getModuleHref(about!, "fr")).toBe("/fr/about");
  });

  // The quiz used to hang from NEXT_PUBLIC_FEATURE_QUIZ, so a built route
  // existed that no reader could reach. It reads its own bank now, like
  // every other data module reads its table.
  // @req REQ-114
  it("registers the quiz as a data module over its own bank", () => {
    const quiz = MODULE_DEFINITIONS.find((m) => m.id === "quiz");
    expect(quiz?.accessMode).toBe("jouer");
    expect(quiz?.availability).toBe("data");
    expect(quiz?.dataSource).toBe("quiz_questions");
    expect(quiz?.page).toBe("quiz");
  });

  // @req REQ-120
  it("gives every jouer module somewhere to go", () => {
    for (const def of getModulesForAccessMode("jouer")) {
      expect(def.page ?? def.gameSlug).toBeTruthy();
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
  // @req REQ-114 @req REQ-132
  it("routes every static module without asking the database", () => {
    const staticModules = MODULE_DEFINITIONS.filter(
      (m) => m.availability === "static"
    );
    expect(staticModules.map((m) => m.id)).toEqual([
      "recherche",
      "anecdotes",
      "regards-colonisation",
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
      getLocalizedRoute("fr", "colonization")
    );
  });
});

describe("moduleRegistry — the list the header may show (REQ-114)", () => {
  // The quiz was listed here only while an environment variable said so, so
  // the header silently lost an entry depending on where the app was built.
  // @req REQ-114
  it("lists the quiz whatever the environment says", () => {
    process.env.NEXT_PUBLIC_FEATURE_QUIZ = "false";
    expect(getNavModules("jouer").map((def) => def.id)).toContain("quiz");

    delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    expect(getNavModules("jouer").map((def) => def.id)).toContain("quiz");
  });

  // @req REQ-106
  it("hides no module from the header", () => {
    for (const mode of ACCESS_MODES) {
      expect(getNavModules(mode)).toEqual(getModulesForAccessMode(mode));
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

  // Appending About must not recolor any module readers already know.
  // @req REQ-132
  it("preserves every pre-existing positional accent", () => {
    const expectedAccents = Object.freeze({
      pays: "afh-accent-ocre",
      peuples: "afh-accent-teal",
      familles: "afh-accent-terre",
      recherche: "afh-accent-perv",
      anecdotes: "afh-accent-ocre",
      noms: "afh-accent-teal",
      frise: "afh-accent-terre",
      "regards-colonisation": "afh-accent-perv",
      quiz: "afh-accent-ocre",
      mercator: "afh-accent-teal",
      doctrine: "afh-accent-terre",
    } as const);

    for (const [id, accent] of Object.entries(expectedAccents)) {
      const definition = MODULE_DEFINITIONS.find((def) => def.id === id);
      expect(definition, `missing pre-existing module ${id}`).toBeDefined();
      expect(accentForModule(definition!)).toBe(accent);
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
