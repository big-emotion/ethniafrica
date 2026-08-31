import { describe, expect, it } from "vitest";

import type { CountryDistribution } from "@/types/afrik";
import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";

import {
  buildContinentOverlay,
  buildCountryOutlineOverlay,
  buildCountrySetOverlay,
  buildFamilyFootprintOverlay,
  buildPeopleFieldOverlay,
  CONTINENT_FRAME_FILL_OPACITY,
  CONTINENT_MAX_AREAS,
  COUNTRY_FILL_OPACITY,
  getAdmin0Rings,
  ringCentroid,
  type ContinentFieldOverlay,
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
      undrawn: [],
    });
    expect(buildPeopleFieldOverlay([])).toEqual({
      kind: "people-field-missing",
      undrawn: [],
    });
  });

  // The charter (§4) says an unresolved country is treated as missing, never
  // as a silently dropped shape. The builder used to filter it away, so 92
  // declared presences across 63 fiches left no trace anywhere in the UI.
  // @req REQ-119
  it("carries an entry it cannot draw instead of dropping it", () => {
    const overlay = buildPeopleFieldOverlay([
      { country: "NGA", population: 4000 },
      { country: "USA", population: 1000 },
    ]);

    if (overlay.kind !== "people-field") throw new Error("unreachable");
    expect(overlay.areas.map((area) => area.countryId)).toEqual(["NGA"]);
    expect(overlay.undrawn).toEqual([{ countryId: "USA", rawWeight: 1000 }]);
  });

  // @req REQ-119
  it("still reports missing when nothing resolves, and still names what was declared", () => {
    const overlay = buildPeopleFieldOverlay([
      { country: "XYZ", percentage: 100 },
    ]);

    expect(overlay).toEqual({
      kind: "people-field-missing",
      undrawn: [{ countryId: "XYZ", rawWeight: 100 }],
    });
  });

  // Halo scale is normalised over what is drawn, so a large off-map diaspora
  // cannot shrink every halo on the continent. The share of the whole people
  // is a separate figure, and the panel reads it from the demography.
  // @req REQ-116
  it("normalises the halo scale over drawn areas only", () => {
    const overlay = buildPeopleFieldOverlay([
      { country: "NGA", population: 1000 },
      { country: "USA", population: 9000 },
    ]);

    if (overlay.kind !== "people-field") throw new Error("unreachable");
    expect(overlay.areas[0].populationShare).toBe(1);
  });
});

