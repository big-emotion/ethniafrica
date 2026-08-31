import { describe, expect, it } from "vitest";

import {
  PEOPLE_FIELD_DIMMED_INTENSITY,
  orderedPeopleFieldAreas,
  peopleFieldIntensity,
} from "@/lib/atlas/peopleField";
import type { PeopleFieldArea } from "@/lib/atlas/overlays";

const area = (countryId: string, populationShare: number): PeopleFieldArea => ({
  countryId,
  center: { lon: 0, lat: 0 },
  populationShare,
});

/**
 * The facts about how a people's field is encoded live here rather than in
 * either renderer, so the WebGL path and the SVG fallback cannot disagree
 * about them. Before this module, focus dimming existed only in the fallback:
 * choosing a country dimmed the other halos without WebGL and did nothing with
 * it — the same overlay reading differently depending on the reader's driver.
 */
describe("people field encoding (atlas charter §1)", () => {
  // @req REQ-116
  it("leaves an unfocused halo visible rather than hiding it", () => {
    const dimmed = peopleFieldIntensity("BEN", "NGA");

    expect(dimmed).toBe(PEOPLE_FIELD_DIMMED_INTENSITY);
    // A halo faded to nothing is a halo no longer reachable by keyboard, and
    // the country it stands for stops existing on the page.
    expect(dimmed).toBeGreaterThan(0);
    expect(dimmed).toBeLessThan(1);
  });

  // @req REQ-116
  it("holds every halo at full intensity while nothing is focused", () => {
    expect(peopleFieldIntensity("NGA", null)).toBe(1);
    expect(peopleFieldIntensity("BEN", null)).toBe(1);
  });

  // @req REQ-116
  it("gives the focused country full intensity", () => {
    expect(peopleFieldIntensity("NGA", "NGA")).toBe(1);
  });

  // PPL_BANTU declares 21 countries. Painted in fiche order, a 400-million
  // halo lands on top of a 200-thousand one and the small presence is gone —
  // the map would then be saying the country has no Bantu presence at all.
  // @req REQ-116
  it("draws the largest halo first so the smallest stays legible on top", () => {
    const ordered = orderedPeopleFieldAreas([
      area("BEN", 0.2),
      area("NGA", 1),
      area("TGO", 0.05),
    ]);

    expect(ordered.map((entry) => entry.countryId)).toEqual([
      "NGA",
      "BEN",
      "TGO",
    ]);
  });

  // @req REQ-116
  it("does not mutate the overlay it was handed", () => {
    const areas = [area("BEN", 0.2), area("NGA", 1)];
    orderedPeopleFieldAreas(areas);

    expect(areas.map((entry) => entry.countryId)).toEqual(["BEN", "NGA"]);
  });
});
