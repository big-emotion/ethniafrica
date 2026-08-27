import { describe, expect, it } from "vitest";

import {
  buildContinentOverlay,
  buildCountryOutlineOverlay,
  buildCountrySetOverlay,
  buildFamilyFootprintOverlay,
  buildPeopleFieldOverlay,
} from "../overlays";
import {
  buildAtlasTargets,
  buildCountryPickerTargets,
  continentTargetFacts,
  ringsAngularSpanDeg,
} from "../targets";

describe("ringsAngularSpanDeg", () => {
  // @req REQ-117
  it("measures the wider of the two extents of a ring", () => {
    const wideRing = [
      { lon: 0, lat: 0 },
      { lon: 20, lat: 0 },
      { lon: 20, lat: 4 },
      { lon: 0, lat: 4 },
    ];
    expect(ringsAngularSpanDeg([wideRing])).toBeCloseTo(20, 0);
  });

  // @req REQ-117
  it("shrinks a longitude extent by the cosine of its latitude, so a high-latitude ring is not read as wider than it looks", () => {
    const ringAt = (lat: number) => [
      { lon: 0, lat },
      { lon: 30, lat },
      { lon: 30, lat: lat + 1 },
      { lon: 0, lat: lat + 1 },
    ];
    expect(ringsAngularSpanDeg([ringAt(60)])).toBeLessThan(
      ringsAngularSpanDeg([ringAt(0)])
    );
  });

  // @req REQ-117
  it("spans every ring of a multi-ring country, not just the first", () => {
    const mainland = [
      { lon: 0, lat: 0 },
      { lon: 2, lat: 0 },
      { lon: 2, lat: 2 },
    ];
    const distantIsland = [
      { lon: 30, lat: 0 },
      { lon: 31, lat: 0 },
      { lon: 31, lat: 1 },
    ];
    expect(ringsAngularSpanDeg([mainland, distantIsland])).toBeGreaterThan(
      ringsAngularSpanDeg([mainland])
    );
  });
});

describe("buildAtlasTargets (REQ-117 AC1)", () => {
  // @req REQ-117
  it("gives a country fiche exactly one target, centred on the country itself", () => {
    const targets = buildAtlasTargets(buildCountryOutlineOverlay("ZAF"));

    expect(targets).toHaveLength(1);
    expect(targets[0].countryId).toBe("ZAF");
    // South Africa sits in the southern hemisphere, east of Greenwich.
    expect(targets[0].center.lat).toBeLessThan(0);
    expect(targets[0].center.lon).toBeGreaterThan(0);
    expect(targets[0].angularSpanDeg).toBeGreaterThan(0);
  });

  // @req REQ-117
  it("gives a people fiche one target per country of its distribution", () => {
    const overlay = buildPeopleFieldOverlay([
      { country: "NGA", percentage: 70 },
      { country: "BEN", percentage: 30 },
    ]);

    expect(
      buildAtlasTargets(overlay)
        .map((target) => target.countryId)
        .sort()
    ).toEqual(["BEN", "NGA"]);
  });

  // @req REQ-117
  it("gives a family fiche one target per country of its footprint, deduplicated across member peoples", () => {
    const overlay = buildFamilyFootprintOverlay([["NGA"], ["NGA", "CMR"]], 2);

    expect(
      buildAtlasTargets(overlay)
        .map((target) => target.countryId)
        .sort()
    ).toEqual(["CMR", "NGA"]);
  });

  // @req REQ-120
  it("gives a game round one choosable target per proposed country, in the order proposed", () => {
    const overlay = buildCountrySetOverlay(["CMR", "NGA"]);

    expect(
      buildAtlasTargets(overlay).map((target) => target.countryId)
    ).toEqual(["CMR", "NGA"]);
  });

  // @req REQ-120
  it("names a round's targets in French, so a choice never reads as an ISO code", () => {
    const targets = buildAtlasTargets(buildCountrySetOverlay(["ZAF"]));

    expect(targets[0].nameFr).toBe("Afrique du Sud");
  });

  // @req REQ-117
  it("keeps a family fiche's targets in the overlay's own density order", () => {
    // The country picker is built from the targets and the ranking from the
    // overlay. If the two orders diverge, the nth option and the nth row stop
    // describing the same country.
    const overlay = buildFamilyFootprintOverlay(
      [["TGO", "BEN", "NGA"], ["NGA"]],
      2
    );

    expect(
      buildAtlasTargets(overlay).map((target) => target.countryId)
    ).toEqual(overlay!.countries.map((country) => country.countryId));
  });

  // @req REQ-117
  it("yields no target for a declared-missing or absent overlay, so nothing is selectable on an empty globe", () => {
    expect(buildAtlasTargets(buildPeopleFieldOverlay([]))).toEqual([]);
    expect(buildAtlasTargets(null)).toEqual([]);
  });

  // @req REQ-117
  it("names each target in French from the committed admin-0 asset, so the marker never reads as an ISO code", () => {
    const targets = buildAtlasTargets(buildCountryOutlineOverlay("ZAF"));

    expect(targets[0].nameFr).toBe("Afrique du Sud");
  });

  // @req REQ-117
  it("reuses the people field's own weighted centre rather than deriving a second, different one", () => {
    const overlay = buildPeopleFieldOverlay([
      { country: "NGA", percentage: 100 },
    ]);
    if (overlay.kind !== "people-field") throw new Error("expected a field");

    expect(buildAtlasTargets(overlay)[0].center).toEqual(
      overlay.areas[0].center
    );
  });

  // The asset keys South Sudan by Natural Earth's SDS while the corpus writes
  // the ISO SSD. Rings resolve through the alias; the name has to as well, or
  // the 27 fiches declaring a South Sudan presence read a name off undefined.
  // @req REQ-117
  it("names a target whose geometry the asset files under another code", () => {
    const overlay = buildPeopleFieldOverlay([
      { country: "SSD", percentage: 100 },
    ]);
    if (overlay.kind !== "people-field") throw new Error("expected a field");

    const [target] = buildAtlasTargets(overlay);
    expect(target.countryId).toBe("SSD");
    expect(target.nameFr).toBeTruthy();
    expect(target.nameFr).not.toBe("SSD");
  });
});

