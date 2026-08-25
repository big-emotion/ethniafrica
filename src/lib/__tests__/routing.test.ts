import { describe, expect, it } from "vitest";

import {
  getCountryRoute,
  getFamilyRoute,
  getPeopleRoute,
  getPeopleLinksRoute,
  getLocalizedRoute,
  getPageFromRoute,
} from "@/lib/routing";

describe("entity routes (ContextTriad, ETNI-818)", () => {
  // @req REQ-091
  it("builds a localized country fiche href", () => {
    expect(getCountryRoute("fr", "NGA")).toBe("/fr/pays/NGA");
  });

  // @req REQ-091
  it("builds a localized language-family fiche href", () => {
    expect(getFamilyRoute("fr", "FLG_NIGER_CONGO")).toBe(
      "/fr/familles/FLG_NIGER_CONGO"
    );
  });

  // @req REQ-097
  it("builds a localized people fiche href", () => {
    expect(getPeopleRoute("fr", "PPL_YORUBA")).toBe("/fr/peuples/PPL_YORUBA");
  });

  // @req REQ-097 FR72
  it("builds a localized people links (liens) fiche href", () => {
    expect(getPeopleLinksRoute("fr", "PPL_YORUBA")).toBe(
      "/fr/peuples/PPL_YORUBA/liens"
    );
  });
});

describe("compare page type (ETNI-481)", () => {
  // @req REQ-091
  it("resolves the French slug for the compare page type", () => {
    expect(getLocalizedRoute("fr", "compare")).toBe("/fr/comparer");
  });

  // @req REQ-091
  it("resolves the compare page type from the comparer slug", () => {
    expect(getPageFromRoute("/fr/comparer")).toBe("compare");
  });

  // @req REQ-091
  it("resolves the compare page type from a comparison URL", () => {
    expect(getPageFromRoute("/fr/comparer/peuples/PPL_YORUBA/PPL_ZULU")).toBe(
      "compare"
    );
  });
});

describe("migrations page type (Epic 12, Story 12.8, ETNI-521)", () => {
  // @req REQ-101 FR81
  it("resolves the French slug for the migrations page type", () => {
    expect(getLocalizedRoute("fr", "migrations")).toBe("/fr/migrations");
  });

  // @req REQ-101 FR81
  it("resolves the migrations page type from the migrations slug", () => {
    expect(getPageFromRoute("/fr/migrations")).toBe("migrations");
  });
});

describe("quiz page type (Epic 10, Story 10.8, ETNI-497)", () => {
  // @req REQ-103 FR66
  it("resolves the French slug for the quiz page type", () => {
    expect(getLocalizedRoute("fr", "quiz")).toBe("/fr/quiz");
  });

  // @req REQ-103 FR66
  it("resolves the quiz page type from the quiz slug", () => {
    expect(getPageFromRoute("/fr/quiz")).toBe("quiz");
  });
});

describe("colonization page type (Epic 13, Story 13.9, ETNI-533, FR90)", () => {
  // @req REQ-091 FR90
  it("resolves the French-only nested slug for the colonization page type", () => {
    expect(getLocalizedRoute("fr", "colonization")).toBe(
      "/fr/regards/colonisation-et-resistances"
    );
  });

  // @req REQ-091 FR90
  it("resolves the colonization page type from its multi-segment slug", () => {
    expect(getPageFromRoute("/fr/regards/colonisation-et-resistances")).toBe(
      "colonization"
    );
  });

  // @req REQ-091 FR90
  it("does not mistake a bare /fr/regards route for the colonization page type", () => {
    expect(getPageFromRoute("/fr/regards")).toBeNull();
  });
});
