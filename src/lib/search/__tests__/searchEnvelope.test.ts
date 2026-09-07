import { describe, it, expect } from "vitest";

import {
  buildSearchParams,
  compareByRelevance,
  mapSearchCounts,
  mapSearchEnvelope,
  mapSearchLeads,
} from "@/lib/search/searchEnvelope";
import type { SearchResult } from "@/types/afrik-frontend";

describe("buildSearchParams", () => {
  // @req REQ-002
  it("names the query parameter q, as the route requires", () => {
    const params = buildSearchParams("bété");

    expect(params.get("q")).toBe("bété");
    expect(params.get("query")).toBeNull();
  });

  // @req REQ-002
  it("carries the optional relevance filters through", () => {
    const params = buildSearchParams("bété", {
      limit: 6,
      classificationStatus: "contested",
      minConfidence: "0.5",
    });

    expect(params.get("limit")).toBe("6");
    expect(params.get("classificationStatus")).toBe("contested");
    expect(params.get("minConfidence")).toBe("0.5");
  });

  // @req REQ-002
  it("omits filters that were left empty", () => {
    const params = buildSearchParams("bété", {
      classificationStatus: "",
      minConfidence: "",
    });

    expect(params.get("classificationStatus")).toBeNull();
    expect(params.get("minConfidence")).toBeNull();
  });

  // ETNI-1857: the served locale travels as `lang`, and only when a caller
  // names one — the route reads an absent parameter as French.
  // @req REQ-141
  it("carries the locale as lang and omits it when none is given", () => {
    expect(buildSearchParams("chad", { lang: "en" }).get("lang")).toBe("en");
    expect(buildSearchParams("chad").get("lang")).toBeNull();
  });
});

describe("mapSearchEnvelope — English names (ETNI-1857)", () => {
  // @req REQ-141
  it("carries the English name beside the French one on a country, a family and a language", () => {
    const results = mapSearchEnvelope({
      data: {
        countries: [{ id: "TCD", nameFr: "Tchad", nameEn: "Chad" }],
        families: [{ id: "FLG_KROU", nameFr: "Krou", nameEn: "Kru" }],
        languages: [
          {
            id: "arb",
            name: "Arabe standard moderne",
            nameEn: "Standard Arabic",
            familyId: "FLG_AFRO_ASIATIQUE",
            familyName: "Afro-asiatique",
            familyNameEn: "Afroasiatic",
          },
        ],
      },
    });
    const byType = Object.fromEntries(results.map((r) => [r.type, r]));

    expect(byType.country.name).toBe("Tchad");
    expect(byType.country.nameEn).toBe("Chad");
    expect(byType.languageFamily.name).toBe("Krou");
    expect(byType.languageFamily.nameEn).toBe("Kru");
    expect(byType.language.nameEn).toBe("Standard Arabic");
    expect(byType.language.languageFamilyNameEn).toBe("Afroasiatic");
  });

  // @req REQ-141
  it("carries the family's English name on a people row", () => {
    const [people] = mapSearchEnvelope({
      data: {
        peoples: [
          {
            id: "PPL_BETE",
            nameMain: "Bété",
            languageFamilyId: "FLG_KROU",
            languageFamilyName: "Krou",
            languageFamilyNameEn: "Kru",
          },
        ],
      },
    });

    expect(people.languageFamilyName).toBe("Krou");
    expect(people.languageFamilyNameEn).toBe("Kru");
  });

  // The column is empty until the corpus reload: a blank must read as
  // "no English name", never as an empty label a card would print.
  // @req REQ-141
  it("leaves the English names undefined when the API sends null or nothing", () => {
    const results = mapSearchEnvelope({
      data: {
        peoples: [
          { id: "PPL_BETE", nameMain: "Bété", languageFamilyNameEn: null },
        ],
        countries: [{ id: "TCD", nameFr: "Tchad", nameEn: null }],
        families: [{ id: "FLG_KROU", nameFr: "Krou" }],
      },
    });

    for (const result of results) {
      expect(result.nameEn).toBeUndefined();
      expect(result.languageFamilyNameEn).toBeUndefined();
    }
  });
});

