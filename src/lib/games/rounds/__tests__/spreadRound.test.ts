import { describe, expect, it } from "vitest";
import type { GamePeopleFixture } from "@/lib/games/corpus";
import { getAdmin0Rings } from "@/lib/atlas/overlays";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { buildSpreadRound } from "../spreadRound";

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
    currentCountries: ["NGA", "BEN", "TGO"],
    totalPopulation: 45_000_000,
    distributionByCountry: [
      { country: "BEN", population: 1_200_000 },
      { country: "NGA", population: 40_000_000 },
      { country: "TGO", population: 300_000 },
    ],
    languageFamilyId: "FLG_NIGER_CONGO",
    languageFamilyNameFr: "Niger-Congo",
    ...overrides,
  };
}

const frenchNumber = new Intl.NumberFormat("fr-FR");

describe("buildSpreadRound", () => {
  // @req REQ-120
  it("compares the two countries holding the most of this people", () => {
    const round = buildSpreadRound(peopleFixture());

    expect(round.kind).toBe("areaCompare");
    expect(round.gameId).toBe("repartition");
    expect(round.subjectId).toBe("PPL_YORUBA");
    expect(round.promptFr).toBe(getGameBySlug("repartition").promptFr);
    expect(round.shapes.map((shape) => shape.labelFr).sort()).toEqual([
      "BEN",
      "NGA",
    ]);
    expect(round.shapes[round.correctIndex].labelFr).toBe("NGA");
  });

  // @req REQ-120
  it("draws each country from its committed outline", () => {
    const round = buildSpreadRound(peopleFixture());
    const nigeria = round.shapes[round.correctIndex];

    expect(nigeria.rings).toEqual(getAdmin0Rings("NGA"));
    expect(nigeria.areaKm2).toBeGreaterThan(0);
  });

  // @req REQ-120
  it("uses the country names it is given, and the id when it is given none", () => {
    const round = buildSpreadRound(peopleFixture(), {
      NGA: "Nigeria",
      BEN: "Bénin",
    });

    expect(round.shapes.map((shape) => shape.labelFr).sort()).toEqual([
      "Bénin",
      "Nigeria",
    ]);
  });

  // @req REQ-120
  it("captions each outline with the stored population, in French", () => {
    const round = buildSpreadRound(peopleFixture());

    expect(round.shapes[round.correctIndex].captionFr).toContain(
      frenchNumber.format(40_000_000)
    );
    expect(round.shapes[1 - round.correctIndex].captionFr).toContain(
      frenchNumber.format(1_200_000)
    );
  });

  // @req REQ-120
  it("reveals both stored populations and where they were read", () => {
    const round = buildSpreadRound(peopleFixture());

    expect(round.reveal.textFr).toContain(frenchNumber.format(40_000_000));
    expect(round.reveal.textFr).toContain(frenchNumber.format(1_200_000));
    expect(round.reveal.fieldPath).toBe(
      "content.demography.distributionByCountry"
    );
  });

  // @req REQ-120
  it("does not always answer in the same slot", () => {
    const first = buildSpreadRound(peopleFixture({ id: "PPL_A" }));
    const second = buildSpreadRound(peopleFixture({ id: "PPL_B" }));

    expect(first.correctIndex).not.toBe(second.correctIndex);
  });

  // @req REQ-120
  it("returns null when fewer than two countries carry a population", () => {
    expect(
      buildSpreadRound(
        peopleFixture({
          distributionByCountry: [{ country: "NGA", population: 40_000_000 }],
        })
      )
    ).toBeNull();
    expect(
      buildSpreadRound(
        peopleFixture({
          distributionByCountry: [
            { country: "NGA", population: 40_000_000 },
            { country: "BEN", population: null },
          ],
        })
      )
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null when the two largest shares are recorded as equal", () => {
    expect(
      buildSpreadRound(
        peopleFixture({
          distributionByCountry: [
            { country: "NGA", population: 1_000_000 },
            { country: "BEN", population: 1_000_000 },
          ],
        })
      )
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null when one of the two countries has no committed outline", () => {
    expect(
      buildSpreadRound(
        peopleFixture({
          distributionByCountry: [
            { country: "NGA", population: 40_000_000 },
            { country: "CPV", population: 1_200_000 },
          ],
        })
      )
    ).toBeNull();
  });
});
