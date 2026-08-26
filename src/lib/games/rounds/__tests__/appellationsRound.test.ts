import { describe, expect, it } from "vitest";
import type { GamePeopleFixture } from "@/lib/games/corpus";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { buildAppellationsRound } from "../appellationsRound";

function peopleFixture(
  overrides: Partial<GamePeopleFixture> = {}
): GamePeopleFixture {
  return {
    id: "PPL_BAMILEKE",
    nameMain: "Bamiléké",
    name: { autonym: "Bamiléké" },
    selfAppellation: "Bamiléké",
    exonyms: ["Bamiléké-Grassfields", "Grassfielders"],
    originOfExonyms:
      "Le terme Grassfields est une désignation coloniale britannique désignant les hautes terres de l'Ouest camerounais.",
    currentCountries: ["CMR"],
    totalPopulation: 8_000_000,
    distributionByCountry: [{ country: "CMR", population: 8_000_000 }],
    languageFamilyId: "FLG_NIGER_CONGO",
    languageFamilyNameFr: "Niger-Congo",
    ...overrides,
  };
}

describe("buildAppellationsRound", () => {
  // @req REQ-120
  it("offers the self-appellation against the first recorded exonym", () => {
    const round = buildAppellationsRound(peopleFixture());

    expect(round.kind).toBe("binary");
    expect(round.gameId).toBe("appellations");
    expect(round.subjectId).toBe("PPL_BAMILEKE");
    expect(round.promptFr).toBe(getGameBySlug("appellations").promptFr);
    expect(round.options.map((option) => option.labelFr).sort()).toEqual(
      ["Bamiléké", "Bamiléké-Grassfields"].sort()
    );
  });

  // @req REQ-120
  it("marks the self-appellation as the correct answer", () => {
    const round = buildAppellationsRound(
      peopleFixture({ selfAppellation: "Wolof", exonyms: ["Ouolof"] })
    );

    expect(round.options[round.correctIndex].labelFr).toBe("Wolof");
  });

  // @req REQ-120
  it("quotes the recorded origin of the exonyms as the reveal", () => {
    const people = peopleFixture();
    const round = buildAppellationsRound(people);

    expect(round.reveal.textFr).toBe(people.originOfExonyms);
    expect(round.reveal.fieldPath).toBe("content.appellations.originOfExonyms");
  });

  // @req REQ-120
  it("does not always answer in the same slot", () => {
    const first = buildAppellationsRound(peopleFixture({ id: "PPL_A" }));
    const second = buildAppellationsRound(peopleFixture({ id: "PPL_B" }));

    expect(first.correctIndex).not.toBe(second.correctIndex);
  });

  // @req REQ-120
  it("answers in the same slot every time for one people", () => {
    const people = peopleFixture();

    expect(buildAppellationsRound(people).correctIndex).toBe(
      buildAppellationsRound(people).correctIndex
    );
  });

  // @req REQ-120
  it("returns null when the people has no recorded self-appellation", () => {
    expect(
      buildAppellationsRound(peopleFixture({ selfAppellation: null }))
    ).toBeNull();
    expect(
      buildAppellationsRound(peopleFixture({ selfAppellation: "  " }))
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null when the people has no recorded exonym", () => {
    expect(buildAppellationsRound(peopleFixture({ exonyms: [] }))).toBeNull();
    expect(buildAppellationsRound(peopleFixture({ exonyms: [""] }))).toBeNull();
  });

  // @req REQ-120
  it("returns null when the exonym repeats the self-appellation", () => {
    expect(
      buildAppellationsRound(
        peopleFixture({ selfAppellation: "Wolof", exonyms: ["Wolof"] })
      )
    ).toBeNull();
  });

  // A reveal is quoted, never composed: with no recorded origin there is
  // nothing honest to show, so the round does not exist (FR65/FR66).
  // @req REQ-120
  it("returns null when the origin of the exonyms is not recorded", () => {
    expect(
      buildAppellationsRound(peopleFixture({ originOfExonyms: null }))
    ).toBeNull();
  });
});
