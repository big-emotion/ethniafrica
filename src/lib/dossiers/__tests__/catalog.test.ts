import { getLocalizedRoute } from "@/lib/routing";
import { describe, expect, it } from "vitest";
import { DOSSIER_THEMES } from "@/lib/dossiers/themes";
import {
  getDossiers,
  getPublishedThemes,
  getFicheDossiers,
} from "@/lib/dossiers/catalog";

/**
 * The catalog under the freeze.
 *
 * Two things used to be asserted here as one: how the catalog filters, and
 * which modules it happened to hold. The freeze separates them — the long
 * dossiers are withdrawn, so every state assertion below reads the withdrawal
 * — while the mechanics are exercised through `anecdotes`, the one module
 * still published. What the freeze must not do is change how a query is
 * normalised or how a theme resolves, and that is what the second half holds.
 */
describe("shared dossier catalog", () => {
  // @req REQ-114
  it("offers no long dossier while the axis is frozen", () => {
    expect(getDossiers()).toEqual([]);
  });

  // The anecdotes are a reading format of their own, not a dossier, which is
  // why the freeze leaves them standing and why they are asked for by format.
  // @req REQ-114
  it("keeps the anecdotes offered, as their own format", () => {
    expect(
      getDossiers({ format: "anecdote" }).map((dossier) => dossier.id)
    ).toEqual(["anecdotes"]);
  });

  // @req REQ-140
  it("keeps English readers on English routes", () => {
    const entry = getDossiers({ format: "anecdote", language: "en" })[0];
    expect(entry.href).toBe(getLocalizedRoute("en", "anecdotes"));
  });

  // @req REQ-114
  it("bounds navigation to eight unique themes and separates reading formats", () => {
    expect(DOSSIER_THEMES).toHaveLength(8);
    expect(new Set(DOSSIER_THEMES.map((theme) => theme.id)).size).toBe(8);
    expect(
      DOSSIER_THEMES.map((theme) => String(theme.id)).includes("anecdotes")
    ).toBe(false);
  });

  /**
   * A theme is published because a dossier sits under it, so a frozen axis
   * publishes none. This is what takes the eight theme links out of the menu
   * and makes `/fr/dossiers/themes/<id>` answer 404 without a guard of its
   * own — the eight doors close because there is nothing behind them, not
   * because something bolted them shut.
   */
  // @req REQ-106
  it("publishes no theme while every dossier under it is withdrawn", () => {
    expect(getPublishedThemes()).toEqual([]);
  });

  // The measured half still speaks: a module whose corpus answered empty is
  // hidden exactly as a withdrawn one is, which is the ordering `isModuleOffered`
  // exists to keep.
  // @req REQ-106
  it("hides a module whose corpus answered empty", () => {
    expect(getDossiers({ format: "anecdote" }, { anecdotes: false })).toEqual(
      []
    );
    expect(getPublishedThemes({ anecdotes: false })).toEqual([]);
  });

  // Normalisation is the mechanic, not the corpus: accents and case fold, and
  // a query that matches nothing returns nothing rather than everything.
  // @req REQ-114
  it("searches accents and case consistently", () => {
    expect(
      getDossiers({ format: "anecdote", query: "ANECDOTE" }).map(
        (dossier) => dossier.id
      )
    ).toEqual(["anecdotes"]);
    expect(
      getDossiers({ format: "anecdote", query: "sourcees" }).map(
        (dossier) => dossier.id
      )
    ).toEqual(["anecdotes"]);
    expect(
      getDossiers({ format: "anecdote", query: "no-such-dossier" })
    ).toEqual([]);
  });

  // A selected theme bounds the search rather than being escaped by it.
  // @req REQ-114
  it("does not let a query escape the selected theme", () => {
    expect(
      getDossiers({ format: "anecdote", theme: "economies", query: "nom" })
    ).toEqual([]);
  });

  /**
   * The fiche cross-links go silent with the dossier they point at.
   *
   * Six fiche kinds carried a "read the dossier" link into `nommer`. Left
   * standing, each would be a link from a live fiche to a page that answers
   * 404 — the freeze leaking onto surfaces that are not frozen.
   */
  // @req REQ-114
  it("links no fiche to a withdrawn dossier", () => {
    expect(
      getFicheDossiers({ kind: "country", id: "COD", section: "etymology" })
    ).toEqual([]);
    expect(
      getFicheDossiers({
        kind: "people",
        id: "PPL_KONGO",
        section: "appellations",
      })
    ).toEqual([]);
    expect(
      getFicheDossiers({ kind: "country", id: "COD", section: "kingdoms" })
    ).toEqual([]);
  });
});
