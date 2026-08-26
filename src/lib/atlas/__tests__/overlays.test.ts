import { describe, expect, it } from "vitest";

import type { CountryDistribution } from "@/types/afrik";

import {
  buildCountryOutlineOverlay,
  buildFamilyFootprintOverlay,
  buildPeopleFieldOverlay,
  COUNTRY_FILL_OPACITY,
  getAdmin0Rings,
  ringCentroid,
} from "../overlays";

describe("ringCentroid", () => {
  // @req REQ-116
  it("finds the centre of a unit square", () => {
    const square = [
      { lon: 0, lat: 0 },
      { lon: 2, lat: 0 },
      { lon: 2, lat: 2 },
      { lon: 0, lat: 2 },
    ];
    expect(ringCentroid(square)).toEqual({ lon: 1, lat: 1 });
  });
});

describe("buildCountryOutlineOverlay (REQ-116 AC1)", () => {
  // @req REQ-116
  it("returns a closed-outline overlay with real admin-0 rings for a known country", () => {
    const overlay = buildCountryOutlineOverlay("ZAF");
    expect(overlay?.kind).toBe("country-outline");
    expect(overlay?.rings.length).toBeGreaterThan(0);
    expect(overlay?.rings[0].length).toBeGreaterThan(2);
    expect(overlay?.fillOpacity).toBe(COUNTRY_FILL_OPACITY);
  });

  // @req REQ-119
  it("is null (missing) for a country absent from the committed admin-0 asset", () => {
    expect(buildCountryOutlineOverlay("XYZ")).toBeNull();
  });

  // @req REQ-116
  it("never emits a people or family kind", () => {
    const overlay = buildCountryOutlineOverlay("KEN");
    expect(overlay?.kind).toBe("country-outline");
  });
});

describe("buildPeopleFieldOverlay (REQ-116 AC2/AC3, REQ-119)", () => {
  const distribution: CountryDistribution[] = [
    { country: "NGA", percentage: 60 },
    { country: "BEN", percentage: 20 },
    { country: "TGO", percentage: 20 },
  ];

  // @req REQ-116
  it("derives one area per declared country, with no rings/boundary field anywhere on the overlay", () => {
    const overlay = buildPeopleFieldOverlay(distribution);
    expect(overlay.kind).toBe("people-field");
    if (overlay.kind !== "people-field") throw new Error("unreachable");
    expect(overlay.areas).toHaveLength(3);
    expect(overlay).not.toHaveProperty("rings");
    overlay.areas.forEach((area) => {
      expect(area).not.toHaveProperty("rings");
    });
  });

  // @req REQ-116
  it("makes area proportional to the declared population share, never authored by hand", () => {
    const overlay = buildPeopleFieldOverlay(distribution);
    if (overlay.kind !== "people-field") throw new Error("unreachable");
    const byCountry = Object.fromEntries(
      overlay.areas.map((area) => [area.countryId, area.populationShare])
    );
    // NGA has 3x the share of BEN/TGO — the overlay must preserve that ratio.
    expect(byCountry.NGA).toBe(1);
    expect(byCountry.BEN).toBeCloseTo(20 / 60);
    expect(byCountry.TGO).toBeCloseTo(20 / 60);
  });

  // @req REQ-116
  it("falls back to population when percentage is absent", () => {
    const overlay = buildPeopleFieldOverlay([
      { country: "NGA", population: 4000 },
      { country: "BEN", population: 1000 },
    ]);
    if (overlay.kind !== "people-field") throw new Error("unreachable");
    const byCountry = Object.fromEntries(
      overlay.areas.map((area) => [area.countryId, area.populationShare])
    );
    expect(byCountry.NGA).toBe(1);
    expect(byCountry.BEN).toBeCloseTo(0.25);
  });

  // @req REQ-119
  it("renders the declared-missing state, not an empty field, when distributionByCountry is absent", () => {
    expect(buildPeopleFieldOverlay(undefined)).toEqual({
      kind: "people-field-missing",
    });
    expect(buildPeopleFieldOverlay([])).toEqual({
      kind: "people-field-missing",
    });
  });

  // @req REQ-119
  it("drops entries whose country has no committed admin-0 rings, and reports missing if none resolve", () => {
    const overlay = buildPeopleFieldOverlay([
      { country: "XYZ", percentage: 100 },
    ]);
    expect(overlay).toEqual({ kind: "people-field-missing" });
  });
});