describe("ISO codes the admin-0 asset keys differently (REQ-116)", () => {
  // Natural Earth keys South Sudan SDS and Western Sahara SAH; the corpus
  // writes the ISO 3166-1 codes SSD and ESH. The geometry was committed all
  // along — 27 South Sudan presences read as unmappable over a nomenclature
  // disagreement, which is the single largest cause of undrawn entries.
  // @req REQ-116
  it("resolves an ISO code to the Natural Earth key holding its geometry", () => {
    expect(getAdmin0Rings("SSD")).toEqual(getAdmin0Rings("SDS"));
    expect(getAdmin0Rings("ESH")).toEqual(getAdmin0Rings("SAH"));
    expect(getAdmin0Rings("SSD")?.length).toBeGreaterThan(0);
  });

  // @req REQ-116
  it("draws the African island territories the asset used to omit", () => {
    for (const countryId of ["COM", "MUS", "SYC", "CPV", "STP", "REU", "MYT"]) {
      expect(getAdmin0Rings(countryId)?.length ?? 0).toBeGreaterThan(0);
    }
  });

  // Somaliland is in the asset under SOL and has no ISO 3166-1 code at all.
  // Aliasing it to SOM would make the atlas assert a sovereignty claim.
  // @req REQ-116
  it("does not alias Somaliland onto Somalia", () => {
    expect(getAdmin0Rings("SOL")).not.toEqual(getAdmin0Rings("SOM"));
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

describe("buildCountrySetOverlay (REQ-120)", () => {
  // @req REQ-120
  it("outlines every proposed country, keeping the order the round proposed them in", () => {
    const overlay = buildCountrySetOverlay(["TGO", "NGA", "BEN"]);

    expect(overlay?.kind).toBe("country-set");
    expect(overlay?.countryIds).toEqual(["TGO", "NGA", "BEN"]);
    expect(overlay?.rings.length).toBeGreaterThan(0);
    expect(overlay?.rings[0].length).toBeGreaterThan(2);
  });

  // @req REQ-120
  it("fills at the shared country fill opacity rather than inventing a visual language of its own", () => {
    expect(buildCountrySetOverlay(["NGA"])?.fillOpacity).toBe(
      COUNTRY_FILL_OPACITY
    );
  });

  // @req REQ-120
  it("keeps the countries that resolve when one of them is absent from the committed admin-0 asset", () => {
    const overlay = buildCountrySetOverlay(["NGA", "XYZ"]);

    expect(overlay?.countryIds).toEqual(["NGA"]);
  });

  // @req REQ-120
  it("offers a country proposed twice as a single choice, so one country never gets two markers", () => {
    expect(buildCountrySetOverlay(["NGA", "NGA"])?.countryIds).toEqual(["NGA"]);
  });

  // @req REQ-119
  it("is null (missing) when no proposed country resolves to committed geometry", () => {
    expect(buildCountrySetOverlay(["XYZ"])).toBeNull();
    expect(buildCountrySetOverlay([])).toBeNull();
  });

  // @req REQ-120
  it("never emits a people kind, so a round can never close a line around a people", () => {
    expect(buildCountrySetOverlay(["NGA", "BEN"])?.kind).not.toMatch(/^people/);
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

describe("buildContinentOverlay (REQ-116 AC1, continent scene)", () => {
  /** Fourteen countries whose markers never touch, so cap and de-duplication can be tested apart. */
  const spreadCountries = [
    "AGO",
    "COD",
    "EGY",
    "ETH",
    "KEN",
    "MAR",
    "MDG",
    "MLI",
    "MOZ",
    "NAM",
    "NGA",
    "SEN",
    "TCD",
    "ZAF",
  ];

  const evenCounts = (countryIds: string[], count: number) =>
    Object.fromEntries(countryIds.map((id) => [id, count]));

  const fieldOf = (
    counts: Record<string, number> | undefined
  ): ContinentFieldOverlay => {
    const overlay = buildContinentOverlay(counts);
    if (overlay.kind !== "continent-field") {
      throw new Error(`expected a continent field, got ${overlay.kind}`);
    }
    return overlay;
  };

  // @req REQ-116
  it("frames the whole continent with every committed admin-0 country", () => {
    const overlay = fieldOf({ NGA: 40 });

    // Read from the asset rather than pinned: the count is a property of the
    // committed geometry, and hard-coding it turns every legitimate addition
    // into a red test that says nothing about the framing.
    expect(overlay.frame).toHaveLength(Object.keys(AFRICA_ADMIN0).length);
    expect(overlay.frame.map((country) => country.countryId)).toContain("ZAF");
    expect(overlay.frame[0].rings[0].length).toBeGreaterThan(2);
  });

  // @req REQ-116
  it("never fills the frame, so a country is never read as the area of the peoples counted inside it", () => {
    expect(CONTINENT_FRAME_FILL_OPACITY).toBe(0);
    expect(fieldOf({ NGA: 40 }).fillOpacity).toBe(0);
  });

  // @req REQ-116
  it("gives an area no rings key at all, so no caller can stroke a people as a closed border", () => {
    for (const area of fieldOf({ NGA: 40, KEN: 12 }).areas) {
      expect(Object.keys(area)).not.toContain("rings");
    }
  });

  /**
   * This used to assert a normalised share, which the renderers turned into a
   * radial field. The scene draws no field now, so the area carries the raw
   * count and nothing derived from its neighbours: a figure the panel can
   * name is honest in a way a relative brightness never was.
   */
  // @req REQ-116
  it("carries each country's own documented count, normalised against nothing", () => {
    const overlay = fieldOf({ NGA: 40, KEN: 10, MAR: 20 });
    const countOf = (countryId: string) =>
      overlay.areas.find((area) => area.countryId === countryId)
        ?.documentedPeopleCount;

    expect(countOf("NGA")).toBe(40);
    expect(countOf("MAR")).toBe(20);
    expect(countOf("KEN")).toBe(10);
  });

  // @req REQ-116
  it("keeps the raw count on the area, so nothing downstream has to invert the normalisation", () => {
    expect(fieldOf({ NGA: 40 }).areas[0].documentedPeopleCount).toBe(40);
  });

  // @req REQ-116
  it("caps the areas at CONTINENT_MAX_AREAS, keeping the densest countries", () => {
    const counts = evenCounts(spreadCountries, 1);
    counts.ZAF = 90;
    counts.TCD = 80;

    const overlay = fieldOf(counts);

    expect(overlay.areas).toHaveLength(CONTINENT_MAX_AREAS);
    expect(overlay.areas.map((area) => area.countryId).slice(0, 2)).toEqual([
      "ZAF",
      "TCD",
    ]);
  });

  // @req REQ-116
  it("breaks a tie on the identifier, so the same counts always yield the same twelve", () => {
    const counts = evenCounts(spreadCountries, 5);
    const kept = fieldOf(counts).areas.map((area) => area.countryId);
    const fromReversedInput = fieldOf(
      Object.fromEntries(Object.entries(counts).reverse())
    ).areas.map((area) => area.countryId);

    expect(kept).toEqual([
      "AGO",
      "COD",
      "EGY",
      "ETH",
      "KEN",
      "MAR",
      "MDG",
      "MLI",
      "MOZ",
      "NAM",
      "NGA",
      "SEN",
    ]);
    expect(fromReversedInput).toEqual(kept);
  });

  // @req REQ-117
  it("drops an area whose marker would land within one marker diameter of an already-kept one", () => {
    // Benin and Togo project ~10px apart on the narrowest supported stage —
    // closer than the 22px marker each of them gets. Kenya sits far away and
    // must survive.
    expect(
      fieldOf({ BEN: 12, TGO: 7, KEN: 3 }).areas.map((area) => area.countryId)
    ).toEqual(["BEN", "KEN"]);
  });

  // @req REQ-117
  it("resolves a marker collision in favour of the denser country, not the input order", () => {
    expect(
      fieldOf({ BEN: 7, TGO: 12 }).areas.map((area) => area.countryId)
    ).toEqual(["TGO"]);
  });

  // @req REQ-119
  it("declares itself missing rather than framing an empty continent", () => {
    expect(buildContinentOverlay(undefined).kind).toBe("people-field-missing");
    expect(buildContinentOverlay({}).kind).toBe("people-field-missing");
    expect(buildContinentOverlay({ NGA: 0, KEN: 0 }).kind).toBe(
      "people-field-missing"
    );
  });

  // @req REQ-116
  it("drops a country absent from the committed asset instead of inventing a centroid for it", () => {
    const overlay = fieldOf({ NGA: 40, XXX: 999 });

    expect(overlay.areas.map((area) => area.countryId)).toEqual(["NGA"]);
    // The survivor keeps its own count. The dropped country's 999 reaches
    // nothing — not the figure, and no longer a scale it could have skewed.
    expect(overlay.areas[0].documentedPeopleCount).toBe(40);
  });

  // @req REQ-119
  it("declares itself missing when every counted country is absent from the asset", () => {
    expect(buildContinentOverlay({ XXX: 40 }).kind).toBe(
      "people-field-missing"
    );
  });
});
