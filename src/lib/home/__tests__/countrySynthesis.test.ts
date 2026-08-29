import { describe, expect, it } from "vitest";

import {
  deriveCountrySynthesis,
  hasRenderableSynthesis,
} from "@/lib/home/countrySynthesis";
import type { Country } from "@/types/afrik";

function country(overrides: Partial<Country> = {}): Country {
  return {
    id: "BFA",
    nameFr: "Burkina Faso",
    summary: "Le nom du Burkina Faso est composé dans deux langues nationales.",
    content: {
      historicalNames: {
        formerNames: ["Haute-Volta (1919-1960)", "République de Haute-Volta"],
        colonization: "1919-1960 : Haute-Volta, partie de l'AOF.",
      },
      kingdoms: [
        { name: "Royaumes Mossi" },
        { name: "Royaume de Fada N'Gourma" },
      ],
      majorPeoples: [
        { name: "Mossi", peopleId: "PPL_MOSSI", languages: ["Mooré"] },
        {
          name: "Peul / Fulani",
          peopleId: "PPL_PEUL",
          languages: ["Fulfulde"],
        },
      ],
      culture: {
        mainLanguages: [{ name: "Français" }, { name: "Mooré" }],
      },
    },
    ...overrides,
  } as Country;
}

describe("deriveCountrySynthesis", () => {
  // @req REQ-113
  it("carries the chapeau and the former names the fiche holds", () => {
    const synthesis = deriveCountrySynthesis(country());

    expect(synthesis.summary).toContain("deux langues nationales");
    expect(synthesis.formerNames).toEqual([
      "Haute-Volta (1919-1960)",
      "République de Haute-Volta",
    ]);
  });

  // @req REQ-113
  it("keeps each people's id so the card can link to its fiche", () => {
    const synthesis = deriveCountrySynthesis(country());

    expect(synthesis.peoples).toEqual([
      { name: "Mossi", peopleId: "PPL_MOSSI" },
      { name: "Peul / Fulani", peopleId: "PPL_PEUL" },
    ]);
  });

  // @req REQ-113
  it("reads languages from the culture section when it has them", () => {
    const synthesis = deriveCountrySynthesis(country());

    expect(synthesis.languages).toEqual(["Français", "Mooré"]);
  });

  // The 14 fiches with no mainLanguages — RDC, Nigeria, Kenya, Afrique du
  // Sud among them — each still name 4 to 14 languages through their
  // peoples. Without this fallback a quarter of the corpus would render a
  // card with an empty language line.
  // @req REQ-113
  it("falls back to the peoples' languages when the culture section has none", () => {
    const fiche = country({
      content: {
        ...country().content,
        culture: { culturalTraditions: "Traditions mossi." },
      },
    });

    const synthesis = deriveCountrySynthesis(fiche);

    expect(synthesis.languages).toEqual(["Mooré", "Fulfulde"]);
  });

  // @req REQ-113
  it("does not repeat a language two peoples share", () => {
    const fiche = country({
      content: {
        ...country().content,
        culture: {},
        majorPeoples: [
          { name: "Mossi", languages: ["Mooré", "Dioula"] },
          { name: "Bobo", languages: ["Dioula"] },
        ],
      },
    });

    expect(deriveCountrySynthesis(fiche).languages).toEqual([
      "Mooré",
      "Dioula",
    ]);
  });

  // @req REQ-113
  it("survives a fiche whose content sections are missing entirely", () => {
    const synthesis = deriveCountrySynthesis({
      id: "XXX",
      nameFr: "Pays sans contenu",
      content: {},
    } as Country);

    expect(synthesis.summary).toBeNull();
    expect(synthesis.formerNames).toEqual([]);
    expect(synthesis.peoples).toEqual([]);
    expect(synthesis.languages).toEqual([]);
  });
});

describe("hasRenderableSynthesis", () => {
  // A card exists to show what the corpus holds. One that can state neither
  // a chapeau nor a single people is not a sparse card, it is an empty one —
  // and the atlas charter asks surfaces to skip those rather than dress them.
  // @req REQ-113
  it("rejects a synthesis with neither chapeau nor peoples", () => {
    const empty = deriveCountrySynthesis({
      id: "XXX",
      nameFr: "Pays sans contenu",
      content: {},
    } as Country);

    expect(hasRenderableSynthesis(empty)).toBe(false);
  });

  // @req REQ-113
  it("accepts a synthesis that has a chapeau even with nothing else", () => {
    const bare = deriveCountrySynthesis({
      id: "XXX",
      nameFr: "Pays",
      summary: "Un chapeau suffit à faire une carte.",
      content: {},
    } as Country);

    expect(hasRenderableSynthesis(bare)).toBe(true);
  });
});
