import { describe, expect, it } from "vitest";

import {
  allCountryRecords,
  allPeopleRecords,
  countryRecord,
  peopleRecord,
} from "@/components/fiche/__tests__/corpusRecords";
import {
  countryLanguageTiles,
  peopleLanguageTiles,
} from "@/lib/fiche/languages";
import type { FicheTileData } from "@/lib/fiche/tileData";
import { transformPeopleData } from "@/lib/peopleDataTransformer";
import { getFamilyRoute } from "@/lib/routing";

/** Everything a reader reaches in a tile by opening it. */
function tileText(tile: FicheTileData): string {
  return [
    tile.label,
    tile.value ?? "",
    tile.preview,
    ...tile.passages.map((passage) => passage.text),
    ...(tile.pills ?? []).flatMap((pill) => [pill.label, pill.code ?? ""]),
  ].join("\n");
}

describe("peopleLanguageTiles", () => {
  // @req REQ-091
  it("gives Ovambo its main language, family, speech varieties and vehicular role", () => {
    const data = transformPeopleData(peopleRecord("PPL_OVAMBO"), null, "fr");
    const tiles = peopleLanguageTiles(data.language, "Bantou", "fr");

    expect(tiles.map((tile) => [tile.key, tile.label])).toEqual([
      ["main", "Langue principale"],
      ["family", "Famille"],
      ["dialects", "Parlers"],
      ["vehicular", "Rôle véhiculaire"],
    ]);
    const [main, family, dialects, vehicular] = tiles;
    expect(main.value).toBe("Oshiwambo (Ovambo)");
    expect(main.preview).toBe("langue bantou Zone R");
    expect(main.pills?.map((pill) => pill.label)).toEqual([
      "kua",
      "ndo",
      "kwm",
      "lnb",
      "nne",
    ]);
    expect(family.value).toBe("Bantou");
    expect(family.valueHref).toBe(getFamilyRoute("fr", "FLG_BANTU"));
    expect(dialects.value).toBe("6 parlers");
    expect(dialects.preview).toBe(
      "Oshikwanyama (kua) · Oshindonga (ndo) · Oshikwambi (kwm) · +3"
    );
    expect(vehicular.passages[0].field).toBe("vehicularRole");
  });

  /**
   * The family used to print as "FLG_BANTU" when the route had no name for
   * it. A corpus identifier is not a word a reader is owed; without a name
   * the tile keeps silent rather than print the key.
   */
  // @req REQ-091
  it("never prints a family identifier where the family has no name", () => {
    const tiles = peopleLanguageTiles(
      {
        mainLanguage: "Yoruba",
        isoCodes: ["yor"],
        dialects: [],
        languageFamilyId: "FLG_NIGER_CONGO",
      },
      undefined,
      "fr"
    );
    expect(tiles.map(tileText).join("\n")).not.toMatch(/FLG_/);
    expect(tiles.some((tile) => tile.key === "family")).toBe(false);
  });
});

describe("countryLanguageTiles", () => {
  // The bubbles marked the official language with a building emoji, printed
  // the corpus's lower-case names as they came, and wrote "autres langues" in
  // the component.
  // @req REQ-091 REQ-145
  it("names the official language and lists the others, capitalised and without a pictogram", () => {
    const tiles = countryLanguageTiles(
      countryRecord("NAM").culture?.mainLanguages ?? [],
      "fr"
    );
    expect(tiles.map((tile) => [tile.key, tile.label, tile.value])).toEqual([
      ["official", "Langue officielle", "Anglais"],
      ["others", "Autres langues du pays", "8 langues"],
    ]);
    expect(tiles[0].preview).toBe("eng");
    expect(tiles[1].pills?.map((pill) => pill.label)).toEqual([
      "Ovambo",
      "Kavango",
      "Herero",
      "Damara",
      "Nama",
      "Langues khoïsan",
      "Afrikaans",
      "Allemand",
    ]);
    expect(tiles.map(tileText).join("\n")).not.toMatch(
      /\p{Extended_Pictographic}/u
    );
  });

  // @req REQ-145
  it("speaks English where the record is read in English", () => {
    const tiles = countryLanguageTiles(
      countryRecord("NAM").culture?.mainLanguages ?? [],
      "en"
    );
    expect(tiles.map((tile) => tile.label)).toEqual([
      "Official language",
      "Other languages of the country",
    ]);
  });

  // @req REQ-091
  it("lists every language under one tile when none is marked official", () => {
    const tiles = countryLanguageTiles(
      [{ name: "yoruba", isoCode: "yor" }, { name: "haoussa" }],
      "fr"
    );
    expect(tiles.map((tile) => [tile.key, tile.label, tile.value])).toEqual([
      ["all", "Langues du pays", "2 langues"],
    ]);
  });
});

describe("language corpus sweep", () => {
  // @req REQ-091
  it("keeps every language field of every people reachable, with no identifier", () => {
    for (const people of allPeopleRecords()) {
      const data = transformPeopleData(people, null, "fr");
      const text = peopleLanguageTiles(data.language, undefined, "fr")
        .map(tileText)
        .join("\n");
      expect(text, people.id).not.toMatch(/FLG_[A-Z]/);
      const languages = people.languages ?? {};
      for (const value of [
        ...(languages.mainLanguage ?? "").split(/\s+[—–]\s+/u),
        ...(languages.dialects ?? []),
        ...(languages.isoCodes ?? []),
        languages.vehicularRole,
      ]) {
        if (value?.trim()) expect(text, people.id).toContain(value.trim());
      }
    }
  });

  // @req REQ-091
  it("keeps every declared language of every country reachable, without a pictogram", () => {
    for (const country of allCountryRecords()) {
      const references = country.culture?.mainLanguages ?? [];
      const text = countryLanguageTiles(references, "fr")
        .map(tileText)
        .join("\n")
        .toLocaleLowerCase("fr");
      expect(text, country.id).not.toMatch(/\p{Extended_Pictographic}/u);
      for (const reference of references) {
        const name = reference.name.replace(/\s*\(.*\)/, "").trim();
        expect(text, `${country.id} ${name}`).toContain(
          name.toLocaleLowerCase("fr")
        );
      }
    }
  });
});
