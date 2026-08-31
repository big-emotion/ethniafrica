import { describe, expect, it } from "vitest";
import {
  classifyFieldProvenance,
  isStructurallyExpectedField,
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
});
