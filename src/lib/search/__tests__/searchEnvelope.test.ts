import { describe, it, expect } from "vitest";

import {
  buildSearchParams,
  mapSearchEnvelope,
} from "@/lib/search/searchEnvelope";

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
});