describe("buildAtlasTargets for the continent scene (REQ-117 AC1)", () => {
  // @req REQ-117
  it("gives one target per field area, never one per country of the frame", () => {
    const overlay = buildContinentOverlay({ NGA: 40, KEN: 12, ZAF: 8 });
    if (overlay.kind !== "continent-field") throw new Error("expected a field");

    const targets = buildAtlasTargets(overlay);

    expect(targets).toHaveLength(overlay.areas.length);
    expect(overlay.frame.length).toBeGreaterThan(targets.length);
    expect(targets.map((target) => target.countryId)).toEqual([
      "NGA",
      "KEN",
      "ZAF",
    ]);
  });

  // @req REQ-117
  it("carries the documented-peoples count on the target so the panel never has to re-query it", () => {
    const overlay = buildContinentOverlay({ NGA: 40 });

    expect(buildAtlasTargets(overlay)[0].documentedPeopleCount).toBe(40);
  });

  // @req REQ-117
  it("keeps the count out of the title, which doubles as the marker's accessible name", () => {
    const [target] = buildAtlasTargets(buildContinentOverlay({ NGA: 40 }));
    const facts = continentTargetFacts(target);

    expect(facts.title).toBe("Nigeria");
    expect(facts.title).not.toMatch(/\d/);
    expect(facts.description).toBe("40 peuples documentés");
  });

  // @req REQ-117
  it("counts peoples, never a population, and agrees with itself in the singular", () => {
    const [target] = buildAtlasTargets(buildContinentOverlay({ NGA: 1 }));

    expect(continentTargetFacts(target).description).toBe("1 peuple documenté");
  });
});

/**
 * The country fiche's picker offers the whole corpus, not just the one country
 * the fiche draws. It is fed the corpus's own list — the atlas must not decide
 * which countries exist — and resolves each against the committed geometry.
 */
describe("buildCountryPickerTargets (REQ-117)", () => {
  // The corpus stores the official name; the asset stores the one people use.
  // The picker spread one Algerian option over five lines until it read the
  // latter.
  // @req REQ-117
  it("names each country the way it is spoken, not the way it is declared", () => {
    const targets = buildCountryPickerTargets(["DZA", "ZAF", "LBY"]);

    expect(targets.map((target) => target.nameFr)).toEqual([
      "Afrique du Sud",
      "Algérie",
      "Libye",
    ]);
  });

  // @req REQ-117
  it("orders them the way a French reader looks them up", () => {
    const targets = buildCountryPickerTargets(["ZWE", "EGY", "BEN"]);

    expect(targets.map((target) => target.nameFr)).toEqual([
      "Bénin",
      "Égypte",
      "Zimbabwe",
    ]);
  });

  // The asset keys South Sudan the Natural Earth way (SDS) and the corpus the
  // ISO way (SSD). Without the alias the country silently leaves the picker.
  // @req REQ-117
  it("resolves a country whose asset key differs from its ISO code", () => {
    const [target] = buildCountryPickerTargets(["SSD"]);

    expect(target.countryId).toBe("SSD");
    expect(target.angularSpanDeg).toBeGreaterThan(0);
  });

  // @req REQ-117
  it("drops a country the asset cannot draw rather than offering a dead option", () => {
    expect(buildCountryPickerTargets(["ZZZ"])).toEqual([]);
  });
});
