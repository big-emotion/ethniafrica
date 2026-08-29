import { describe, expect, it } from "vitest";
import { GAME_DEFINITIONS, GAME_SLUGS, getGameBySlug } from "../gameRegistry";
import { MODULE_DEFINITIONS } from "@/lib/hubs/moduleRegistry";

describe("GAME_DEFINITIONS", () => {
  // One finished game beats three approximate ones; every retired generator
  // is recoverable from git when it is rebuilt against the games charter.
  // @req REQ-120
  it("holds the one game the Jouer hub lists beside the quiz", () => {
    expect(GAME_DEFINITIONS).toHaveLength(1);
    expect(GAME_SLUGS).toEqual(["mercator"]);
  });

  // @req REQ-120
  it("gives every game a unique id and a unique slug", () => {
    expect(new Set(GAME_DEFINITIONS.map((g) => g.id)).size).toBe(1);
    expect(new Set(GAME_SLUGS).size).toBe(1);
  });

  // @req REQ-120
  it("uses only the surviving interaction primitives", () => {
    const kinds = new Set(GAME_DEFINITIONS.flatMap((game) => game.kinds));
    expect([...kinds].sort()).toEqual(["binary", "estimate"]);
  });

  // The point of this test is not the count but the absence of dead engine
  // paths: a GameKind no game declares is a renderer shipping unexercised.
  // @req REQ-120
  it("covers every primitive it declares, so no engine path ships unexercised", () => {
    for (const kind of ["binary", "estimate"] as const) {
      expect(GAME_DEFINITIONS.some((game) => game.kinds.includes(kind))).toBe(
        true
      );
    }
  });

  // @req REQ-120
  it("asks for at least one round per game", () => {
    for (const game of GAME_DEFINITIONS) {
      expect(game.roundsPerSession).toBeGreaterThan(0);
    }
  });

  // UX-DR27/34: the games teach, they do not celebrate.
  // @req REQ-120
  it("carries no exclamation mark or emoji in its French copy", () => {
    for (const game of GAME_DEFINITIONS) {
      const copy = `${game.nameFr} ${game.promptFr}`;
      expect(copy).not.toMatch(/!/);
      expect(copy).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  // @req REQ-120
  it("names a corpus slice the service knows how to load for every game", () => {
    const sources = new Set(GAME_DEFINITIONS.map((game) => game.dataSource));
    for (const source of sources) {
      expect(["countries"]).toContain(source);
    }
  });
});

describe("getGameBySlug", () => {
  // @req REQ-120
  it("resolves every registered slug", () => {
    for (const slug of GAME_SLUGS) {
      expect(getGameBySlug(slug)?.slug).toBe(slug);
    }
  });

  // @req REQ-120
  it("returns null for an unknown slug so the route can answer 404", () => {
    expect(getGameBySlug("pas-un-jeu")).toBeNull();
  });

  // A retired game must 404 rather than linger as a half-working route.
  // @req REQ-120
  it("no longer resolves a retired slug", () => {
    for (const slug of [
      "plus-ou-moins",
      "vraie-taille",
      "repartition",
      "royaumes",
      "migrations",
      "liens",
      "familles",
      "frontieres",
      "appellations",
      "pays-davant",
    ]) {
      expect(getGameBySlug(slug)).toBeNull();
    }
  });
});

describe("the hub and the game registry agree", () => {
  const hubGameSlugs = MODULE_DEFINITIONS.filter((entry) => entry.gameSlug).map(
    (entry) => entry.gameSlug as string
  );

  // A hub entry pointing at an unregistered slug would render a link to a
  // 404 — the exact failure REQ-120 exists to end.
  // @req REQ-120
  it("registers every slug the Jouer hub links to", () => {
    for (const slug of hubGameSlugs) {
      expect(GAME_SLUGS).toContain(slug);
    }
  });

  // @req REQ-120
  it("links to every registered game from the hub, leaving none unreachable", () => {
    for (const slug of GAME_SLUGS) {
      expect(hubGameSlugs).toContain(slug);
    }
  });

  // @req REQ-120
  it("lists two Jouer entries once the quiz is counted", () => {
    const jouerModules = MODULE_DEFINITIONS.filter(
      (entry) => entry.accessMode === "jouer"
    );
    expect(jouerModules).toHaveLength(2);
    expect(jouerModules.some((entry) => entry.id === "quiz")).toBe(true);
    expect(jouerModules.some((entry) => entry.id === "mercator")).toBe(true);
  });

  // @req REQ-120
  it("leaves no Jouer entry marked unavailable", () => {
    const jouerModules = MODULE_DEFINITIONS.filter(
      (entry) => entry.accessMode === "jouer"
    );
    for (const entry of jouerModules) {
      expect(entry.availability).not.toBe("unavailable");
    }
  });
});
