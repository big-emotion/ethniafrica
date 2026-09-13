import { describe, expect, it } from "vitest";

import {
  allCountryRecords,
  allPeopleRecords,
  countryRecord,
  peopleRecord,
} from "@/components/fiche/__tests__/corpusRecords";
import { countryCultureTiles, peopleCultureTiles } from "@/lib/fiche/culture";
import type { FicheTileData } from "@/lib/fiche/tileData";
import { resolveAssociatedPeoples } from "@/lib/people/associatedPeopleLinks";
import { transformPeopleData } from "@/lib/peopleDataTransformer";
import type { PeopleDetail } from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";

function peopleTiles(people: PeopleDetail, language: Language = "fr") {
  const data = transformPeopleData(people, null, language);
  return peopleCultureTiles(
    {
      culture: data.culture,
      related: data.relatedPeoples,
      relationsWithNeighbors: data.history.relationsWithNeighbors,
      associatedGroups: resolveAssociatedPeoples(
        data.relatedPeoples.ethnicities,
        [],
        data.hero.peopleId
      ),
      relationNames: [],
    },
    language
  );
}

/** Everything a reader reaches in a tile by opening it. */
function tileText(tile: FicheTileData): string {
  return [
    tile.label,
    tile.value ?? "",
    tile.preview,
    ...tile.passages.map((passage) => passage.text),
    ...(tile.pills ?? []).map((pill) => pill.label),
    ...(tile.extraText ?? []),
  ].join("\n");
}

const COUNTRY_FIELDS = [
  "dominantReligions",
  "lifestyles",
  "socialOrganization",
  "regionalRelations",
  "culturalTraditions",
] as const;

describe("peopleCultureTiles", () => {
  // @req REQ-097 REQ-153
  it("gives Ovambo one tile per rubric, in reading order", () => {
    const tiles = peopleTiles(peopleRecord("PPL_OVAMBO"));
    expect(tiles.map((tile) => [tile.key, tile.label])).toEqual([
      ["rites", "Rites"],
      ["symbols", "Symboles"],
      ["arts", "Arts et musique"],
      ["spiritualities", "Spiritualités"],
      ["organisation", "Organisation"],
      ["relations", "Relations"],
      ["groups", "Groupes associés"],
    ]);
  });

  // @req REQ-153
  it("previews a rubric with its first sentence and keeps the whole field", () => {
    const people = peopleRecord("PPL_OVAMBO");
    const [rites] = peopleTiles(people);
    expect(rites.preview).toBe(
      "Cérémonies de mariage combinant traditions ovambo et pratiques chrétiennes luthériennes."
    );
    expect(rites.passages).toEqual([
      { field: "majorRites", text: people.culture!.majorRites!.trim() },
    ]);
  });

  // Relations with neighbours left the chronology for this chapter, beside
  // the country's own "Relations" tile.
  // @req REQ-097
  it("gathers organisation, relations and associated groups into their own tiles", () => {
    const people = peopleRecord("PPL_OVAMBO");
    const tiles = peopleTiles(people);
    const byKey = Object.fromEntries(tiles.map((tile) => [tile.key, tile]));

    expect(tileText(byKey.organisation)).toContain(
      people.organization!.clanOrganization!.trim()
    );
    expect(byKey.relations.passages[0].text).toBe(
      people.historicalRole!.relationsWithNeighbors!.trim()
    );
    expect(byKey.groups.value).toBe("9 groupes associés");
    expect(byKey.groups.pills).toHaveLength(9);
    expect(byKey.groups.preview).toBe(
      "Aandonga (Ndonga) · Ovakwanyama · Aakwambi (Kwambi) · +6"
    );
  });

  // @req REQ-097
  it("keeps a relations tile for sourced neighbours when no prose describes them", () => {
    const tiles = peopleCultureTiles(
      {
        culture: {},
        related: { ethnicities: [] },
        associatedGroups: [],
        relationNames: ["Herero", "Kavango"],
      },
      "fr"
    );
    expect(tiles.map((tile) => tile.key)).toEqual(["relations"]);
    expect(tiles[0].preview).toBe("Herero · Kavango");
  });

  // @req REQ-119
  it("produces no tile when the record says nothing of culture", () => {
    expect(
      peopleCultureTiles(
        {
          culture: {},
          related: { ethnicities: [] },
          associatedGroups: [],
          relationNames: [],
        },
        "fr"
      )
    ).toEqual([]);
  });
});

describe("countryCultureTiles", () => {
  /**
   * The country grid reduced each field to three keywords and nothing to
   * open: "Relations historiques avec, L'Afrique du Sud, Le Botswana". The
   * tiles now carry the field whole, folded behind its opening words.
   */
  // @req REQ-092 REQ-153
  it("carries each country field whole rather than cut to keywords", () => {
    const country = countryRecord("NAM");
    const tiles = countryCultureTiles(country.culture, "fr");
    expect(tiles.map((tile) => [tile.key, tile.label])).toEqual([
      ["religions", "Religions"],
      ["lifestyles", "Modes de vie"],
      ["organisation", "Organisation"],
      ["relations", "Relations"],
      ["traditions", "Traditions"],
    ]);
    expect(tiles[3].passages[0].text).toBe(
      country.culture!.regionalRelations!.trim()
    );
  });

  // @req REQ-092
  it("drops the tile of a field the record leaves empty", () => {
    const country = countryRecord("COD");
    const filled = COUNTRY_FIELDS.filter((field) =>
      country.culture?.[field]?.trim()
    );
    expect(countryCultureTiles(country.culture, "fr")).toHaveLength(
      filled.length
    );
    expect(filled.length).toBeLessThan(COUNTRY_FIELDS.length);
  });
});

describe("culture corpus sweep", () => {
  // @req REQ-092
  it("keeps every culture field of every country reachable, one tile each", () => {
    for (const country of allCountryRecords()) {
      const tiles = countryCultureTiles(country.culture, "fr");
      const text = tiles.map(tileText).join("\n");
      const filled = COUNTRY_FIELDS.filter((field) =>
        country.culture?.[field]?.trim()
      );
      expect(tiles, country.id).toHaveLength(filled.length);
      for (const field of filled) {
        expect(text, `${country.id} ${field}`).toContain(
          country.culture![field]!.trim()
        );
      }
    }
  });

  // @req REQ-097
  it("keeps every culture, organisation and neighbour field of every people reachable", () => {
    for (const people of allPeopleRecords()) {
      const text = peopleTiles(people).map(tileText).join("\n");
      const culture = people.culture ?? {};
      const organization = people.organization ?? {};
      for (const value of [
        culture.majorRites,
        culture.symbols,
        culture.artsAndMusic,
        culture.spiritualities,
        organization.traditionalPoliticalSystem,
        organization.clanOrganization,
        organization.ageClassSystems,
        organization.roleOfLineages,
        organization.religiousAuthority,
        people.historicalRole?.relationsWithNeighbors,
        ...(people.ethnicities ?? []),
      ]) {
        if (value?.trim()) expect(text, people.id).toContain(value.trim());
      }
    }
  });
});
