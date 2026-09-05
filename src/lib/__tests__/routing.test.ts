import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/locale";
import * as routing from "@/lib/routing";
import {
  COMPARE_ENTITY_SEGMENTS,
  NOMMER_CHAPTER_KEYS,
  NOMMER_CHAPTER_SLUGS,
  PAGE_TYPES,
  PUBLISHED_LOCALES,
  STATIC_PAGE_SLUGS,
  getCountryRoute,
  getFamilyRoute,
  getLanguageFromRoute,
  getLocalizedRoute,
  getNommerChapterRoute,
  getPageFromRoute,
  getPatronymeRoute,
  getPeopleLinksRoute,
  getPeopleRoute,
  getPersonRoute,
  getSourceRoute,
  getStaticPageRoute,
  localeSlugMismatch,
  resolveCountryDeepLink,
  resolveFamilyDeepLink,
  resolvePeopleDeepLink,
  toRouteFilePath,
  translatePath,
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

  // @req REQ-133
  it("builds a localized patronyme fiche href", () => {
    expect(getPatronymeRoute("fr", "PAT_KEITA")).toBe(
      "/fr/atlas/noms/PAT_KEITA"
    );
  });

  // @req REQ-126
  it("builds a localized person fiche href", () => {
    expect(getPersonRoute("fr", "PER_DELAFOSSE")).toBe(
      "/fr/atlas/personnes/PER_DELAFOSSE"
    );
  });

  /**
   * Sources carry no axis prefix — no hub lists them, so nesting one would
   * invent an ancestor the menu never offers.
   */
  // @req REQ-092
  it("builds a source href on the identifier, without an axis prefix", () => {
    expect(getSourceRoute("fr", "11111111-1111-1111-1111-111111111111")).toBe(
      "/fr/sources/11111111-1111-1111-1111-111111111111"
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

describe("the Nommer dossier and its chapters (REQ-091)", () => {
  // @req REQ-091
  it("resolves the nested slug for the dossier's pillar page", () => {
    expect(getLocalizedRoute("fr", "nommer")).toBe("/fr/dossiers/nommer");
  });

  // @req REQ-091
  it("resolves the glossary at the root, on no axis", () => {
    expect(getLocalizedRoute("fr", "glossary")).toBe("/fr/glossaire");
  });

  // @req REQ-091
  it("composes a chapter route under the pillar", () => {
    expect(getNommerChapterRoute("fr", "le-peuple")).toBe(
      "/fr/dossiers/nommer/le-peuple"
    );
    expect(getNommerChapterRoute("fr", "la-chose")).toBe(
      "/fr/dossiers/nommer/la-chose"
    );
  });

  // A chapter is not a page type, so the longest-slug sort has to answer the
  // pillar for it. That is what keeps the module marked current in the header
  // while a chapter is being read, and what gives `deriveTrail` an axis crumb
  // to hang the chapter segment from.
  // @req REQ-091
  it("answers the pillar, not the axis, for a chapter URL", () => {
    expect(getPageFromRoute("/fr/dossiers/nommer/le-peuple")).toBe("nommer");
    expect(getPageFromRoute("/fr/dossiers/nommer/la-langue")).toBe("nommer");
  });

  // @req REQ-091
  it("declares the five chapters in reading order", () => {
    expect(NOMMER_CHAPTER_KEYS).toEqual([
      "le-peuple",
      "le-pays",
      "la-personne",
      "la-langue",
      "la-chose",
    ]);
  });

  // Every key has to resolve to a slug, or a chapter would compose a route
  // ending in `undefined` — which renders a 404 rather than failing loudly.
  // @req REQ-091
  it("gives every chapter key a slug", () => {
    for (const key of NOMMER_CHAPTER_KEYS) {
      expect(NOMMER_CHAPTER_SLUGS.fr[key]).toBeTruthy();
    }
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

// ---------------------------------------------------------------------------
// English slugs (DEC-049, REQ-141)
// ---------------------------------------------------------------------------

describe("English slugs (DEC-049)", () => {
  // The URL words are permanent — a 308 forever — so each one is pinned
  // rather than compared to itself through the helper.
  // @req REQ-141
  it("gives every page type its English segment", () => {
    const expected: Record<string, string> = {
      countries: "/en/atlas/countries",
      families: "/en/atlas/families",
      peoples: "/en/atlas/peoples",
      languages: "/en/atlas/languages",
      search: "/en/atlas/search",
      names: "/en/atlas/ethnonyms",
      patronymes: "/en/atlas/names",
      compare: "/en/compare",
      migrations: "/en/dossiers/migrations",
      anecdotes: "/en/dossiers/anecdotes",
      quiz: "/en/games/quiz",
      colonization: "/en/dossiers/perspectives/colonisation-and-resistances",
      nommer: "/en/dossiers/naming",
      glossary: "/en/glossary",
      doctrine: "/en/doctrine",
      about: "/en/about",
      sources: "/en/sources",
      atlasHub: "/en/atlas",
      dossiersHub: "/en/dossiers",
      jeuxHub: "/en/games",
    };
    expect(Object.keys(expected).sort()).toEqual([...PAGE_TYPES].sort());
    for (const page of PAGE_TYPES) {
      expect(getLocalizedRoute("en", page)).toBe(expected[page]);
    }
  });

  // @req REQ-141
  it("keeps the French vocabulary byte-identical", () => {
    expect(getLocalizedRoute("fr", "countries")).toBe("/fr/atlas/pays");
    expect(getLocalizedRoute("fr", "names")).toBe("/fr/atlas/appellations");
    expect(getLocalizedRoute("fr", "patronymes")).toBe("/fr/atlas/noms");
    expect(getLocalizedRoute("fr", "jeuxHub")).toBe("/fr/jeux");
  });

  // @req REQ-141
  it("composes the English sub-routes", () => {
    expect(getPersonRoute("en", "PER_DELAFOSSE")).toBe(
      "/en/atlas/persons/PER_DELAFOSSE"
    );
    expect(getPeopleLinksRoute("en", "PPL_YORUBA")).toBe(
      "/en/atlas/peoples/PPL_YORUBA/links"
    );
    expect(getPatronymeRoute("en", "PAT_KEITA")).toBe(
      "/en/atlas/names/PAT_KEITA"
    );
    expect(getNommerChapterRoute("en", "le-peuple")).toBe(
      "/en/dossiers/naming/the-people"
    );
    expect(getNommerChapterRoute("en", "la-chose")).toBe(
      "/en/dossiers/naming/the-thing"
    );
  });

  // @req REQ-141
  it("names the five chapters in English", () => {
    expect(NOMMER_CHAPTER_SLUGS.en).toEqual({
      "le-peuple": "the-people",
      "le-pays": "the-country",
      "la-personne": "the-person",
      "la-langue": "the-language",
      "la-chose": "the-thing",
    });
  });

  // @req REQ-141
  it("publishes the same locales the locale module does", () => {
    expect([...PUBLISHED_LOCALES].sort()).toEqual([...LOCALES].sort());
  });

  // @req REQ-141
  it("resolves every page type back from its route in both locales", () => {
    for (const language of LOCALES) {
      for (const page of PAGE_TYPES) {
        expect(getPageFromRoute(getLocalizedRoute(language, page))).toBe(page);
        expect(
          getPageFromRoute(`${getLocalizedRoute(language, page)}/PPL_YORUBA`)
        ).toBe(page);
      }
    }
  });

  // A French slug under /en resolves to the hub whose prefix it shares, not
  // to the page it names in the other locale — a locale's table is its own.
  // @req REQ-141
  it("resolves a page within the route's own locale, never across", () => {
    expect(getPageFromRoute("/en/atlas/peoples")).toBe("peoples");
    expect(getPageFromRoute("/en/atlas/pays")).toBe("atlasHub");
    expect(getPageFromRoute("/fr/atlas/countries")).toBe("atlasHub");
    expect(getPageFromRoute("/en/games/quiz")).toBe("quiz");
    expect(getPageFromRoute("/fr/games/quiz")).toBeNull();
  });

  // @req REQ-141
  it("reads either locale off a route and nothing else", () => {
    expect(getLanguageFromRoute("/en/atlas/peoples")).toBe("en");
    expect(getLanguageFromRoute("/fr")).toBe("fr");
    expect(getLanguageFromRoute("/es/pays")).toBeNull();
    expect(getLanguageFromRoute("/")).toBeNull();
  });

  // @req REQ-141
  it("gives no two page types the same slug within a locale", () => {
    for (const language of LOCALES) {
      const routes = PAGE_TYPES.map((page) =>
        getLocalizedRoute(language, page)
      );
      expect(new Set(routes).size).toBe(PAGE_TYPES.length);
    }
  });
});

describe("static pages outside the page types (REQ-141)", () => {
  // @req REQ-141
  it("addresses each static page in both locales", () => {
    expect(STATIC_PAGE_SLUGS.fr).toEqual({
      legalNotice: "mentions-legales",
      dataPolicy: "politique-de-donnees",
      accessibility: "accessibilite",
      sitemap: "plan-du-site",
      reports: "signalements",
      contact: "contact",
      contribute: "contribute",
      reportError: "report-error",
      admin: "admin",
    });
    expect(STATIC_PAGE_SLUGS.en).toEqual({
      legalNotice: "legal-notice",
      dataPolicy: "data-policy",
      accessibility: "accessibility",
      sitemap: "sitemap",
      reports: "reports",
      contact: "contact",
      contribute: "contribute",
      reportError: "report-error",
      admin: "admin",
    });
  });

  // @req REQ-141
  it("composes a static page route", () => {
    expect(getStaticPageRoute("fr", "legalNotice")).toBe(
      "/fr/mentions-legales"
    );
    expect(getStaticPageRoute("en", "legalNotice")).toBe("/en/legal-notice");
    expect(getStaticPageRoute("en", "contact")).toBe("/en/contact");
  });

  // @req REQ-141
  it("names the comparer's entity segment in both locales", () => {
    expect(COMPARE_ENTITY_SEGMENTS.fr).toEqual({
      peoples: "peuples",
      countries: "pays",
      families: "familles",
    });
    expect(COMPARE_ENTITY_SEGMENTS.en).toEqual({
      peoples: "peoples",
      countries: "countries",
      families: "families",
    });
  });
});

describe("translating a path between locales (REQ-141)", () => {
  // @req REQ-141
  it("translates a page route and carries the identifier", () => {
    expect(translatePath("fr", "en", "/fr/atlas/peuples/PPL_YORUBA")).toBe(
      "/en/atlas/peoples/PPL_YORUBA"
    );
    expect(translatePath("en", "fr", "/en/atlas/countries/BEN")).toBe(
      "/fr/atlas/pays/BEN"
    );
  });

  // @req REQ-141
  it("translates the tails below a fiche", () => {
    expect(
      translatePath("fr", "en", "/fr/atlas/peuples/PPL_YORUBA/liens")
    ).toBe("/en/atlas/peoples/PPL_YORUBA/links");
    expect(
      translatePath("en", "fr", "/en/atlas/peoples/PPL_YORUBA/links")
    ).toBe("/fr/atlas/peuples/PPL_YORUBA/liens");
  });

  // @req REQ-141
  it("translates the Nommer chapters", () => {
    expect(translatePath("fr", "en", "/fr/dossiers/nommer/le-peuple")).toBe(
      "/en/dossiers/naming/the-people"
    );
    expect(translatePath("en", "fr", "/en/dossiers/naming/the-language")).toBe(
      "/fr/dossiers/nommer/la-langue"
    );
  });

  // @req REQ-141
  it("translates a person and the comparer's entity segment", () => {
    expect(translatePath("en", "fr", "/en/atlas/persons/PER_X")).toBe(
      "/fr/atlas/personnes/PER_X"
    );
    expect(
      translatePath("fr", "en", "/fr/comparer/peuples/PPL_YORUBA/PPL_ZULU")
    ).toBe("/en/compare/peoples/PPL_YORUBA/PPL_ZULU");
  });

  // @req REQ-141
  it("translates the static pages and leaves a shared word alone", () => {
    expect(translatePath("fr", "en", "/fr/mentions-legales")).toBe(
      "/en/legal-notice"
    );
    expect(translatePath("en", "fr", "/en/sitemap")).toBe("/fr/plan-du-site");
    expect(translatePath("fr", "en", "/fr/contact")).toBe("/en/contact");
    expect(translatePath("fr", "en", "/fr/admin/connexion")).toBe(
      "/en/admin/connexion"
    );
  });

  // @req REQ-141
  it("translates the home and a game under its hub", () => {
    expect(translatePath("fr", "en", "/fr")).toBe("/en");
    expect(translatePath("en", "fr", "/en/games/mercator")).toBe(
      "/fr/jeux/mercator"
    );
    expect(translatePath("fr", "en", "/fr/jeux/quiz/score")).toBe(
      "/en/games/quiz/score"
    );
  });

  // @req REQ-141
  it("carries a tail it has no words for unchanged", () => {
    expect(
      translatePath("fr", "en", "/fr/doctrine/classifications-contestees")
    ).toBe("/en/doctrine/classifications-contestees");
    expect(translatePath("fr", "en", "/fr/atlas/pays/%2F%2Fevil.com")).toBe(
      "/en/atlas/countries/%2F%2Fevil.com"
    );
  });

  // @req REQ-141
  it("leaves a path that is not in the source locale alone", () => {
    expect(translatePath("fr", "en", "/en/atlas/peoples")).toBe(
      "/en/atlas/peoples"
    );
  });
});

describe("the French route folder behind an English path (REQ-141)", () => {
  // Every folder under src/app/[lang] is French; an English address is
  // served by rewriting onto that folder, locale prefix kept.
  // @req REQ-141
  it("maps an English path onto its French folder", () => {
    expect(toRouteFilePath("/en/atlas/countries/BEN")).toBe(
      "/en/atlas/pays/BEN"
    );
    expect(toRouteFilePath("/en/atlas/peoples/PPL_X/links")).toBe(
      "/en/atlas/peuples/PPL_X/liens"
    );
    expect(toRouteFilePath("/en/dossiers/naming/the-people")).toBe(
      "/en/dossiers/nommer/le-peuple"
    );
    expect(toRouteFilePath("/en/games/mercator")).toBe("/en/jeux/mercator");
    expect(toRouteFilePath("/en/legal-notice")).toBe("/en/mentions-legales");
    expect(toRouteFilePath("/en/compare/countries/BEN/NGA")).toBe(
      "/en/comparer/pays/BEN/NGA"
    );
  });

  // @req REQ-141
  it("answers null when there is nothing to rewrite", () => {
    expect(toRouteFilePath("/fr/atlas/pays/BEN")).toBeNull();
    expect(toRouteFilePath("/en/atlas/pays")).toBeNull();
    expect(toRouteFilePath("/en/contact")).toBeNull();
    expect(toRouteFilePath("/en")).toBeNull();
    expect(toRouteFilePath("/es/atlas/countries")).toBeNull();
  });
});

describe("a slug from the other locale's vocabulary (DEC-049)", () => {
  // One document, one address per locale: a French slug under /en is
  // redirected to its English form rather than served a second time.
  // @req REQ-141
  it("names the one-hop target for a French slug under /en", () => {
    expect(localeSlugMismatch("/en/atlas/pays")).toBe("/en/atlas/countries");
    expect(localeSlugMismatch("/en/atlas/pays/BEN")).toBe(
      "/en/atlas/countries/BEN"
    );
    expect(localeSlugMismatch("/en/dossiers/nommer/le-peuple")).toBe(
      "/en/dossiers/naming/the-people"
    );
    expect(localeSlugMismatch("/en/atlas/peuples/PPL_YORUBA/liens")).toBe(
      "/en/atlas/peoples/PPL_YORUBA/links"
    );
    expect(localeSlugMismatch("/en/atlas/peoples/PPL_YORUBA/liens")).toBe(
      "/en/atlas/peoples/PPL_YORUBA/links"
    );
    expect(localeSlugMismatch("/en/mentions-legales")).toBe("/en/legal-notice");
  });

  // @req REQ-141
  it("names the one-hop target for an English slug under /fr", () => {
    expect(localeSlugMismatch("/fr/atlas/countries")).toBe("/fr/atlas/pays");
    expect(localeSlugMismatch("/fr/games/quiz")).toBe("/fr/jeux/quiz");
  });

  // @req REQ-141
  it("answers null for a path already in its own vocabulary", () => {
    expect(localeSlugMismatch("/en/atlas/countries/BEN")).toBeNull();
    expect(localeSlugMismatch("/fr/atlas/pays/BEN")).toBeNull();
    expect(localeSlugMismatch("/en/contact")).toBeNull();
    expect(localeSlugMismatch("/en")).toBeNull();
    expect(localeSlugMismatch("/fr/admin/connexion")).toBeNull();
    expect(localeSlugMismatch("/es/atlas/pays")).toBeNull();
  });
});