describe("mapSearchEnvelope", () => {
  const envelope = {
    data: {
      peoples: [
        {
          id: "PPL_BETE",
          nameMain: "Bété",
          languageFamilyId: "FLG_NIGER_CONGO",
          currentCountries: ["CIV"],
          content: { demography: { totalPopulation: 1_500_000 } },
        },
      ],
      countries: [
        { id: "CIV", nameFr: "Côte d'Ivoire", etymology: "Côte des dents" },
      ],
      families: [{ id: "FLG_NIGER_CONGO", nameFr: "Niger-Congo" }],
      total: 3,
    },
  };

  // @req REQ-002
  it("flattens the three typed arrays into one result list", () => {
    const results = mapSearchEnvelope(envelope);

    expect(results.map((r) => r.id)).toEqual([
      "PPL_BETE",
      "CIV",
      "FLG_NIGER_CONGO",
    ]);
    expect(results.map((r) => r.type)).toEqual([
      "people",
      "country",
      "languageFamily",
    ]);
  });

  // @req REQ-002
  it("reads a people's display name from nameMain", () => {
    const [people] = mapSearchEnvelope(envelope);

    expect(people.name).toBe("Bété");
    expect(people.languageFamilyId).toBe("FLG_NIGER_CONGO");
    expect(people.countryIds).toEqual(["CIV"]);
    expect(people.population).toBe(1_500_000);
  });

  // @req REQ-002
  it("reads a country's display name from nameFr and shows its etymology", () => {
    const country = mapSearchEnvelope(envelope)[1];

    expect(country.name).toBe("Côte d'Ivoire");
    expect(country.snippet).toBe("Côte des dents");
  });

  // @req REQ-002
  it("returns nothing rather than throwing on the legacy flat-array shape", () => {
    expect(mapSearchEnvelope({ data: [{ id: "PPL_BETE" }] })).toEqual([]);
    expect(mapSearchEnvelope({})).toEqual([]);
    expect(mapSearchEnvelope(null)).toEqual([]);
  });

  // @req REQ-002
  it("carries the language-family name the API now resolves", () => {
    const [people] = mapSearchEnvelope({
      data: {
        peoples: [
          {
            id: "PPL_BETE",
            nameMain: "Bété",
            languageFamilyId: "FLG_KROU",
            languageFamilyName: "Krou",
          },
        ],
      },
    });

    expect(people.languageFamilyName).toBe("Krou");
  });

  // @req REQ-002
  it("carries relevance, exact-match, classification and confidence", () => {
    const [people] = mapSearchEnvelope({
      data: {
        peoples: [
          {
            id: "PPL_BETE",
            nameMain: "Bété",
            relevance: 0.81,
            exactMatch: true,
            classificationStatus: "contested",
            confidence: 0.71,
          },
        ],
      },
    });

    expect(people.relevance).toBe(0.81);
    expect(people.exactMatch).toBe(true);
    expect(people.classificationStatus).toBe("contested");
    expect(people.confidence).toBe(0.71);
  });

  // @req REQ-124
  it("counts every people fiche source, including entries without a URL", () => {
    const [people] = mapSearchEnvelope({
      data: {
        peoples: [
          {
            id: "PPL_YORUBA",
            nameMain: "Yoruba",
            content: {
              sources: [
                {
                  title: "UNESCO — Yoruba language",
                  url: "https://www.unesco.org/languages-atlas/en/yoruba",
                },
                { title: "Printed reference", url: null },
                {
                  title: "Ethnologue — Yoruba",
                  url: "https://www.ethnologue.com/language/yor/",
                },
              ],
            },
          },
        ],
      },
    });

    expect(people.sourceCount).toBe(3);
  });

  // @req REQ-124
  it("keeps only real people source URLs as titled external links", () => {
    const [people] = mapSearchEnvelope({
      data: {
        peoples: [
          {
            id: "PPL_YORUBA",
            nameMain: "Yoruba",
            content: {
              sources: [
                {
                  title: "UNESCO — Yoruba language",
                  url: "https://www.unesco.org/languages-atlas/en/yoruba",
                },
                { title: "Printed reference", url: null },
                {
                  title: "Ethnologue — Yoruba",
                  url: "https://www.ethnologue.com/language/yor/",
                },
              ],
            },
          },
        ],
      },
    });

    expect(people.externalLinks).toEqual([
      {
        title: "UNESCO — Yoruba language",
        url: "https://www.unesco.org/languages-atlas/en/yoruba",
      },
      {
        title: "Ethnologue — Yoruba",
        url: "https://www.ethnologue.com/language/yor/",
      },
    ]);
  });

  // @req REQ-002
  it("carries the people-group id and label a split fiche declares (ETNI-1391)", () => {
    const [fulani] = mapSearchEnvelope({
      data: {
        peoples: [
          {
            id: "PPL_FULANI_MASSINA",
            nameMain: "Peul du Massina",
            content: {
              appellations: {
                peopleGroupId: "PGRP_FULANI",
                peopleGroupLabel: "Peul / Fulani",
              },
            },
          },
        ],
      },
    });

    expect(fulani.peopleGroupId).toBe("PGRP_FULANI");
    expect(fulani.peopleGroupLabel).toBe("Peul / Fulani");
  });

  // @req REQ-002
  it("leaves the people-group fields undefined when a fiche is not split", () => {
    const [bete] = mapSearchEnvelope(envelope);

    expect(bete.peopleGroupId).toBeUndefined();
    expect(bete.peopleGroupLabel).toBeUndefined();
  });

  // @req REQ-126
  it("maps a person row, carrying roleCategory and peopleLinks untouched", () => {
    const [person] = mapSearchEnvelope({
      data: {
        persons: [
          {
            id: "PER_DELAFOSSE",
            fullName: "Maurice Delafosse",
            roleCategory: "ethnographer",
            peopleLinks: [
              { peopleId: "PPL_BETE", relationLabel: "observation" },
              { peopleId: "PPL_DIOULA", relationLabel: "membership" },
            ],
            snippet: "administrateur colonial et [[linguiste]]",
            relevance: 0.65,
            exactMatch: true,
          },
        ],
      },
    });

    expect(person.type).toBe("person");
    expect(person.id).toBe("PER_DELAFOSSE");
    expect(person.name).toBe("Maurice Delafosse");
    expect(person.roleCategory).toBe("ethnographer");
    expect(person.peopleLinks).toEqual([
      { peopleId: "PPL_BETE", relationLabel: "observation" },
      { peopleId: "PPL_DIOULA", relationLabel: "membership" },
    ]);
    expect(person.snippet).toBe("administrateur colonial et [[linguiste]]");
    expect(person.relevance).toBe(0.65);
    expect(person.exactMatch).toBe(true);
  });

  // @req REQ-126
  it("defaults a person's peopleLinks to an empty array when absent", () => {
    const [person] = mapSearchEnvelope({
      data: {
        persons: [{ id: "PER_X", fullName: "X", roleCategory: "historian" }],
      },
    });

    expect(person.peopleLinks).toEqual([]);
  });

  // REQ-136: a language reaches the unified surface as its own kind.
  // @req REQ-136
  it("maps a language row, carrying its family name and ISO id", () => {
    const [language] = mapSearchEnvelope({
      data: {
        languages: [
          {
            id: "swa",
            name: "Swahili",
            familyId: "FLG_NIGER_CONGO",
            familyName: "Niger-Congo",
            snippet: "[[Swahili]]",
            relevance: 0.9,
            exactMatch: true,
          },
        ],
      },
    });

    expect(language.type).toBe("language");
    expect(language.id).toBe("swa");
    expect(language.name).toBe("Swahili");
    expect(language.languageFamilyId).toBe("FLG_NIGER_CONGO");
    expect(language.languageFamilyName).toBe("Niger-Congo");
    expect(language.snippet).toBe("[[Swahili]]");
    expect(language.relevance).toBe(0.9);
    expect(language.exactMatch).toBe(true);
  });

  // ETNI-1804: DominantAnswerPanel needs the language's ISO code, speaker
  // peoples and source count, which the RPC already returns in `content` but
  // the mapper used to drop.
  // @req REQ-124
  it("carries a language's ISO 639-3 code, speaker peoples and source count", () => {
    const [language] = mapSearchEnvelope({
      data: {
        languages: [
          {
            id: "swa",
            name: "Swahili",
            familyId: "FLG_NIGER_CONGO",
            familyName: "Niger-Congo",
            content: {
              peoples: [
                { name: "Swahili (peuple)", peopleId: "PPL_SWAHILI" },
                { name: "Comorien", peopleId: "PPL_COMORIEN" },
                { name: "Locuteur non fiché" },
              ],
              sources: [
                {
                  title: "Glottolog — Swahili",
                  url: "https://glottolog.org/resource/languoid/id/swah1253",
                },
              ],
            },
          },
        ],
      },
    });

    expect(language.isoCode639_3).toBe("swa");
    expect(language.speakerPeopleIds).toEqual(["PPL_SWAHILI", "PPL_COMORIEN"]);
    expect(language.sourceCount).toBe(1);
  });

  // REQ-136 AC: "Given a language name and a people name that match a query
  // equally well, when results are rendered, then both kinds are returned,
  // grouped by kind, and neither is silently dropped."
  // @req REQ-136
  it("returns a language and a people that match equally well, neither dropped", () => {
    const results = mapSearchEnvelope({
      data: {
        languages: [
          {
            id: "kon",
            name: "Kongo",
            familyId: "FLG_NIGER_CONGO",
            familyName: "Niger-Congo",
            relevance: 1,
            exactMatch: true,
          },
        ],
        peoples: [
          {
            id: "PPL_KONGO",
            nameMain: "Kongo",
            languageFamilyId: "FLG_NIGER_CONGO",
            relevance: 1,
            exactMatch: true,
          },
        ],
      },
    });

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.type).sort()).toEqual(["language", "people"]);
  });

  // @req REQ-135
  it("maps a patronyme row, carrying nameSystem and casteOrSocialFunction", () => {
    const [patronyme] = mapSearchEnvelope({
      data: {
        patronymes: [
          {
            id: "PATR_KEITA",
            nameMain: "Keïta",
            nameSystem: "patronymic",
            casteOrSocialFunction: "royal",
            snippet: "lignage [[Keïta]]",
            relevance: 0.65,
            exactMatch: true,
          },
        ],
      },
    });

    expect(patronyme.type).toBe("patronyme");
    expect(patronyme.id).toBe("PATR_KEITA");
    expect(patronyme.name).toBe("Keïta");
    expect(patronyme.nameSystem).toBe("patronymic");
    expect(patronyme.casteOrSocialFunction).toBe("royal");
    expect(patronyme.snippet).toBe("lignage [[Keïta]]");
    expect(patronyme.relevance).toBe(0.65);
    expect(patronyme.exactMatch).toBe(true);
  });

  // ETNI-1804: DominantAnswerPanel needs the patronyme's associations and
  // source count, which the RPC already returns in `content` but the mapper
  // used to drop.
  // @req REQ-124
  it("carries a patronyme's associated peoples, attested countries and source count", () => {
    const [patronyme] = mapSearchEnvelope({
      data: {
        patronymes: [
          {
            id: "PATR_KEITA",
            nameMain: "Keïta",
            nameSystem: "clan_name",
            casteOrSocialFunction: "royal",
            content: {
              peoples: [
                { peopleId: "PPL_MANDINGUE", status: "attested" },
                { peopleId: "PPL_BAMBARA", status: "supposed" },
              ],
              countries: [
                { countryId: "MLI", status: "attested" },
                { countryId: "GIN", status: "supposed" },
              ],
              sources: [
                {
                  title: "Delafosse — Haut-Sénégal-Niger",
                  url: "https://example.org/delafosse",
                },
                { title: "Griot oral, Ségou", url: null },
              ],
            },
          },
        ],
      },
    });

    expect(patronyme.associatedPeopleIds).toEqual([
      "PPL_MANDINGUE",
      "PPL_BAMBARA",
    ]);
    expect(patronyme.attestedCountryIds).toEqual(["MLI"]);
    expect(patronyme.sourceCount).toBe(2);
  });

  // ETNI-1859: the API resolves the associated peoples to their main name
  // so the panel can render a chip per people without printing an id.
  // @req REQ-124
  it("carries a patronyme's resolved associated peoples verbatim", () => {
    const [patronyme] = mapSearchEnvelope({
      data: {
        patronymes: [
          {
            id: "PATR_KEITA",
            nameMain: "Keïta",
            associatedPeoples: [{ id: "PPL_DIOULA", name: "Dioula" }],
          },
        ],
      },
    });

    expect(patronyme.associatedPeoples).toEqual([
      { id: "PPL_DIOULA", name: "Dioula" },
    ]);
  });

  // @req REQ-124
  it("leaves associatedPeoples undefined when the API sends none", () => {
    const [patronyme] = mapSearchEnvelope({
      data: {
        patronymes: [{ id: "PATR_KEITA", nameMain: "Keïta" }],
      },
    });

    expect(patronyme.associatedPeoples).toBeUndefined();
  });

  // @req REQ-124
  it("drops a malformed associated-people entry rather than rendering a nameless chip", () => {
    const [patronyme] = mapSearchEnvelope({
      data: {
        patronymes: [
          {
            id: "PATR_KEITA",
            nameMain: "Keïta",
            associatedPeoples: [
              { id: "PPL_DIOULA", name: "Dioula" },
              { id: "PPL_NAMELESS" },
              { id: 42, name: "Nombre" },
              "PPL_STRING",
              null,
            ],
          },
        ],
      },
    });

    expect(patronyme.associatedPeoples).toEqual([
      { id: "PPL_DIOULA", name: "Dioula" },
    ]);
  });

  // The panel states "N peuples" from the fiche's own count, and only the
  // resolved ones become chips — a people without a fiche is counted, never
  // named by its identifier.
  // @req REQ-124
  it("still counts every declared people id when fewer resolved to a name", () => {
    const [patronyme] = mapSearchEnvelope({
      data: {
        patronymes: [
          {
            id: "PATR_KEITA",
            nameMain: "Keïta",
            content: {
              peoples: [
                { peopleId: "PPL_DIOULA" },
                { peopleId: "PPL_NO_FICHE_YET" },
              ],
            },
            associatedPeoples: [{ id: "PPL_DIOULA", name: "Dioula" }],
          },
        ],
      },
    });

    expect(patronyme.associatedPeopleIds).toEqual([
      "PPL_DIOULA",
      "PPL_NO_FICHE_YET",
    ]);
    expect(patronyme.associatedPeoples).toEqual([
      { id: "PPL_DIOULA", name: "Dioula" },
    ]);
  });

  // ETNI-1463 AC2: a query with person hits but no name fiche must still
  // return the persons — the absence is rendered, not silence, but the
  // envelope itself must never drop a kind that legitimately came back
  // empty.
  // @req REQ-135
  it("returns persons with an empty patronymes array, neither dropped nor faked", () => {
    const results = mapSearchEnvelope({
      data: {
        persons: [
          { id: "PER_X", fullName: "Someone", roleCategory: "historian" },
        ],
        patronymes: [],
      },
    });

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("person");
  });

  // @req REQ-002
  it("prefers the match excerpt over the raw etymology for a country", () => {
    const [country] = mapSearchEnvelope({
      data: {
        countries: [
          {
            id: "CIV",
            nameFr: "Côte d'Ivoire",
            etymology: "Côte des dents",
            snippet: "boucle du [[cacao]]",
          },
        ],
      },
    });

    expect(country.snippet).toBe("boucle du [[cacao]]");
  });
});

