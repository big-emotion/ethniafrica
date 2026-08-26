import { describe, expect, it } from "vitest";
import type { GameCountryFixture, GameKingdom } from "@/lib/games/corpus";
import { buildKingdomRound } from "../kingdomRound";

const GHANA_EMPIRE: GameKingdom = {
  name: "Empire du Ghana",
  period: "VIIIe-XIIIe siècle",
  dominantPeoples: ["Soninké"],
  politicalCenters: ["Koumbi Saleh"],
  historicalRole:
    "L'empire contrôlait le commerce transsaharien de l'or et du sel.",
};

function makeCountry(
  overrides: Partial<GameCountryFixture> = {}
): GameCountryFixture {
  return {
    id: "MLI",
    nameFr: "Mali",
    etymology: "Du mandingue « mali », l'hippopotame.",
    nameOriginActor: "Nom repris à l'empire du Mali.",
    historicalNames: null,
    kingdoms: [GHANA_EMPIRE],
    ...overrides,
  };
}

const OTHER_COUNTRIES: GameCountryFixture[] = [
  makeCountry({ id: "DZA", nameFr: "Algérie", kingdoms: [] }),
  makeCountry({ id: "NGA", nameFr: "Nigeria", kingdoms: [] }),
  makeCountry({ id: "ETH", nameFr: "Éthiopie", kingdoms: [] }),
  makeCountry({ id: "ZAF", nameFr: "Afrique du Sud", kingdoms: [] }),
];

describe("buildKingdomRound", () => {
  // @req REQ-120
  it("makes the country the kingdom stood on the answer", () => {
    const round = buildKingdomRound(makeCountry(), OTHER_COUNTRIES);

    expect(round.kind).toBe("globeTap");
    expect(round.gameId).toBe("royaumes");
    expect(round.subjectId).toBe("MLI");
    expect(round.correctCountryId).toBe("MLI");
  });

  // @req REQ-120
  it("names the kingdom and its period in the prompt, never the country", () => {
    const round = buildKingdomRound(makeCountry(), OTHER_COUNTRIES);

    expect(round.promptFr).toContain("Empire du Ghana");
    expect(round.promptFr).toContain("VIIIe-XIIIe siècle");
    expect(round.promptFr).not.toContain("Mali");
  });

  // @req REQ-120
  it("picks the same kingdom on every call for a given country", () => {
    const country = makeCountry({
      kingdoms: [
        GHANA_EMPIRE,
        { ...GHANA_EMPIRE, name: "Empire songhaï" },
        { ...GHANA_EMPIRE, name: "Royaume bambara de Ségou" },
      ],
    });

    const first = buildKingdomRound(country, OTHER_COUNTRIES);
    const second = buildKingdomRound(country, OTHER_COUNTRIES);
    expect(first.promptFr).toBe(second.promptFr);
  });

  // @req REQ-120
  it("offers four tappable countries including the answer", () => {
    const round = buildKingdomRound(makeCountry(), OTHER_COUNTRIES);

    expect(round.choices).toHaveLength(4);
    expect(round.choices).toContain("MLI");
    expect(new Set(round.choices).size).toBe(4);
  });

  // @req REQ-120
  it("never offers a country the admin-0 asset cannot draw", () => {
    const withUnmappable = [
      makeCountry({ id: "SYC", nameFr: "Seychelles", kingdoms: [] }),
      ...OTHER_COUNTRIES,
    ];
    const round = buildKingdomRound(makeCountry(), withUnmappable);

    expect(round.choices).not.toContain("SYC");
  });

  // @req REQ-120
  it("reveals the historical role of the kingdom verbatim", () => {
    const round = buildKingdomRound(makeCountry(), OTHER_COUNTRIES);

    expect(round.reveal).toEqual({
      textFr: GHANA_EMPIRE.historicalRole,
      fieldPath: "content.kingdoms[].historicalRole",
    });
  });

  // @req REQ-120
  it("returns null when the country records no kingdom", () => {
    expect(
      buildKingdomRound(makeCountry({ kingdoms: [] }), OTHER_COUNTRIES)
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null when the picked kingdom has no historical role to reveal", () => {
    expect(
      buildKingdomRound(
        makeCountry({ kingdoms: [{ ...GHANA_EMPIRE, historicalRole: "" }] }),
        OTHER_COUNTRIES
      )
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null when fewer than four countries resolve on the globe", () => {
    expect(
      buildKingdomRound(makeCountry(), OTHER_COUNTRIES.slice(0, 2))
    ).toBeNull();
  });
});
