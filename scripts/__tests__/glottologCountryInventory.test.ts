import { describe, expect, it } from "vitest";

import { buildGlottologCountryInventory } from "../lib/glottologCountryInventory";

const CSV = `ID,Name,Macroarea,Latitude,Longitude,Glottocode,ISO639P3code,Level,Countries,Family_ID,Language_ID,Closest_ISO369P3code,First_Year_Of_Documentation,Last_Year_Of_Documentation,Is_Isolate
zand1248,Zande,Africa,4.0,26.0,zand1248,zne,language,CD;CF;SS,atla1278,,zne,1860,2025,false
fren1263,French,Eurasia,48.0,2.0,fren1263,fra,language,FR,indo1319,,fra,842,2025,false
king1250,Kinshasa Lingala,Africa,-4.3,15.3,king1250,,dialect,CD,atla1278,ling1263,,,,false
alab1250,Alur,Africa,2.2,31.0,alur1250,alz,language,CD;UG,atla1278,,alz,1923,2025,false
`;

describe("buildGlottologCountryInventory", () => {
  // @req REQ-001
  it("filters exact country codes and emits a stable language-and-dialect inventory", () => {
    const result = buildGlottologCountryInventory(CSV, {
      countryId: "COD",
      glottologCountryCode: "CD",
      version: "5.3",
      releaseTag: "v5.3",
      sourceCommit: "072ca0d0410039fb8b779be8fc165bac575d2cda",
      sourceUrl:
        "https://raw.githubusercontent.com/glottolog/glottolog-cldf/v5.3/cldf/languages.csv",
      accessedAt: "2026-09-06",
    });

    expect(result.summary).toEqual({
      totalEntries: 3,
      languages: 2,
      dialects: 1,
      withIso639P3Code: 2,
      withoutIso639P3Code: 1,
    });
    expect(result.entries).toEqual([
      {
        glottocode: "alur1250",
        name: "Alur",
        iso639P3Code: "alz",
        level: "language",
        countries: ["CD", "UG"],
        familyGlottocode: "atla1278",
        parentLanguageGlottocode: null,
        latitude: 2.2,
        longitude: 31,
      },
      {
        glottocode: "king1250",
        name: "Kinshasa Lingala",
        iso639P3Code: null,
        level: "dialect",
        countries: ["CD"],
        familyGlottocode: "atla1278",
        parentLanguageGlottocode: "ling1263",
        latitude: -4.3,
        longitude: 15.3,
      },
      {
        glottocode: "zand1248",
        name: "Zande",
        iso639P3Code: "zne",
        level: "language",
        countries: ["CD", "CF", "SS"],
        familyGlottocode: "atla1278",
        parentLanguageGlottocode: null,
        latitude: 4,
        longitude: 26,
      },
    ]);
    expect(result.source).toMatchObject({
      version: "5.3",
      releaseTag: "v5.3",
      sourceCommit: "072ca0d0410039fb8b779be8fc165bac575d2cda",
      accessedAt: "2026-09-06",
    });
  });

  // @req REQ-001
  it("fails when the pinned CSV does not expose the required columns", () => {
    expect(() =>
      buildGlottologCountryInventory("ID,Name\none1,One\n", {
        countryId: "COD",
        glottologCountryCode: "CD",
        version: "5.3",
        releaseTag: "v5.3",
        sourceCommit: "commit",
        sourceUrl: "https://example.test/languages.csv",
        accessedAt: "2026-09-06",
      })
    ).toThrow(/required Glottolog columns/i);
  });
});
