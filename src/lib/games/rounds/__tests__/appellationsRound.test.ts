import { describe, expect, it } from "vitest";
import type { GamePeopleFixture } from "@/lib/games/corpus";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { frenchNumber } from "@/lib/games/format";
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
    sources: [
      { label: "Dictionnaire des peuples", url: null, standing: "referenced" },
    ],
    confidence: {
      score: 68,
      sourceCount: 2,
      lastHumanAuditAt: "2026-01-15T00:00:00.000Z",
    },
    ...overrides,
  };
}

const COUNTRY_NAMES: Record<string, string> = {
  CMR: "Cameroun",
  SEN: "Sénégal",
};

describe("buildAppellationsRound — the round names its subject", () => {
  // Without this the round reads « lequel de ces deux noms le peuple se
  // donne-t-il à lui-même ? — Toro / Abatooro » and never says which people,
  // which makes it a coin flip. See docs/design/games-charter.md §2.
  // @req REQ-120
  it("situates the people by family and country before asking", () => {
    const round = buildAppellationsRound(peopleFixture(), COUNTRY_NAMES);

    expect(round.stimulus?.subjectName.autonym).toBe("Bamiléké");
    expect(round.stimulus?.familyFr).toBe("Niger-Congo");
    expect(round.stimulus?.countriesFr).toEqual(["Cameroun"]);
  });

  // A country the corpus names by ISO code alone would put "CMR" on screen.
  // @req REQ-120
  it("drops a country it cannot name rather than showing its code", () => {
    const round = buildAppellationsRound(
      peopleFixture({ currentCountries: ["CMR", "XXX"] }),
      COUNTRY_NAMES
    );

    expect(round.stimulus?.countriesFr).toEqual(["Cameroun"]);
  });

  // @req REQ-120
  it("states the scale of the people in words a reader can hold", () => {
    const round = buildAppellationsRound(peopleFixture(), COUNTRY_NAMES);

    expect(round.stimulus?.scaleFr).toBe(
      `environ ${frenchNumber.format(8_000_000)} personnes`
    );
  });

  // A fiche with no demography must not read "environ null personnes".
  // @req REQ-120
  it("omits the scale when the corpus does not carry one", () => {
    const round = buildAppellationsRound(
      peopleFixture({ totalPopulation: null }),
      COUNTRY_NAMES
    );

    expect(round.stimulus?.scaleFr).toBeUndefined();
  });
});

describe("buildAppellationsRound", () => {
  // @req REQ-120
  it("offers the self-appellation against the first recorded exonym", () => {
    const round = buildAppellationsRound(peopleFixture(), COUNTRY_NAMES);

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
      peopleFixture({ selfAppellation: "Wolof", exonyms: ["Ouolof"] }),
      COUNTRY_NAMES
    );

    expect(round.options[round.correctIndex].labelFr).toBe("Wolof");
  });

  // @req REQ-120
  it("quotes the recorded origin of the exonyms as the reveal", () => {
    const people = peopleFixture();
    const round = buildAppellationsRound(people, COUNTRY_NAMES);

    expect(round.reveal.textFr).toBe(people.originOfExonyms);
    expect(round.reveal.fieldPath).toBe("content.appellations.originOfExonyms");
  });

  // @req REQ-120
  it("does not always answer in the same slot", () => {
    const first = buildAppellationsRound(
      peopleFixture({ id: "PPL_A" }),
      COUNTRY_NAMES
    );
    const second = buildAppellationsRound(
      peopleFixture({ id: "PPL_B" }),
      COUNTRY_NAMES
    );

    expect(first.correctIndex).not.toBe(second.correctIndex);
  });

  // @req REQ-120
  it("answers in the same slot every time for one people", () => {
    const people = peopleFixture();

    expect(buildAppellationsRound(people, COUNTRY_NAMES).correctIndex).toBe(
      buildAppellationsRound(people, COUNTRY_NAMES).correctIndex
    );
  });

  // @req REQ-120
  it("returns null when the people has no recorded self-appellation", () => {
    expect(
      buildAppellationsRound(
        peopleFixture({ selfAppellation: null }),
        COUNTRY_NAMES
      )
    ).toBeNull();
    expect(
      buildAppellationsRound(
        peopleFixture({ selfAppellation: "  " }),
        COUNTRY_NAMES
      )
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null when the people has no recorded exonym", () => {
    expect(
      buildAppellationsRound(peopleFixture({ exonyms: [] }), COUNTRY_NAMES)
    ).toBeNull();
    expect(
      buildAppellationsRound(peopleFixture({ exonyms: [""] }), COUNTRY_NAMES)
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null when the exonym repeats the self-appellation", () => {
    expect(
      buildAppellationsRound(
        peopleFixture({ selfAppellation: "Wolof", exonyms: ["Wolof"] }),
        COUNTRY_NAMES
      )
    ).toBeNull();
  });

  // A reveal is quoted, never composed: with no recorded origin there is
  // nothing honest to show, so the round does not exist (FR65/FR66).
  // @req REQ-120
  it("returns null when the origin of the exonyms is not recorded", () => {
    expect(
      buildAppellationsRound(
        peopleFixture({ originOfExonyms: null }),
        COUNTRY_NAMES
      )
    ).toBeNull();
  });
});
