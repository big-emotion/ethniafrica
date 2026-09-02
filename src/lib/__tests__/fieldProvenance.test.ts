import { describe, expect, it } from "vitest";
import {
  classifyFieldProvenance,
  isStructurallyExpectedField,
  modelChapterKeys,
  resolveChapter,
} from "@/lib/fieldProvenance";

describe("fieldProvenance — classification (REQ-119)", () => {
  // @req REQ-119
  it("classifies an empty structurally-expected field as missing", () => {
    expect(classifyFieldProvenance([])).toEqual({ state: "missing" });
    expect(classifyFieldProvenance({})).toEqual({ state: "missing" });
    expect(classifyFieldProvenance(null)).toEqual({ state: "missing" });
    expect(classifyFieldProvenance(undefined)).toEqual({ state: "missing" });
  });

  // @req REQ-119
  it("classifies a value the fiche's own source declares as declared, never derived", () => {
    expect(classifyFieldProvenance(["Bantou étroit"])).toEqual({
      state: "declared",
    });
    expect(classifyFieldProvenance({ COD: 90000000 })).toEqual({
      state: "declared",
    });
  });

  // @req REQ-119
  it("classifies a value computed from other records as derived and names its origin", () => {
    expect(
      classifyFieldProvenance(undefined, {
        value: { COD: 12 },
        origin: "peuples rattachés à la famille",
      })
    ).toEqual({ state: "derived", origin: "peuples rattachés à la famille" });
  });

  // @req REQ-119
  it("prefers the declared value over a derived one when both are present", () => {
    expect(
      classifyFieldProvenance(["Bantou étroit"], {
        value: { COD: 12 },
        origin: "peuples rattachés à la famille",
      })
    ).toEqual({ state: "declared" });
  });

  // @req REQ-119
  it("falls back to missing when neither the declared nor the derived value carries content", () => {
    expect(
      classifyFieldProvenance([], { value: {}, origin: "peuples" })
    ).toEqual({ state: "missing" });
  });
});

describe("fieldProvenance — structurally-expected resolver (REQ-119)", () => {
  // @req REQ-119
  it("recognises a field declared in the language-family strict model", () => {
    expect(
      isStructurallyExpectedField("language-family", "generalInfo.branches")
    ).toBe(true);
    expect(
      isStructurallyExpectedField(
        "language-family",
        "distribution.distributionByCountry"
      )
    ).toBe(true);
  });

  // @req REQ-119
  it("does not surface a field absent from the model as structurally expected", () => {
    expect(
      isStructurallyExpectedField("language-family", "generalInfo.footprint")
    ).toBe(false);
    expect(
      isStructurallyExpectedField("language-family", "doesNotExist.atAll")
    ).toBe(false);
  });

  // @req REQ-119
  it("resolves fields for the people and country strict models too", () => {
    expect(isStructurallyExpectedField("people", "ethnicities")).toBe(true);
    expect(isStructurallyExpectedField("country", "content.kingdoms")).toBe(
      false
    ); // model paths are relative to `content`, not prefixed with it
    expect(isStructurallyExpectedField("country", "kingdoms")).toBe(true);
  });

  // @req REQ-136
  it("resolves a language field wherever the model puts it, root or content", () => {
    expect(isStructurallyExpectedField("language", "glottocode")).toBe(true);
    expect(isStructurallyExpectedField("language", "content.dialects")).toBe(
      true
    );
    expect(isStructurallyExpectedField("language", "branches")).toBe(false);
  });

  // @req REQ-133
  it("resolves a name field against the patronyme model", () => {
    expect(isStructurallyExpectedField("name", "spellings")).toBe(true);
    expect(isStructurallyExpectedField("name", "alliances")).toBe(true);
    // The key the fiche has been reading for months, which the model never declared.
    expect(isStructurallyExpectedField("name", "attestedForms")).toBe(false);
    expect(isStructurallyExpectedField("name", "filiationClaims")).toBe(false);
  });
});

describe("fiche chapters — the list comes from the strict model (REQ-119)", () => {
  // @req REQ-119
  it("orders a class's chapters as its model declares them", () => {
    expect(modelChapterKeys("country")).toContain("kingdoms");
    expect(modelChapterKeys("people")).toContain("ethnicities");
  });

  // @req REQ-136
  it("gives the language every chapter the corpus fills, not only the four in content", () => {
    const chapters = modelChapterKeys("language");
    for (const key of [
      "isoCode639_3",
      "glottocode",
      "nameEn",
      "alternateNames",
      "spellingAliases",
    ]) {
      expect(chapters).toContain(key);
    }
  });

  // @req REQ-133
  it("gives the name the four chapters its fiche has never rendered", () => {
    const chapters = modelChapterKeys("name");
    for (const key of [
      "sources",
      "alliances",
      "casteOrSocialFunction",
      "homonyms",
    ]) {
      expect(chapters).toContain(key);
    }
  });

  // @req REQ-133
  it("keeps the subtype models' retired vocabulary out of the name's field space", () => {
    // The four per-subtype models still describe `namingSystem`/`attestedForms`,
    // which no dossier has ever written. Only the base model matches the corpus.
    expect(isStructurallyExpectedField("name", "namingSystem")).toBe(false);
    expect(isStructurallyExpectedField("name", "attestedForms")).toBe(false);
    expect(isStructurallyExpectedField("name", "nameSystem")).toBe(true);
    expect(isStructurallyExpectedField("name", "spellings")).toBe(true);
  });

  // @req REQ-133
  it("counts a naming subtype's own fields among the name's, so their gaps resolve", () => {
    // Cited by gaps[] on 4, 4 and 2 dossiers respectively, and declared only
    // by the totemique and nisba models rather than the base one.
    for (const key of [
      "totemicFoodProhibition",
      "permittedGivenNames",
      "nisbaSubtype",
    ]) {
      expect(isStructurallyExpectedField("name", key)).toBe(true);
    }
  });

  // @req REQ-119
  it("never offers the model's own metadata as a chapter", () => {
    for (const kind of [
      "people",
      "country",
      "language-family",
      "language",
      "name",
    ] as const) {
      expect(modelChapterKeys(kind)).not.toContain("_meta");
    }
  });
});

describe("fiche chapters — a documented gap outranks the generic badge (REQ-119)", () => {
  const gaps = [
    { fieldPath: "alliances", reason: "Aucune alliance n'est documentée." },
  ];

  // @req REQ-119
  it("prefers the editor's own reason over the generic missing state", () => {
    expect(resolveChapter("name", "alliances", [], gaps)).toEqual({
      state: "documented-gap",
      reason: "Aucune alliance n'est documentée.",
    });
  });

  // @req REQ-119
  it("falls back to the generic missing state when the corpus explains nothing", () => {
    expect(resolveChapter("name", "homonyms", [], gaps)).toEqual({
      state: "missing",
    });
  });

  // @req REQ-119
  it("never lets a gap note mask a value the corpus actually carries", () => {
    expect(resolveChapter("name", "alliances", ["Traoré"], gaps)).toEqual({
      state: "declared",
    });
  });

  // @req REQ-119
  it("calls a path no model declares not-modelled, never a silent gap", () => {
    // The exact drift the name fiche shipped: the corpus writes `spellings`.
    expect(resolveChapter("name", "attestedForms", [], gaps)).toEqual({
      state: "not-modelled",
    });
  });

  // @req REQ-119
  it("resolves a chapter with no gap list at all", () => {
    expect(resolveChapter("language", "content.dialects", [])).toEqual({
      state: "missing",
    });
  });
});
