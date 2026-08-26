import { describe, expect, it } from "vitest";

import { peopleFallbackNote } from "@/components/people/peopleFallbackNote";
import { buildPeopleFieldOverlay } from "@/lib/atlas/overlays";

describe("peopleFallbackNote (REQ-116)", () => {
  // AfricaBasemap is aria-hidden, so on the non-WebGL path this sentence is
  // the entirety of what a screen reader is told about the map.
  // @req REQ-116
  it("names the people and how many countries the flat map is showing", () => {
    const note = peopleFallbackNote(
      "Yoruba",
      buildPeopleFieldOverlay([
        { country: "NGA", population: 45500000 },
        { country: "BEN", population: 1800000 },
      ])
    );

    expect(note).toContain("Yoruba");
    expect(note).toContain("2 pays");
    expect(note).toMatch(/pas un territoire/);
  });

  // @req REQ-116
  it("counts the one country in the singular", () => {
    const note = peopleFallbackNote(
      "Zoulou",
      buildPeopleFieldOverlay([{ country: "ZAF", population: 12000000 }])
    );

    expect(note).toContain("1 pays de présence");
    expect(note).not.toContain("pays de présences");
  });

  // A presence the map cannot place is still declared, and the note is the
  // only place a non-WebGL reader would learn the count differs.
  // @req REQ-119
  it("says how many declared presences fall outside the map", () => {
    const note = peopleFallbackNote(
      "Igbo",
      buildPeopleFieldOverlay([
        { country: "NGA", population: 40000000 },
        { country: "USA", population: 500000 },
      ])
    );

    expect(note).toMatch(/1 .*hors carte/);
  });

  // @req REQ-119
  it("returns nothing when there is no field to describe", () => {
    expect(peopleFallbackNote("Yoruba", buildPeopleFieldOverlay([]))).toBe("");
  });
});