describe("compareByRelevance", () => {
  const hit = (over: Partial<SearchResult>): SearchResult => ({
    type: "people",
    id: "X",
    name: "X",
    ...over,
  });

  // @req REQ-002
  it("ranks a country above a people when the country is more relevant", () => {
    const results = mapSearchEnvelope({
      data: {
        peoples: [{ id: "PPL_BETE", nameMain: "Bété", relevance: 0.2 }],
        countries: [{ id: "CIV", nameFr: "Côte d'Ivoire", relevance: 0.9 }],
      },
    });

    // The mapper groups by kind, so the raw order is people-then-country.
    expect(results.map((r) => r.id)).toEqual(["PPL_BETE", "CIV"]);
    expect([...results].sort(compareByRelevance).map((r) => r.id)).toEqual([
      "CIV",
      "PPL_BETE",
    ]);
  });

  // @req REQ-002
  it("puts an exact match ahead of a more relevant inexact one", () => {
    const results = [
      hit({ id: "LOOSE", relevance: 0.9 }),
      hit({ id: "EXACT", relevance: 0.1, exactMatch: true }),
    ];

    expect([...results].sort(compareByRelevance).map((r) => r.id)).toEqual([
      "EXACT",
      "LOOSE",
    ]);
  });

  // @req REQ-002
  it("keeps the API's order when two results tie", () => {
    const results = [
      hit({ id: "FIRST", relevance: 0.5 }),
      hit({ id: "SECOND", relevance: 0.5 }),
    ];

    expect([...results].sort(compareByRelevance).map((r) => r.id)).toEqual([
      "FIRST",
      "SECOND",
    ]);
  });
});

