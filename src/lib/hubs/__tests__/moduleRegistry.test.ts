import { afterEach, describe, expect, it } from "vitest";

import {
  ACCENT_CYCLE,
  ACCESS_MODE_LABELS,
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
  it("owns the exact French label of every access mode", () => {
    expect(ACCESS_MODE_LABELS).toEqual({
      explorer: "Consulter",
      comprendre: "Enquêter",
      jouer: "Jouer",
    });
  });

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
    expect(ids).toEqual(["pays", "peuples", "familles", "noms", "recherche"]);
  });

  // Ordered from the most concrete question to the method that answers it.
  // @req REQ-114
  it("gives comprendre only the questions asked of the corpus", () => {
    const ids = getModulesForAccessMode("comprendre").map((m) => m.id);
    expect(ids).toEqual(["anecdotes", "frise", "regards-colonisation"]);
  });

  // @req REQ-114 @req REQ-120
  it("gives jouer the quiz and the one surviving game, in playing order", () => {
    const ids = getModulesForAccessMode("jouer").map((m) => m.id);
    expect(ids).toEqual(["quiz", "mercator"]);
  });

  // ETNI-1453 makes the name a corpus entity with its own fiche, so
  // Appellations now takes a name and returns a fiche — the filing rule for
  // Explorer, and the same rule pays/peuples/familles are filed under.
  // @req REQ-114
  it("files noms with the other nominal entry points", () => {
    const noms = MODULE_DEFINITIONS.find((m) => m.id === "noms");
    expect(noms?.accessMode).toBe("explorer");
  });

  // Doctrine and About describe the project, not the corpus: neither takes a
  // name nor answers a question about a people, so neither is filed on an
  // access mode at all. They are reached from the footer.
  // @req REQ-132
  it("keeps the project pages out of the access-mode taxonomy", () => {
    const ids = MODULE_DEFINITIONS.map((m) => m.id);

    expect(ids).not.toContain("doctrine");
    expect(ids).not.toContain("about");
  });

  // @req REQ-132
  it("still routes the project pages, module or not", () => {
    expect(getLocalizedRoute("fr", "about")).toBe("/fr/about");
    expect(getLocalizedRoute("fr", "doctrine")).toBe("/fr/doctrine");
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
  // @req REQ-114
  it("routes every static module without asking the database", () => {
    const staticModules = MODULE_DEFINITIONS.filter(
      (m) => m.availability === "static"
    );
    expect(staticModules.map((m) => m.id)).toEqual([
      "recherche",
      "anecdotes",
      "regards-colonisation",
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

  // The accent is positional, so regrouping repaints. Pinning the whole map
  // is what makes that repaint a decision rather than a side effect: moving
  // Appellations up to fourth turns it perv and pushes recherche and
  // anecdotes one step back round the cycle.
  // @req REQ-114
  it("pins the accent every module wears after the regrouping", () => {
    const expectedAccents = Object.freeze({
      pays: "afh-accent-ocre",
      peuples: "afh-accent-teal",
      familles: "afh-accent-terre",
      noms: "afh-accent-perv",
      recherche: "afh-accent-ocre",
      anecdotes: "afh-accent-teal",
      frise: "afh-accent-terre",
      "regards-colonisation": "afh-accent-perv",
      quiz: "afh-accent-ocre",
      mercator: "afh-accent-teal",
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
