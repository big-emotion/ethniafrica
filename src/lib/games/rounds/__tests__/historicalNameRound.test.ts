import { describe, expect, it } from "vitest";
import type { GameCountryFixture } from "@/lib/games/corpus";
import { buildHistoricalNameRound } from "../historicalNameRound";

function makeCountry(
  overrides: Partial<GameCountryFixture> = {}
): GameCountryFixture {
  return {
    id: "TCD",
    nameFr: "Tchad",
    etymology:
      "Le nom vient du lac Tchad, « grande étendue d'eau » en kanouri.",
    nameOriginActor: "Nom repris par l'administration coloniale française.",
    historicalNames: {
      precolonial: "Royaume du Kanem-Bornou",
      colonization: "Tchad, Afrique-Équatoriale française",
    },
    kingdoms: [],
    ...overrides,
  };
}

// Only countries present in the committed admin-0 asset can be tapped; SHN is
// African but absent from it, so it must never become a choice.
const OTHER_COUNTRIES: GameCountryFixture[] = [
  makeCountry({ id: "DZA", nameFr: "Algérie" }),
  makeCountry({ id: "COD", nameFr: "Congo (RDC)" }),
  makeCountry({ id: "ZAF", nameFr: "Afrique du Sud" }),
  makeCountry({ id: "KEN", nameFr: "Kenya" }),
];

describe("buildHistoricalNameRound — the wrong answers are plausible", () => {
  // selectDistractors takes the first three of the pool, so an unsorted pool
  // hands it whatever the corpus happened to list first. Ordering the pool by
  // proximity is what makes the wrong answers worth ruling out; see
  // docs/design/games-charter.md §3.
  // @req REQ-120
  it("draws its distractors from the subject's neighbours", () => {
    const pool = [
      makeCountry({ id: "ZAF", nameFr: "Afrique du Sud" }),
      makeCountry({ id: "MDG", nameFr: "Madagascar" }),
      makeCountry({ id: "NER", nameFr: "Niger" }),
      makeCountry({ id: "SDN", nameFr: "Soudan" }),
      makeCountry({ id: "CMR", nameFr: "Cameroun" }),
    ];

    const round = buildHistoricalNameRound(makeCountry(), pool);

    // Chad's neighbours, not the two countries at the far end of the
    // continent — which is exactly what corpus order would have offered.
    expect(round.choices).toContain("TCD");
    expect(round.choices).not.toContain("ZAF");
    expect(round.choices).not.toContain("MDG");
  });

  // Proximity ordering has its own failure mode: if the answer were always
  // the geographic outlier of the four, the round would become guessable
  // from the map alone, in the other direction.
  // @req REQ-120
  it("does not leave the answer as the odd one out on the map", () => {
    const round = buildHistoricalNameRound(makeCountry(), [
      makeCountry({ id: "NER", nameFr: "Niger" }),
      makeCountry({ id: "SDN", nameFr: "Soudan" }),
      makeCountry({ id: "CMR", nameFr: "Cameroun" }),
      makeCountry({ id: "NGA", nameFr: "Nigeria" }),
    ]);

    expect(round.choices).toHaveLength(4);
    expect(new Set(round.choices).size).toBe(4);
  });
});

describe("buildHistoricalNameRound", () => {
  // @req REQ-120
  it("asks for the country carrying the former name, with the country itself as answer", () => {
    const round = buildHistoricalNameRound(makeCountry(), OTHER_COUNTRIES);

    expect(round.kind).toBe("globeTap");
    expect(round.gameId).toBe("pays-davant");
    expect(round.subjectId).toBe("TCD");
    expect(round.correctCountryId).toBe("TCD");
  });

  // @req REQ-120
  it("quotes the precolonial name in preference to the colonial one", () => {
    const round = buildHistoricalNameRound(makeCountry(), OTHER_COUNTRIES);

    expect(round.promptFr).toContain("Royaume du Kanem-Bornou");
    expect(round.promptFr).not.toContain("Afrique-Équatoriale");
    expect(round.promptFr).not.toContain("Tchad");
  });

  // @req REQ-120
  it("falls back through colonization, middle ages and antiquity when no precolonial name exists", () => {
    const round = buildHistoricalNameRound(
      makeCountry({ historicalNames: { antiquity: "Numidie" } }),
      OTHER_COUNTRIES
    );

    expect(round.promptFr).toContain("Numidie");
  });

  // @req REQ-120
  it("offers four tappable countries including the answer", () => {
    const round = buildHistoricalNameRound(makeCountry(), OTHER_COUNTRIES);

    expect(round.choices).toHaveLength(4);
    expect(round.choices).toContain("TCD");
    expect(new Set(round.choices).size).toBe(4);
  });

  // @req REQ-120
  it("never offers a country the admin-0 asset cannot draw", () => {
    const withUnmappable = [
      makeCountry({ id: "SHN", nameFr: "Sainte-Hélène" }),
      ...OTHER_COUNTRIES,
    ];
    const round = buildHistoricalNameRound(makeCountry(), withUnmappable);

    expect(round.choices).not.toContain("SHN");
  });

  // @req REQ-120
  it("reveals the etymology verbatim followed by the name-origin actor", () => {
    const country = makeCountry();
    const round = buildHistoricalNameRound(country, OTHER_COUNTRIES);

    expect(round.reveal.textFr).toContain(country.etymology);
    expect(round.reveal.textFr).toContain(country.nameOriginActor);
    expect(round.reveal.fieldPath).toBe("afrik_countries.etymology");
  });

  // @req REQ-120
  it("prints the sentence once when the name-origin actor repeats the etymology", () => {
    const duplicated = makeCountry({
      etymology: "Du lac Tchad.",
      nameOriginActor: "Du lac Tchad.",
    });
    const round = buildHistoricalNameRound(duplicated, OTHER_COUNTRIES);

    expect(round.reveal.textFr).toBe("Du lac Tchad.");
  });

  // @req REQ-120
  it("returns null when the country records no former name", () => {
    expect(
      buildHistoricalNameRound(
        makeCountry({ historicalNames: null }),
        OTHER_COUNTRIES
      )
    ).toBeNull();
    expect(
      buildHistoricalNameRound(
        makeCountry({ historicalNames: { contemporary: "Tchad" } }),
        OTHER_COUNTRIES
      )
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null when fewer than four countries resolve on the globe", () => {
    expect(
      buildHistoricalNameRound(makeCountry(), OTHER_COUNTRIES.slice(0, 2))
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null when the answer itself cannot be drawn on the globe", () => {
    expect(
      buildHistoricalNameRound(makeCountry({ id: "SHN" }), OTHER_COUNTRIES)
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null when the country carries no etymology to reveal", () => {
    expect(
      buildHistoricalNameRound(
        makeCountry({ etymology: null, nameOriginActor: null }),
        OTHER_COUNTRIES
      )
    ).toBeNull();
  });
});