describe("mapSearchLeads", () => {
  // @req REQ-125
  it("maps a people, country and family lead, renaming family to languageFamily", () => {
    const leads = mapSearchLeads({
      data: {
        total: 0,
        leads: [
          {
            kind: "people",
            id: "PPL_BAMBARA",
            name: "Bambara",
            similarity: 0.4,
          },
          { kind: "country", id: "MLI", name: "Mali", similarity: 0.3 },
          {
            kind: "family",
            id: "FLG_MANDE",
            name: "Mandé",
            similarity: 0.25,
          },
        ],
      },
    });

    expect(leads).toEqual([
      { type: "people", id: "PPL_BAMBARA", name: "Bambara", similarity: 0.4 },
      { type: "country", id: "MLI", name: "Mali", similarity: 0.3 },
      {
        type: "languageFamily",
        id: "FLG_MANDE",
        name: "Mandé",
        similarity: 0.25,
      },
    ]);
  });

  // @req REQ-125
  it("drops a lead whose kind is not people, country or family", () => {
    const leads = mapSearchLeads({
      data: {
        total: 0,
        leads: [
          { kind: "language", id: "swa", name: "Swahili", similarity: 0.5 },
        ],
      },
    });

    expect(leads).toEqual([]);
  });

  // ETNI-1463 AC3 (ETNI-1744): patronymes and persons are deliberately not
  // lead candidates, the same way languages are not.
  // @req REQ-125
  it("drops a lead whose kind is patronyme or person", () => {
    const leads = mapSearchLeads({
      data: {
        total: 0,
        leads: [
          { kind: "patronyme", id: "PATR_X", name: "X", similarity: 0.5 },
          { kind: "person", id: "PER_X", name: "X", similarity: 0.5 },
        ],
      },
    });

    expect(leads).toEqual([]);
  });

  // @req REQ-125
  it("returns an empty array when there is no leads field, an array data, or no data", () => {
    expect(mapSearchLeads({ data: { total: 2 } })).toEqual([]);
    expect(mapSearchLeads({ data: [{ id: "PPL_BETE" }] })).toEqual([]);
    expect(mapSearchLeads({})).toEqual([]);
    expect(mapSearchLeads(null)).toEqual([]);
  });
});

