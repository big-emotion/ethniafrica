import { describe, it, expect } from "vitest";

import {
  buildSearchParams,
  compareByRelevance,
  mapSearchEnvelope,
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
