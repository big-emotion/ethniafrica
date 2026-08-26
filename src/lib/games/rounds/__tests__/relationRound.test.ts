import { describe, expect, it } from "vitest";
import type {
  GamePeopleFixture,
  GameRelationFixture,
} from "@/lib/games/corpus";
import { buildRelationRound } from "../relationRound";

function makePeople(id: string, nameMain: string): GamePeopleFixture {
  return {
    id,
    nameMain,
    name: { autonym: nameMain, exonym: `${nameMain} (exonyme)` },
    selfAppellation: nameMain,
    exonyms: [],
    originOfExonyms: null,
    currentCountries: [],
    totalPopulation: null,
    distributionByCountry: [],
    languageFamilyId: null,
    languageFamilyNameFr: null,
  };
}

const HAOUSSA = makePeople("PPL_00001", "Haoussa");
const DJERMA = makePeople("PPL_00002", "Djerma");
const POOL = [
  HAOUSSA,
  DJERMA,
  makePeople("PPL_00003", "Kanouri"),
  makePeople("PPL_00004", "Touareg"),
  makePeople("PPL_00005", "Peul"),
];

const PEOPLE_BY_ID = new Map(POOL.map((people) => [people.id, people]));

const RELATION: GameRelationFixture = {
  id: "REL_00001",
  relationType: "commercial",
  peopleIdA: HAOUSSA.id,
  peopleIdB: DJERMA.id,
  description:
    "Les marchands haoussa approvisionnent les marchés djerma en sel et en cola.",
  periodLabel: "XVe-XIXe siècle",
};

describe("buildRelationRound", () => {
  // @req REQ-120
  it("makes the people at the other end of the link the correct option", () => {
    const round = buildRelationRound(RELATION, PEOPLE_BY_ID, POOL);

    expect(round.kind).toBe("quad");
    expect(round.gameId).toBe("liens");
    expect(round.subjectId).toBe("REL_00001");
    expect(round.options[round.correctIndex].labelFr).toBe("Djerma");
  });

  // @req REQ-120
  it("draws every wrong option verbatim from the pool, never from the relation types", () => {
    const round = buildRelationRound(RELATION, PEOPLE_BY_ID, POOL);
    const poolNames = POOL.map((people) => people.nameMain);

    const wrongOptions = round.options.filter(
      (_option, index) => index !== round.correctIndex
    );
    expect(wrongOptions).toHaveLength(3);
    for (const option of wrongOptions) {
      expect(poolNames).toContain(option.labelFr);
    }
  });

  // @req REQ-120
  it("excludes both ends of the link from the wrong options", () => {
    const round = buildRelationRound(RELATION, PEOPLE_BY_ID, POOL);

    const wrongLabels = round.options
      .filter((_option, index) => index !== round.correctIndex)
      .map((option) => option.labelFr);
    expect(wrongLabels).not.toContain("Haoussa");
    expect(wrongLabels).not.toContain("Djerma");
  });

  // @req REQ-120
  it("carries the autonym pair on every option so no people is flattened to a string", () => {
    const round = buildRelationRound(RELATION, PEOPLE_BY_ID, POOL);

    for (const option of round.options) {
      expect(option.name.autonym).toBe(option.labelFr);
    }
  });

  // @req REQ-120
  it("names the first people and the French label of the link in the prompt", () => {
    const round = buildRelationRound(RELATION, PEOPLE_BY_ID, POOL);

    expect(round.promptFr).toContain("Haoussa");
    expect(round.promptFr).toContain("commercial");
    expect(round.promptFr).toContain("XVe-XIXe siècle");
    expect(round.promptFr).not.toContain("Djerma");
  });

  // @req REQ-120
  it("reveals the relation description verbatim with its field path", () => {
    const round = buildRelationRound(RELATION, PEOPLE_BY_ID, POOL);

    expect(round.reveal).toEqual({
      textFr: RELATION.description,
      fieldPath: "afrik_people_relations.description",
    });
  });

  // @req REQ-120
  it("returns null when one end of the link is missing from the corpus", () => {
    const incomplete = new Map(PEOPLE_BY_ID);
    incomplete.delete(DJERMA.id);

    expect(buildRelationRound(RELATION, incomplete, POOL)).toBeNull();
  });

  // @req REQ-120
  it("returns null rather than padding when the pool holds fewer than three other peoples", () => {
    const thin = [HAOUSSA, DJERMA, POOL[2]];

    expect(buildRelationRound(RELATION, PEOPLE_BY_ID, thin)).toBeNull();
  });
});