describe("mapSearchCounts", () => {
  // @req REQ-124
  it("reads the per-type totals the handler already computes, keyed to the lens values", () => {
    const counts = mapSearchCounts({
      data: {
        peoplesTotal: 12,
        countriesTotal: 3,
        familiesTotal: 2,
        languagesTotal: 5,
        personsTotal: 1,
        total: 23,
      },
    });

    expect(counts).toEqual({
      all: 23,
      people: 12,
      country: 3,
      languageFamily: 2,
      language: 5,
      person: 1,
      patronyme: 0,
    });
  });

  // @req REQ-124
  // @req REQ-135
  it("sums the displayed lenses for 'all' rather than reading data.total, and surfaces the patronyme lens (ETNI-1463)", () => {
    const counts = mapSearchCounts({
      data: {
        peoplesTotal: 12,
        countriesTotal: 3,
        familiesTotal: 2,
        languagesTotal: 5,
        personsTotal: 1,
        patronymesTotal: 7,
        total: 30,
      },
    });

    expect(counts).toEqual({
      all: 30,
      people: 12,
      country: 3,
      languageFamily: 2,
      language: 5,
      person: 1,
      patronyme: 7,
    });
  });

  // @req REQ-124
  it("defaults every count to zero when a total is missing, an array data, or no data", () => {
    const zero = {
      all: 0,
      people: 0,
      country: 0,
      languageFamily: 0,
      language: 0,
      person: 0,
      patronyme: 0,
    };
    expect(mapSearchCounts({ data: {} })).toEqual(zero);
    expect(mapSearchCounts({ data: [{ id: "PPL_BETE" }] })).toEqual(zero);
    expect(mapSearchCounts({})).toEqual(zero);
    expect(mapSearchCounts(null)).toEqual(zero);
  });
});
