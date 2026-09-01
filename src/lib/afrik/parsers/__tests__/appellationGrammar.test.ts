import { describe, expect, it } from "vitest";

import { deriveAppellations } from "../appellationGrammar";

describe("deriveAppellations", () => {
  // @req REQ-057
  it("reads a bare autonym as an endonym", () => {
    const { entries } = deriveAppellations({
      selfAppellation: "Wolof",
      exonyms: [],
    });

    expect(entries).toEqual([
      {
        nameText: "Wolof",
        nameType: "endonym",
        gloss: null,
        sortRank: 0,
      },
    ]);
  });

  // @req REQ-057
  it("peels a trailing parenthesis off the name and keeps it as a gloss", () => {
    const { entries } = deriveAppellations({
      selfAppellation:
        "Gu-haaca (nom de la langue dans l'autonymie des locuteurs)",
      exonyms: [],
    });

    expect(entries[0].nameText).toBe("Gu-haaca");
    expect(entries[0].gloss).toBe(
      "nom de la langue dans l'autonymie des locuteurs"
    );
  });

  // @req REQ-057
  it("splits slash-separated spellings into one lead name and its variants", () => {
    const { entries } = deriveAppellations({
      selfAppellation: null,
      exonyms: ["Mankanya / Mankagne / Mankague (variantes orthographiques)"],
    });

    expect(entries.map((entry) => [entry.nameText, entry.nameType])).toEqual([
      ["Mankanya", "exonym"],
      ["Mankagne", "historical_spelling"],
      ["Mankague", "historical_spelling"],
    ]);
  });

  // @req REQ-057
  it("treats a semicolon as a boundary between independent appellations", () => {
    const { entries } = deriveAppellations({
      selfAppellation:
        "Imigrantes africanos (en portugais capverdien) ; appellations propres aux differentes origines nationales",
      exonyms: [],
    });

    expect(entries.map((entry) => entry.nameText)).toEqual([
      "Imigrantes africanos",
    ]);
  });

  // @req REQ-057
  it("refuses a segment that describes appellations instead of naming one", () => {
    const { entries, rejected } = deriveAppellations({
      selfAppellation:
        "Diverses appellations selon les sous-groupes (Peul, Wolof, Sereer)",
      exonyms: [],
    });

    expect(entries).toEqual([]);
    expect(rejected).toEqual([
      "Diverses appellations selon les sous-groupes (Peul, Wolof, Sereer)",
    ]);
  });

  // @req REQ-057
  it("refuses a segment too long to be a name", () => {
    const { entries, rejected } = deriveAppellations({
      selfAppellation: null,
      exonyms: ["Un groupe humain installe sur les rives du fleuve"],
    });

    expect(entries).toEqual([]);
    expect(rejected).toHaveLength(1);
  });

  // @req REQ-057
  it("ranks the autonym ahead of every exonym", () => {
    const { entries } = deriveAppellations({
      selfAppellation: "Bamanan",
      exonyms: ["Bambara", "Banmana"],
    });

    expect(entries.map((entry) => [entry.nameText, entry.sortRank])).toEqual([
      ["Bamanan", 0],
      ["Bambara", 1],
      ["Banmana", 2],
    ]);
  });

  // @req REQ-057
  it("keeps the same appellation once when the corpus repeats it", () => {
    const { entries } = deriveAppellations({
      selfAppellation: "Wolof",
      exonyms: ["Wolof", "Ouolof"],
    });

    expect(entries.map((entry) => entry.nameText)).toEqual(["Wolof", "Ouolof"]);
  });

  // @req REQ-057
  it("returns nothing for a fiche that declares no appellation at all", () => {
    expect(deriveAppellations({ selfAppellation: null, exonyms: [] })).toEqual({
      entries: [],
      rejected: [],
    });
  });
});
