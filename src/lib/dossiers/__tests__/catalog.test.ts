import { getLocalizedRoute } from "@/lib/routing";
import { describe, expect, it } from "vitest";
import { DOSSIER_THEMES } from "@/lib/dossiers/themes";
import {
  getDossiers,
  getPublishedThemes,
  getFicheDossiers,
} from "@/lib/dossiers/catalog";

describe("shared dossier catalog", () => {
  // @req REQ-114
  it("keeps newly published dossiers discoverable after integration", () => {
    expect(getDossiers().map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        "dossier-proportions",
        "dossier-populations",
        "dossier-ressources",
      ])
    );
  });
  // @req REQ-140
  it("keeps English readers on English dossier routes", () => {
    const entry = getDossiers({ language: "en", theme: "noms" })[0];
    expect(entry.href).toBe(getLocalizedRoute("en", "nommer"));
    expect(entry.title).toBe("Who gave this name?");
  });
  // @req REQ-114
  it("bounds navigation to eight unique themes and separates reading formats", () => {
    expect(DOSSIER_THEMES).toHaveLength(8);
    expect(new Set(DOSSIER_THEMES.map((theme) => theme.id)).size).toBe(8);
    expect(
      DOSSIER_THEMES.map((theme) => String(theme.id)).includes("anecdotes")
    ).toBe(false);
    expect(
      getDossiers({ format: "anecdote" }).map((dossier) => dossier.id)
    ).toEqual(["anecdotes"]);
  });

  // @req REQ-114
  it("keeps one canonical dossier address across primary and secondary themes", () => {
    const names = getDossiers({ theme: "noms" });
    const languages = getDossiers({ theme: "langues" });
    expect(names[0].href).toBe(getLocalizedRoute("fr", "nommer"));
    expect(languages[0].href).toBe(names[0].href);
    expect(new Set(getDossiers().map((dossier) => dossier.id)).size).toBe(
      getDossiers().length
    );
  });

  // @req REQ-106
  it("hides draft and unavailable content together with empty themes", () => {
    expect(getDossiers().map((dossier) => dossier.id)).not.toContain("frise");
    expect(
      getDossiers(
        {},
        {
          nommer: false,
          anecdotes: false,
          "dossier-proportions": false,
          "dossier-populations": false,
          "dossier-ressources": false,
        }
      )
    ).toEqual([]);
    expect(
      getPublishedThemes({
        nommer: false,
        anecdotes: false,
        "dossier-proportions": false,
        "dossier-populations": false,
        "dossier-ressources": false,
      })
    ).toEqual([]);
    expect(getPublishedThemes().map((theme) => theme.id)).not.toContain(
      "spiritualites"
    );
  });

  // @req REQ-114
  it("searches accents and case consistently without escaping the selected theme", () => {
    expect(
      getDossiers({ query: "DONNE" }).map((dossier) => dossier.id)
    ).toEqual(["nommer"]);
    expect(getDossiers({ theme: "spiritualites", query: "nom" })).toEqual([]);
    expect(getDossiers({ query: "no-such-dossier" })).toEqual([]);
  });

  // @req REQ-114
  it("links several fiche kinds to the shared dossier only in the relevant section", () => {
    const country = getFicheDossiers({
      kind: "country",
      id: "COD",
      section: "etymology",
    });
    const people = getFicheDossiers({
      kind: "people",
      id: "PPL_KONGO",
      section: "appellations",
    });
    expect(country[0].href).toBe(people[0].href);
    expect(
      getFicheDossiers({ kind: "country", id: "COD", section: "kingdoms" })
    ).toEqual([]);
    expect(
      getFicheDossiers(
        { kind: "country", id: "COD", section: "etymology" },
        { nommer: false }
      )
    ).toEqual([]);
  });
});
