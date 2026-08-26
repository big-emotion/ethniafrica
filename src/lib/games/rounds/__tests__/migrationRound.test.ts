import { describe, expect, it } from "vitest";
import type { CountryId } from "@/types/afrik";
import type {
  GameMigrationFixture,
  GamePeopleFixture,
} from "@/lib/games/corpus";
import { buildMigrationRound } from "../migrationRound";

function makePeople(
  id: string,
  nameMain: string,
  currentCountries: CountryId[]
): GamePeopleFixture {
  return {
    id,
    nameMain,
    name: { autonym: nameMain },
    selfAppellation: nameMain,
    exonyms: [],
    originOfExonyms: null,
    currentCountries,
    totalPopulation: null,
    distributionByCountry: [],
    languageFamilyId: null,
    languageFamilyNameFr: null,
  };
}

const ORIGIN_PEOPLE = makePeople("PPL_00100", "Bantou du Nord", ["CMR"]);
const DESTINATION_PEOPLE = makePeople("PPL_00200", "Luba", ["COD", "ZMB"]);
const PEOPLE_BY_ID = new Map([
  [ORIGIN_PEOPLE.id, ORIGIN_PEOPLE],
  [DESTINATION_PEOPLE.id, DESTINATION_PEOPLE],
]);

const COUNTRY_POOL: CountryId[] = ["DZA", "KEN", "MLI", "ETH"];

const MIGRATION: GameMigrationFixture = {
  id: "MIG_00001",
  name: "Expansion bantoue",
  summary:
    "Un mouvement de peuplement parti du plateau camerounais vers le bassin du Congo.",
  geometry: {
    type: "LineString",
    coordinates: [
      [11.5, 4.1],
      [23.6, -6.1],
    ],
  },
  peoples: [
    { id: ORIGIN_PEOPLE.id, nameMain: ORIGIN_PEOPLE.nameMain, role: "origin" },
    {
      id: DESTINATION_PEOPLE.id,
      nameMain: DESTINATION_PEOPLE.nameMain,
      role: "destination",
    },
  ],
};

describe("buildMigrationRound", () => {
  // @req REQ-120
  it("answers with the first drawable country of the declared destination people", () => {
    const round = buildMigrationRound(MIGRATION, PEOPLE_BY_ID, COUNTRY_POOL);

    expect(round.kind).toBe("globeTap");
    expect(round.gameId).toBe("migrations");
    expect(round.subjectId).toBe("MIG_00001");
    expect(round.correctCountryId).toBe("COD");
  });

  // @req REQ-120
  it("ignores the origin people when choosing the answer", () => {
    const round = buildMigrationRound(MIGRATION, PEOPLE_BY_ID, COUNTRY_POOL);

    expect(round.correctCountryId).not.toBe("CMR");
  });

  // @req REQ-120
  it("skips a destination country the admin-0 asset cannot draw", () => {
    const seychellois = makePeople("PPL_00200", "Luba", ["SYC", "ZMB"]);
    const round = buildMigrationRound(
      MIGRATION,
      new Map([
        [ORIGIN_PEOPLE.id, ORIGIN_PEOPLE],
        [seychellois.id, seychellois],
      ]),
      COUNTRY_POOL
    );

    expect(round.correctCountryId).toBe("ZMB");
  });

  // @req REQ-120
  it("names the migration in the prompt", () => {
    const round = buildMigrationRound(MIGRATION, PEOPLE_BY_ID, COUNTRY_POOL);

    expect(round.promptFr).toContain("Expansion bantoue");
  });

  // @req REQ-120
  it("offers four drawable countries including the answer", () => {
    const round = buildMigrationRound(MIGRATION, PEOPLE_BY_ID, COUNTRY_POOL);

    expect(round.choices).toHaveLength(4);
    expect(round.choices).toContain("COD");
    expect(new Set(round.choices).size).toBe(4);
  });

  // @req REQ-120
  it("never offers a country the admin-0 asset cannot draw", () => {
    const round = buildMigrationRound(MIGRATION, PEOPLE_BY_ID, [
      "SYC",
      ...COUNTRY_POOL,
    ]);

    expect(round.choices).not.toContain("SYC");
  });

  // @req REQ-120
  it("reveals the migration summary verbatim", () => {
    const round = buildMigrationRound(MIGRATION, PEOPLE_BY_ID, COUNTRY_POOL);

    expect(round.reveal).toEqual({
      textFr: MIGRATION.summary,
      fieldPath: "migration_events.summary",
    });
  });

  // @req REQ-120
  it("returns null when the event declares no destination people", () => {
    const originOnly: GameMigrationFixture = {
      ...MIGRATION,
      peoples: [MIGRATION.peoples[0]],
    };

    expect(
      buildMigrationRound(originOnly, PEOPLE_BY_ID, COUNTRY_POOL)
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null when no country of the destination people can be drawn", () => {
    const unmappable = makePeople("PPL_00200", "Luba", ["SYC"]);

    expect(
      buildMigrationRound(
        MIGRATION,
        new Map([[unmappable.id, unmappable]]),
        COUNTRY_POOL
      )
    ).toBeNull();
  });

  // @req REQ-120
  it("returns null rather than padding when fewer than four countries are drawable", () => {
    expect(
      buildMigrationRound(MIGRATION, PEOPLE_BY_ID, COUNTRY_POOL.slice(0, 2))
    ).toBeNull();
  });
});