describe("buildFamilyFootprintOverlay (REQ-116 AC4)", () => {
  // @req REQ-116
  it("unions currentCountries across member peoples, deduplicated", () => {
    const overlay = buildFamilyFootprintOverlay(
      [
        ["NGA", "BEN"],
        ["BEN", "TGO"],
      ],
      2
    );
    expect(overlay?.kind).toBe("family-footprint");
    expect(overlay?.countries.map((c) => c.countryId).sort()).toEqual([
      "BEN",
      "NGA",
      "TGO",
    ]);
    expect(overlay?.countries.every((c) => c.rings.length > 0)).toBe(true);
  });

  // @req REQ-116
  it("counts how many member peoples each country carries", () => {
    // BEN is named by both peoples, NGA and TGO by one each. A choropleth is
    // only readable if the count is per country, not per family.
    const overlay = buildFamilyFootprintOverlay(
      [
        ["NGA", "BEN"],
        ["BEN", "TGO"],
      ],
      2
    );
    const byId = Object.fromEntries(
      overlay!.countries.map((c) => [c.countryId, c.memberCount])
    );
    expect(byId).toEqual({ BEN: 2, NGA: 1, TGO: 1 });
  });

  // @req REQ-116
  it("counts a country once per people, however often that people repeats it", () => {
    // currentCountries is a declared list, not a set; a fiche repeating a
    // country would otherwise inflate that country's tint on its own.
    const overlay = buildFamilyFootprintOverlay([["NGA", "NGA", "NGA"]], 1);
    expect(overlay?.countries[0].memberCount).toBe(1);
  });

  // @req REQ-116
  it("weights each country against the densest one, which reaches 1", () => {
    const overlay = buildFamilyFootprintOverlay(
      [["NGA", "BEN"], ["NGA", "TGO"], ["NGA"], ["BEN"]],
      4
    );
    const byId = Object.fromEntries(
      overlay!.countries.map((c) => [c.countryId, c.weight])
    );
    expect(byId.NGA).toBe(1);
    expect(byId.BEN).toBeCloseTo(2 / 3);
    expect(byId.TGO).toBeCloseTo(1 / 3);
  });

  // @req REQ-116
  it("orders by density, breaking ties on the country id", () => {
    // Twelve of the seventeen countries in the reference family sit at one
    // people each. Without a tiebreak the ranking and the picker would reorder
    // between two renders of the same data — a flicker, and a visual gate that
    // fails for no reason.
    const overlay = buildFamilyFootprintOverlay(
      [["TGO", "BEN", "NGA"], ["NGA"]],
      2
    );
    expect(overlay?.countries.map((c) => c.countryId)).toEqual([
      "NGA",
      "BEN",
      "TGO",
    ]);
  });

  // @req REQ-116
  it("orders identically however the member peoples are ordered", () => {
    const order = (memberCountries: string[][]) =>
      buildFamilyFootprintOverlay(
        memberCountries,
        memberCountries.length
      )?.countries.map((c) => c.countryId);

    expect(order([["TGO"], ["BEN"], ["NGA"]])).toEqual(
      order([["NGA"], ["TGO"], ["BEN"]])
    );
  });

  // @req REQ-116
  it("excludes a country the admin-0 asset cannot draw, rather than drawing it at zero", () => {
    const overlay = buildFamilyFootprintOverlay([["NGA", "XYZ"]], 1);
    expect(overlay?.countries.map((c) => c.countryId)).toEqual(["NGA"]);
  });

  // @req REQ-116
  it("keeps the family's own member-people count, which is not the sum of the per-country counts", () => {
    // A people present in three countries is counted three times across the
    // footprint and once in the family. The panel's "N of the family's M"
    // reading needs the second number.
    const overlay = buildFamilyFootprintOverlay([["NGA", "BEN", "TGO"]], 1);
    expect(overlay?.memberPeopleCount).toBe(1);
  });

  // @req REQ-119
  it("is null (missing) when no member country resolves to committed geometry", () => {
    expect(buildFamilyFootprintOverlay([["XYZ"]], 3)).toBeNull();
    expect(buildFamilyFootprintOverlay([], 0)).toBeNull();
  });
});

describe("getAdmin0Rings coverage", () => {
  // @req REQ-116
  it("resolves every country id it returns rings for to a non-empty polygon", () => {
    expect(getAdmin0Rings("ZAF")?.[0].length).toBeGreaterThan(2);
    expect(getAdmin0Rings("NOPE")).toBeUndefined();
  });
});

// @req REQ-116 — encoding-invariant guard: a people overlay is structurally
// incapable of carrying a closed boundary, and each builder only ever emits
// its own entity's encoding.
describe("encoding invariant", () => {
  // @req REQ-116
  it("people overlays never carry a rings/boundary field, in either the field or missing variant", () => {
    const field = buildPeopleFieldOverlay([
      { country: "NGA", percentage: 100 },
    ]);
    const missing = buildPeopleFieldOverlay(undefined);
    for (const overlay of [field, missing]) {
      expect(overlay).not.toHaveProperty("rings");
      expect(overlay.kind.startsWith("people-")).toBe(true);
    }
  });

  // @req REQ-116
  it("country and family builders never emit a people kind", () => {
    expect(buildCountryOutlineOverlay("ZAF")?.kind).not.toMatch(/^people/);
    expect(buildFamilyFootprintOverlay([["ZAF"]], 1)?.kind).not.toMatch(
      /^people/
    );
  });
});
