import { describe, expect, it } from "vitest";

import { parseHighlightedSnippet } from "../highlight";

describe("parseHighlightedSnippet", () => {
  // @req REQ-002
  it("splits a delimited snippet into marked and unmarked segments", () => {
    expect(
      parseHighlightedSnippet("le peuple [[Bété]] de Côte d'Ivoire")
    ).toEqual([
      { text: "le peuple ", marked: false },
      { text: "Bété", marked: true },
      { text: " de Côte d'Ivoire", marked: false },
    ]);
  });

  // @req REQ-002
  it("returns a single plain segment when nothing is delimited", () => {
    expect(parseHighlightedSnippet("aucun terme apparié")).toEqual([
      { text: "aucun terme apparié", marked: false },
    ]);
  });

  // @req REQ-002
  it("marks every occurrence when several terms match", () => {
    const segments = parseHighlightedSnippet("[[Bété]] et [[Béti]]");
    expect(segments.filter((segment) => segment.marked)).toEqual([
      { text: "Bété", marked: true },
      { text: "Béti", marked: true },
    ]);
  });

  // @req REQ-002
  it("treats an unbalanced opening delimiter as plain text", () => {
    expect(parseHighlightedSnippet("le [[Bété sans fermeture")).toEqual([
      { text: "le [[Bété sans fermeture", marked: false },
    ]);
  });

  // @req REQ-002
  it("never emits an empty segment", () => {
    const segments = parseHighlightedSnippet("[[Bété]][[Béti]]");
    expect(segments.every((segment) => segment.text.length > 0)).toBe(true);
    expect(segments).toHaveLength(2);
  });

  // @req REQ-002
  it("returns nothing for an empty snippet", () => {
    expect(parseHighlightedSnippet("")).toEqual([]);
  });
});
