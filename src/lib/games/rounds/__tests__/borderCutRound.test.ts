import { describe, expect, it } from "vitest";
import type { CountryId } from "@/types/afrik";
import type { GamePeopleFixture } from "@/lib/games/corpus";
import { buildBorderCutRound } from "../borderCutRound";

function makePeople(currentCountries: CountryId[]): GamePeopleFixture {
  return {
    id: "PPL_00007",
    nameMain: "Kanouri",
    name: { autonym: "Kanuri", exonym: "Kanouri" },
    selfAppellation: "Kanuri",
    exonyms: [],
    originOfExonyms: null,
    currentCountries,
    totalPopulation: null,
    distributionByCountry: [],
    languageFamilyId: "FLG_NILO_SAHARIEN",
    languageFamilyNameFr: "Nilo-saharien",
  };
}

describe("buildBorderCutRound", () => {
  // @req REQ-120
  it("offers the same four count buckets in the same order for every people", () => {
    const round = buildBorderCutRound(makePeople(["NGA", "NER"]));

    expect(round.kind).toBe("quad");
    expect(round.gameId).toBe("frontieres");
    expect(round.options.map((option) => option.labelFr)).toEqual([
      "1",
      "2",
      "3",
      "4 ou plus",
    ]);
  });

  // @req REQ-120
  it("points at the bucket matching the number of present-day countries", () => {
    const round = buildBorderCutRound(makePeople(["NGA", "NER"]));

    expect(round.options[round.correctIndex].labelFr).toBe("2");
  });

  // @req REQ-120
  it("collapses any people spread over four or more countries into the last bucket", () => {
    const round = buildBorderCutRound(
      makePeople(["NGA", "NER", "TCD", "CMR", "SDN"])
    );

    expect(round.options[round.correctIndex].labelFr).toBe("4 ou plus");
  });

  // @req REQ-120
  it("keeps a single-country people on the first bucket", () => {
    const round = buildBorderCutRound(makePeople(["ETH"]));

    expect(round.correctIndex).toBe(0);
  });

  // @req REQ-120
  it("reveals the countries the people actually spans, from currentCountries", () => {
    const round = buildBorderCutRound(makePeople(["NGA", "NER", "TCD"]));

    expect(round.reveal.textFr).toContain("NGA");
    expect(round.reveal.textFr).toContain("NER");
    expect(round.reveal.textFr).toContain("TCD");
    expect(round.reveal.fieldPath).toBe("currentCountries");
  });

  // @req REQ-120
  it("names the people in the prompt", () => {
    const round = buildBorderCutRound(makePeople(["NGA", "NER"]));

    expect(round.promptFr).toContain("Kanouri");
  });

  // @req REQ-120
  it("returns null when the people is attached to no country", () => {
    expect(buildBorderCutRound(makePeople([]))).toBeNull();
  });
});

describe("buildBorderCutRound country names", () => {
  // A reveal reading « NGA, NER » makes the reader decode the answer.
  // @req REQ-120
  it("names the countries when the caller supplies a name map", () => {
    const round = buildBorderCutRound(makePeople(["NGA", "NER"]), {
      NGA: "Nigeria",
      NER: "Niger",
    });

    expect(round?.reveal.textFr).toContain("Nigeria, Niger");
    expect(round?.reveal.textFr).not.toContain("NGA");
  });

  // @req REQ-120
  it("falls back to the ISO code rather than dropping an unmapped country", () => {
    const round = buildBorderCutRound(makePeople(["NGA", "NER"]), {
      NGA: "Nigeria",
    });

    expect(round?.reveal.textFr).toContain("Nigeria, NER");
  });
});
