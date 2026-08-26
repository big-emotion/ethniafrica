import { describe, expect, it } from "vitest";
import type { GameFamilyFixture, GamePeopleFixture } from "@/lib/games/corpus";
import { buildFamilyRound } from "../familyRound";

function makePeople(
  overrides: Partial<GamePeopleFixture> = {}
): GamePeopleFixture {
  return {
    id: "PPL_00042",
    nameMain: "Yoruba",
    name: { autonym: "Yorùbá", exonym: "Yoruba" },
    selfAppellation: "Yorùbá",
    exonyms: [],
    originOfExonyms: null,
    currentCountries: ["NGA"],
    totalPopulation: null,
    distributionByCountry: [],
    languageFamilyId: "FLG_NIGER_CONGO",
    languageFamilyNameFr: "Niger-Congo",
    ...overrides,
  };
}

const FAMILIES: GameFamilyFixture[] = [
  { id: "FLG_NIGER_CONGO", nameFr: "Niger-Congo" },
  { id: "FLG_NILO_SAHARIEN", nameFr: "Nilo-saharien" },
  { id: "FLG_AFRO_ASIATIQUE", nameFr: "Afro-asiatique" },
  { id: "FLG_KHOISAN", nameFr: "Khoïsan" },
  { id: "FLG_AUSTRONESIEN", nameFr: "Austronésien" },
];

describe("buildFamilyRound", () => {
  // @req REQ-120
  it("makes the people's own linguistic family the correct option", () => {
    const round = buildFamilyRound(makePeople(), FAMILIES);

    expect(round.kind).toBe("quad");
    expect(round.gameId).toBe("familles");
    expect(round.subjectId).toBe("PPL_00042");
    expect(round.options[round.correctIndex].labelFr).toBe("Niger-Congo");
  });

  // @req REQ-120
  it("draws every wrong option verbatim from the other families of the corpus", () => {
    const round = buildFamilyRound(makePeople(), FAMILIES);
    const familyNames = FAMILIES.map((family) => family.nameFr);

    const wrongLabels = round.options
      .filter((_option, index) => index !== round.correctIndex)
      .map((option) => option.labelFr);
    expect(wrongLabels).toHaveLength(3);
    expect(wrongLabels).not.toContain("Niger-Congo");
    for (const label of wrongLabels) {
      expect(familyNames).toContain(label);
    }
  });

  // @req REQ-120
  it("names the people in the prompt", () => {
    const round = buildFamilyRound(makePeople(), FAMILIES);

    expect(round.promptFr).toContain("Yoruba");
    expect(round.promptFr).not.toContain("Niger-Congo");
  });

  // @req REQ-120
  it("reveals the family and the people, pointing at the join column", () => {
    const round = buildFamilyRound(makePeople(), FAMILIES);

    expect(round.reveal.textFr).toContain("Niger-Congo");
    expect(round.reveal.textFr).toContain("Yoruba");
    expect(round.reveal.fieldPath).toBe("afrik_peoples.language_family_id");
  });

  // @req REQ-120
  it("returns null when the people carries no family name", () => {
    expect(
      buildFamilyRound(makePeople({ languageFamilyNameFr: null }), FAMILIES)
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null rather than padding when fewer than three other families exist", () => {
    expect(buildFamilyRound(makePeople(), FAMILIES.slice(0, 3))).toBeNull();
  });
});
