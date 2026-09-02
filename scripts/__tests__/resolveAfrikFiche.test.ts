import { describe, expect, it } from "vitest";

import { resolveAfrikFiche } from "../resolveAfrikFiche";

describe("resolveAfrikFiche", () => {
  // The curator skill's first phase is "turn what the user typed into a fiche
  // identifier". It used to do that through searchAfrikAll, which no longer
  // exists, so the phase raised before the skill read anything. Resolution now
  // reads the corpus in git — the same files the curator goes on to edit — so it
  // needs no credentials and does not depend on a database being loaded.
  // @req REQ-032
  it("resolves a French exonym to the people it names", () => {
    const matches = resolveAfrikFiche("Zoulou");

    expect(matches[0]).toMatchObject({ id: "PPL_ZULU", kind: "people" });
  });

  // Accents are the common case in French and the corpus is inconsistent about
  // them: the Zulu fiche's own prose writes "Zoulou" while other fiches carry
  // unaccented transcriptions.
  // @req REQ-032
  it("folds accents and case rather than requiring the exact spelling", () => {
    expect(resolveAfrikFiche("afrique du sud")[0]).toMatchObject({
      id: "ZAF",
      kind: "country",
    });
    expect(resolveAfrikFiche("AFRIQUE DU SUD")[0]).toMatchObject({ id: "ZAF" });
  });

  // The endonym is the decolonial posture's load-bearing field, so a reader who
  // types it must reach the fiche as directly as one who types the exonym.
  // @req REQ-032
  it("resolves an autonym as readily as an exonym", () => {
    expect(resolveAfrikFiche("amaZulu")[0]).toMatchObject({ id: "PPL_ZULU" });
  });

  // @req REQ-032
  it("resolves families and languages, not only peoples and countries", () => {
    expect(resolveAfrikFiche("Bantou")).toContainEqual(
      expect.objectContaining({ id: "FLG_BANTU", kind: "family" })
    );
    expect(resolveAfrikFiche("Bambara")).toContainEqual(
      expect.objectContaining({ id: "bam", kind: "language" })
    );
  });

  // An identifier typed straight in must short-circuit, so the curator can be
  // handed "PPL_ZULU" and not have to disambiguate a name it never asked about.
  // @req REQ-032
  it("returns a single match when handed an identifier", () => {
    const matches = resolveAfrikFiche("PPL_ZULU");

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ id: "PPL_ZULU", matchedOn: "id" });
  });

  // Ranking is the whole value: a partial hit must never outrank an exact one,
  // or the curator confirms the wrong fiche and edits it.
  // @req REQ-032
  it("ranks an exact name above a fiche that merely contains it", () => {
    const matches = resolveAfrikFiche("Zulu");

    expect(matches[0].id).toBe("PPL_ZULU");
    expect(matches[0].matchType).toBe("exact");
  });

  // French plurals are the everyday way of naming a people, and the corpus
  // declares families in the singular. "Bantous" is the skill's own worked
  // example, and it reached nothing until containment worked both ways.
  // @req REQ-032
  it("resolves a French plural onto the singular the corpus declares", () => {
    expect(resolveAfrikFiche("Bantous")).toContainEqual(
      expect.objectContaining({ id: "FLG_BANTU", matchType: "partial" })
    );
  });

  // The looser direction must stay strictly below the tighter ones, or a
  // fiche whose name is merely contained in the query outranks the fiche the
  // query names outright.
  // @req REQ-032
  it("ranks a plural fallback below every exact match", () => {
    const matches = resolveAfrikFiche("Zulu");

    expect(matches[0].matchType).toBe("exact");
    const firstPartial = matches.findIndex(
      ({ matchType }) => matchType === "partial"
    );
    const lastExact = matches
      .map(({ matchType }) => matchType)
      .lastIndexOf("exact");
    if (firstPartial !== -1) {
      expect(firstPartial).toBeGreaterThan(lastExact);
    }
  });

  // Silence would be read as "no such people". Saying nothing matched is what
  // sends the curator to ask rather than to invent.
  // @req REQ-032
  it("returns nothing rather than a guess when no declared name matches", () => {
    expect(resolveAfrikFiche("Nechercherienducorpus")).toEqual([]);
  });

  // @req REQ-032
  it("reports which declared name produced the match", () => {
    const [zulu] = resolveAfrikFiche("amaZulu");

    expect(zulu.matchedOn).toBe("selfAppellation");
    expect(zulu.matchedValue).toBe("amaZulu");
  });
});
