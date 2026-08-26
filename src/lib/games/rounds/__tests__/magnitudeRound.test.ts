import { describe, expect, it } from "vitest";
import type { GamePeopleFixture } from "@/lib/games/corpus";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { buildMagnitudeRound } from "../magnitudeRound";

function peopleFixture(
  overrides: Partial<GamePeopleFixture> = {}
): GamePeopleFixture {
  return {
    id: "PPL_YORUBA",
    nameMain: "Yorùbá",
    name: { autonym: "Yorùbá", exonym: "Yoruba" },
    selfAppellation: "Yorùbá",
    exonyms: ["Yoruba"],
    originOfExonyms: null,
    currentCountries: ["NGA"],
    totalPopulation: 45_000_000,
    distributionByCountry: [{ country: "NGA", population: 40_000_000 }],
    languageFamilyId: "FLG_NIGER_CONGO",
    languageFamilyNameFr: "Niger-Congo",
    ...overrides,
  };
}

const igbo = peopleFixture({
  id: "PPL_IGBO",
  nameMain: "Igbo",
  name: { autonym: "Ndị Igbo", exonym: "Igbo" },
  totalPopulation: 35_000_000,
});

const frenchNumber = new Intl.NumberFormat("fr-FR");

describe("buildMagnitudeRound", () => {
  // @req REQ-120
  it("offers the two peoples and answers with the more numerous one", () => {
    const round = buildMagnitudeRound(peopleFixture(), igbo);

    expect(round.kind).toBe("binary");
    expect(round.gameId).toBe("plus-ou-moins");
    expect(round.promptFr).toBe(getGameBySlug("plus-ou-moins").promptFr);
    expect(round.options.map((option) => option.labelFr)).toEqual([
      "Yorùbá",
      "Igbo",
    ]);
    expect(round.options[round.correctIndex].labelFr).toBe("Yorùbá");
  });

  // @req REQ-120
  it("answers with the more numerous people whichever side it is passed on", () => {
    const round = buildMagnitudeRound(igbo, peopleFixture());

    expect(round.correctIndex).toBe(1);
  });

  // @req REQ-120
  it("carries the autonym and exonym so the caller never renders a bare name", () => {
    const round = buildMagnitudeRound(peopleFixture(), igbo);

    expect(round.options[0].name).toEqual({
      autonym: "Yorùbá",
      exonym: "Yoruba",
    });
    expect(round.options[1].name).toEqual({
      autonym: "Ndị Igbo",
      exonym: "Igbo",
    });
  });

  // @req REQ-120
  it("reveals both stored figures, formatted in French", () => {
    const round = buildMagnitudeRound(peopleFixture(), igbo);

    expect(round.reveal.textFr).toContain(frenchNumber.format(45_000_000));
    expect(round.reveal.textFr).toContain(frenchNumber.format(35_000_000));
    expect(round.reveal.textFr).not.toContain("45000000");
    expect(round.reveal.fieldPath).toBe("content.demography.totalPopulation");
  });

  // @req REQ-120
  it("returns null when either people has no recorded population", () => {
    expect(
      buildMagnitudeRound(peopleFixture({ totalPopulation: null }), igbo)
    ).toBeNull();
    expect(
      buildMagnitudeRound(
        peopleFixture(),
        peopleFixture({ totalPopulation: null })
      )
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null when a recorded population is not a positive count", () => {
    expect(
      buildMagnitudeRound(peopleFixture({ totalPopulation: 0 }), igbo)
    ).toBeNull();
    expect(
      buildMagnitudeRound(peopleFixture({ totalPopulation: -1 }), igbo)
    ).toBeNull();
  });

  // Equal counts have no right answer, and inventing one would be exactly the
  // fabrication FR65/FR66 forbid.
  // @req REQ-120
  it("returns null when the two peoples are recorded as equally numerous", () => {
    expect(
      buildMagnitudeRound(
        peopleFixture({ totalPopulation: 1_000_000 }),
        peopleFixture({ id: "PPL_OTHER", totalPopulation: 1_000_000 })
      )
    ).toBeNull();
  });
});
