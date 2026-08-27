import { describe, expect, it } from "vitest";

import {
  getCountryRoute,
  getFamilyRoute,
  getPeopleRoute,
  getPeopleLinksRoute,
  getLocalizedRoute,
  getPageFromRoute,
  resolveCountryDeepLink,
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

describe("access-mode hub page types (REQ-114)", () => {
  // @req REQ-114
  it("resolves the French slug for each hub page type", () => {
    expect(getLocalizedRoute("fr", "explorerHub")).toBe("/fr/explorer");
    expect(getLocalizedRoute("fr", "comprendreHub")).toBe("/fr/comprendre");
    expect(getLocalizedRoute("fr", "jouerHub")).toBe("/fr/jouer");
  });

  // @req REQ-114
  it("round-trips each hub slug back to its page type", () => {
    expect(getPageFromRoute("/fr/explorer")).toBe("explorerHub");
    expect(getPageFromRoute("/fr/comprendre")).toBe("comprendreHub");
    expect(getPageFromRoute("/fr/jouer")).toBe("jouerHub");
  });

  // The axis slug is a verb and the resource slug a noun, so the two can
  // no longer shadow each other the way peuples-hub/peuples once could.
  // @req REQ-114
  it("keeps an axis route distinct from the resource pages it groups", () => {
    expect(getPageFromRoute("/fr/peuples")).toBe("peoples");
    expect(getPageFromRoute("/fr/peuples/PPL_YORUBA")).toBe("peoples");
    expect(getPageFromRoute("/fr/explorer")).toBe("explorerHub");
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

describe("country deep link (the retired ?country= directory form)", () => {
  // @req REQ-091
  it("sends a country query to that country's fiche", () => {
    expect(resolveCountryDeepLink("fr", { country: "NGA" })).toBe(
      "/fr/pays/NGA"
    );
  });

  // @req REQ-091
  it("leaves a directory with no country query alone", () => {
    expect(resolveCountryDeepLink("fr", {})).toBeNull();
    expect(resolveCountryDeepLink("fr", { country: "" })).toBeNull();
  });

  // @req REQ-091
  it("ignores a repeated country query rather than picking one of them", () => {
    expect(
      resolveCountryDeepLink("fr", { country: ["NGA", "KEN"] })
    ).toBeNull();
  });

  // @req REQ-091
  it("does not answer for another entity's query", () => {
    expect(resolveCountryDeepLink("fr", { people: "PPL_YORUBA" })).toBeNull();
  });

  // Two leading slashes make a browser read the rest as a host, so an
  // unencoded identifier would turn this redirect into an open one. The
  // encoding is the guard, and this is what keeps it.
  // @req REQ-091
  it("encodes the identifier, so a crafted query cannot leave the site", () => {
    expect(resolveCountryDeepLink("fr", { country: "//evil.com" })).toBe(
      "/fr/pays/%2F%2Fevil.com"
    );
  });

  // An unknown identifier is not this function's business: the fiche route
  // answers it with a 404, which is honest. Validating the shape here would
  // swallow a typo into the directory listing instead.
  // @req REQ-091
  it("forwards an identifier it does not recognise", () => {
    expect(resolveCountryDeepLink("fr", { country: "XYZ" })).toBe(
      "/fr/pays/XYZ"
    );
  });
});
