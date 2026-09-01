import { describe, expect, it } from "vitest";

import * as routing from "@/lib/routing";
import {
  PAGE_TYPES,
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getPageFromRoute,
  getPeopleLinksRoute,
  getPeopleRoute,
  resolveCountryDeepLink,
  resolveFamilyDeepLink,
  resolvePeopleDeepLink,
} from "@/lib/routing";

describe("entity routes (ContextTriad, ETNI-818)", () => {
  // @req REQ-091
  it("builds a localized country fiche href", () => {
    expect(getCountryRoute("fr", "NGA")).toBe("/fr/atlas/pays/NGA");
  });

  // @req REQ-091
  it("builds a localized language-family fiche href", () => {
    expect(getFamilyRoute("fr", "FLG_NIGER_CONGO")).toBe(
      "/fr/atlas/familles/FLG_NIGER_CONGO"
    );
  });

  // @req REQ-097
  it("builds a localized people fiche href", () => {
    expect(getPeopleRoute("fr", "PPL_YORUBA")).toBe(
      "/fr/atlas/peuples/PPL_YORUBA"
    );
  });

  // @req REQ-097 FR72
  it("builds a localized people links (liens) fiche href", () => {
    expect(getPeopleLinksRoute("fr", "PPL_YORUBA")).toBe(
      "/fr/atlas/peuples/PPL_YORUBA/liens"
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
    expect(getLocalizedRoute("fr", "migrations")).toBe(
      "/fr/dossiers/migrations"
    );
  });

  // @req REQ-101 FR81
  it("resolves the migrations page type from the migrations slug", () => {
    expect(getPageFromRoute("/fr/dossiers/migrations")).toBe("migrations");
  });
});

describe("quiz page type (Epic 10, Story 10.8, ETNI-497)", () => {
  // @req REQ-103 FR66
  it("resolves the French slug for the quiz page type", () => {
    expect(getLocalizedRoute("fr", "quiz")).toBe("/fr/jeux/quiz");
  });

  // @req REQ-103 FR66
  it("resolves the quiz page type from the quiz slug", () => {
    expect(getPageFromRoute("/fr/jeux/quiz")).toBe("quiz");
  });
});

describe("access-mode hub page types (REQ-114)", () => {
  // @req REQ-114
  it("resolves the French slug for each hub page type", () => {
    expect(getLocalizedRoute("fr", "atlasHub")).toBe("/fr/atlas");
    expect(getLocalizedRoute("fr", "dossiersHub")).toBe("/fr/dossiers");
    expect(getLocalizedRoute("fr", "jeuxHub")).toBe("/fr/jeux");
  });

  // @req REQ-114
  it("round-trips each hub slug back to its page type", () => {
    expect(getPageFromRoute("/fr/atlas")).toBe("atlasHub");
    expect(getPageFromRoute("/fr/dossiers")).toBe("dossiersHub");
    expect(getPageFromRoute("/fr/jeux")).toBe("jeuxHub");
  });

  // The axis slug is a verb and the resource slug a noun, so the two can
  // no longer shadow each other the way peuples-hub/peuples once could.
  // @req REQ-114
  it("keeps an axis route distinct from the resource pages it groups", () => {
    expect(getPageFromRoute("/fr/atlas/peuples")).toBe("peoples");
    expect(getPageFromRoute("/fr/atlas/peuples/PPL_YORUBA")).toBe("peoples");
    expect(getPageFromRoute("/fr/atlas")).toBe("atlasHub");
  });
});

describe("colonization page type (Epic 13, Story 13.9, ETNI-533, FR90)", () => {
  // @req REQ-091 FR90
  it("resolves the French-only nested slug for the colonization page type", () => {
    expect(getLocalizedRoute("fr", "colonization")).toBe(
      "/fr/dossiers/regards/colonisation-et-resistances"
    );
  });

  // @req REQ-091 FR90
  it("resolves the colonization page type from its multi-segment slug", () => {
    expect(
      getPageFromRoute("/fr/dossiers/regards/colonisation-et-resistances")
    ).toBe("colonization");
  });

  // Before the modules nested, this answered null: no slug owned `regards`
  // on its own. It now answers the hub, because `comprendre/regards` really
  // is inside Comprendre — the directory just holds no page of its own. What
  // the assertion is here to protect is unchanged and is the half that could
  // mislead a reader: a bare directory is not the article underneath it.
  // @req REQ-091 FR90
  it("answers the hub, not the article, for the bare /fr/dossiers/regards directory", () => {
    expect(getPageFromRoute("/fr/dossiers/regards")).toBe("dossiersHub");
    expect(getPageFromRoute("/fr/dossiers/regards")).not.toBe("colonization");
  });
});

describe("people deep link (the retired ?people= directory form)", () => {
  // @req REQ-097
  it("sends a people query to that people's fiche", () => {
    expect(resolvePeopleDeepLink("fr", { people: "PPL_YORUBA" })).toBe(
      "/fr/atlas/peuples/PPL_YORUBA"
    );
  });

  // @req REQ-097
  it("leaves a directory with no people query alone", () => {
    expect(resolvePeopleDeepLink("fr", {})).toBeNull();
    expect(resolvePeopleDeepLink("fr", { people: "" })).toBeNull();
  });

  // @req REQ-097
  it("ignores a repeated people query rather than picking one of them", () => {
    expect(
      resolvePeopleDeepLink("fr", { people: ["PPL_YORUBA", "PPL_ZULU"] })
    ).toBeNull();
  });

  // @req REQ-097
  it("does not answer for another entity's query", () => {
    expect(resolvePeopleDeepLink("fr", { country: "NGA" })).toBeNull();
  });

  // Same guard as the country form: two leading slashes make a browser read
  // the rest as a host, so an unencoded identifier would make this an open
  // redirect.
  // @req REQ-097
  it("encodes the identifier, so a crafted query cannot leave the site", () => {
    expect(resolvePeopleDeepLink("fr", { people: "//evil.com" })).toBe(
      "/fr/atlas/peuples/%2F%2Fevil.com"
    );
  });
});

describe("country deep link (the retired ?country= directory form)", () => {
  // @req REQ-091
  it("sends a country query to that country's fiche", () => {
    expect(resolveCountryDeepLink("fr", { country: "NGA" })).toBe(
      "/fr/atlas/pays/NGA"
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
      "/fr/atlas/pays/%2F%2Fevil.com"
    );
  });

  // An unknown identifier is not this function's business: the fiche route
  // answers it with a 404, which is honest. Validating the shape here would
  // swallow a typo into the directory listing instead.
  // @req REQ-091
  it("forwards an identifier it does not recognise", () => {
    expect(resolveCountryDeepLink("fr", { country: "XYZ" })).toBe(
      "/fr/atlas/pays/XYZ"
    );
  });
});

describe("family deep link (the retired ?family= directory form)", () => {
  // @req REQ-091
  it("sends a family query to that family's fiche", () => {
    expect(resolveFamilyDeepLink("fr", { family: "FLG_NIGER_CONGO" })).toBe(
      "/fr/atlas/familles/FLG_NIGER_CONGO"
    );
  });

  // @req REQ-091
  it("leaves a directory with no family query alone", () => {
    expect(resolveFamilyDeepLink("fr", {})).toBeNull();
    expect(resolveFamilyDeepLink("fr", { family: "" })).toBeNull();
  });

  // @req REQ-091
  it("ignores a repeated family query rather than picking one of them", () => {
    expect(
      resolveFamilyDeepLink("fr", { family: ["FLG_NILO_SAHARAN", "FLG_KHOE"] })
    ).toBeNull();
  });

  // The families directory read its own query and forwarded the identifier
  // raw, which is the open redirect the country and people forms had already
  // closed. Sharing their resolver is what closes it here too.
  // @req REQ-091
  it("encodes the identifier, so a crafted query cannot leave the site", () => {
    expect(resolveFamilyDeepLink("fr", { family: "//evil.com" })).toBe(
      "/fr/atlas/familles/%2F%2Fevil.com"
    );
  });
});

describe("deep links read from a URLSearchParams", () => {
  // A client component gets its query as URLSearchParams, a server component
  // as a plain object. One resolver reads both shapes, so the encoding rule
  // cannot be reimplemented — badly — on the client side of the same
  // redirect, which is exactly how the families directory came to forward
  // `?family=` raw.
  // @req REQ-091
  it("resolves each entity's fiche from a URLSearchParams", () => {
    expect(
      resolveCountryDeepLink("fr", new URLSearchParams("country=NGA"))
    ).toBe("/fr/atlas/pays/NGA");
    expect(
      resolvePeopleDeepLink("fr", new URLSearchParams("people=PPL_YORUBA"))
    ).toBe("/fr/atlas/peuples/PPL_YORUBA");
    expect(
      resolveFamilyDeepLink("fr", new URLSearchParams("family=FLG_KHOE"))
    ).toBe("/fr/atlas/familles/FLG_KHOE");
  });

  // @req REQ-091
  it("applies the same encoding rule to a URLSearchParams query", () => {
    expect(
      resolveFamilyDeepLink("fr", new URLSearchParams("family=//evil.com"))
    ).toBe("/fr/atlas/familles/%2F%2Fevil.com");
  });

  // @req REQ-091
  it("ignores an absent, empty or repeated URLSearchParams query", () => {
    expect(resolveCountryDeepLink("fr", new URLSearchParams())).toBeNull();
    expect(
      resolveCountryDeepLink("fr", new URLSearchParams("country="))
    ).toBeNull();
    expect(
      resolveCountryDeepLink(
        "fr",
        new URLSearchParams("country=NGA&country=KEN")
      )
    ).toBeNull();
  });
});

describe("page-type round trip", () => {
  // The contract the URL migration rests on: every page is addressed by one
  // slug, and that slug names the page back. Nesting a slug under an axis
  // segment preserves it only while the longest-match rule keeps picking the
  // deepest one, and this is what will say so when it stops.
  // @req REQ-091
  it("resolves every page type back from the route it builds", () => {
    for (const page of PAGE_TYPES) {
      expect(getPageFromRoute(getLocalizedRoute("fr", page))).toBe(page);
    }
  });

  // @req REQ-091
  it("keeps a page's sub-routes on that page", () => {
    for (const page of PAGE_TYPES) {
      expect(
        getPageFromRoute(`${getLocalizedRoute("fr", page)}/PPL_YORUBA`)
      ).toBe(page);
    }
  });

  // @req REQ-091
  it("gives every page type a slug of its own", () => {
    const routes = PAGE_TYPES.map((page) => getLocalizedRoute("fr", page));
    expect(new Set(routes).size).toBe(PAGE_TYPES.length);
  });

  // A helper answering "which page is this" with the pathname's second
  // segment is wrong the moment a page lives under an axis: it would answer
  // "atlas" for every Explorer page. Nothing may bring it back.
  // @req REQ-091
  it("exposes no helper that reads a page from a bare path segment", () => {
    expect(Object.keys(routing)).not.toContain("getSlugFromRoute");
  });
});
