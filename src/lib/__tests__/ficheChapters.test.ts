/**
 * The chapter contract a fiche's reading rail rests on.
 *
 * A fiche declares its chapters in one place — the `data-fiche-section`
 * attribute every chapter already carried for the parity contract — and the
 * rail reads them back from the rendered document rather than from a second,
 * hand-maintained list. These tests pin the two halves of that contract: the
 * anchor a title derives, and what a reader of the document gets back.
 */

import { describe, expect, it } from "vitest";

import {
  FICHE_CHAPTER_ATTRIBUTE,
  chapterAnchorId,
  readFicheChapters,
} from "@/lib/ficheChapters";

function fiche(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}

describe("chapterAnchorId", () => {
  // @req REQ-091
  it("derives a stable, diacritic-free anchor from a chapter title", () => {
    expect(chapterAnchorId("Le nom porté, les noms subis")).toBe(
      "chapitre-le-nom-porte-les-noms-subis"
    );
  });

  // @req REQ-091
  it("keeps the ampersand out of the anchor without welding the words together", () => {
    expect(chapterAnchorId("Culture & spiritualité")).toBe(
      "chapitre-culture-spiritualite"
    );
  });

  // @req REQ-091
  it("gives the same title the same anchor on every render", () => {
    const title = "Répartition géographique";
    expect(chapterAnchorId(title)).toBe(chapterAnchorId(title));
  });

  // @req REQ-091
  it("never emits an empty anchor, so a title of punctuation still links", () => {
    expect(chapterAnchorId("« … »")).toBe("chapitre");
  });
});

describe("readFicheChapters", () => {
  // @req REQ-091
  it("returns the chapters in document order, titled by the attribute", () => {
    const root = fiche(`
      <section ${FICHE_CHAPTER_ATTRIBUTE}="Le nom porté" id="chapitre-le-nom-porte"></section>
      <section ${FICHE_CHAPTER_ATTRIBUTE}="Langue" id="chapitre-langue"></section>
      <footer ${FICHE_CHAPTER_ATTRIBUTE}="Sources" id="sources"></footer>
    `);

    expect(readFicheChapters(root).map((chapter) => chapter.title)).toEqual([
      "Le nom porté",
      "Langue",
      "Sources",
    ]);
  });

  // @req REQ-091
  it("keeps the anchor the chapter actually carries, not the one its title would derive", () => {
    const root = fiche(
      `<footer ${FICHE_CHAPTER_ATTRIBUTE}="Sources" id="sources"></footer>`
    );

    // Deep links across the app point at #sources; deriving an anchor here
    // would give the rail a target the rest of the app does not use.
    expect(readFicheChapters(root)[0].id).toBe("sources");
  });

  // @req REQ-091
  it("drops a chapter with no anchor rather than offering a link that goes nowhere", () => {
    const root = fiche(`
      <section ${FICHE_CHAPTER_ATTRIBUTE}="Sans ancre"></section>
      <section ${FICHE_CHAPTER_ATTRIBUTE}="Langue" id="chapitre-langue"></section>
    `);

    expect(readFicheChapters(root).map((chapter) => chapter.title)).toEqual([
      "Langue",
    ]);
  });

  // @req REQ-091
  it("drops a chapter whose title is blank, which would render as an empty rail entry", () => {
    const root = fiche(
      `<section ${FICHE_CHAPTER_ATTRIBUTE}="   " id="chapitre-vide"></section>`
    );

    expect(readFicheChapters(root)).toEqual([]);
  });

  // @req REQ-091
  it("keeps the first of two chapters sharing an anchor, so the rail never lists the same target twice", () => {
    const root = fiche(`
      <section ${FICHE_CHAPTER_ATTRIBUTE}="Langue" id="chapitre-langue"></section>
      <section ${FICHE_CHAPTER_ATTRIBUTE}="Langue" id="chapitre-langue"></section>
    `);

    expect(readFicheChapters(root)).toHaveLength(1);
  });
});
