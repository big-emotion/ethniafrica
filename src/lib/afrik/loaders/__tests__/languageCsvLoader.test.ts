/**
 * Seventy-one sourced languages and 744 declared ISO codes sit in the corpus
 * and are never written to `afrik_languages`. This loader replaces the
 * majority-vote fallback with the corpus's own declared data: the 71 rows of
 * `langue_par_famille.csv` carry an authoritative name and a Glottolog source
 * at the official tier, while a code a people fiche declares but the CSV does
 * not is loaded too, flagged `derived` and never sourced — the two provenances
 * must stay distinguishable for the life of the row (ETNI-1502).
 */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";

import {
  loadLanguagesFromCsv,
  deriveLanguagesFromPeoples,
  loadAllLanguages,
} from "../languageCsvLoader";
import type { People } from "@/types/afrik";

function person(overrides: Partial<People> = {}): People {
  return {
    id: "PPL_TEST",
    nameMain: "Test",
    languageFamilyId: "FLG_TEST",
    currentCountries: [],
    content: {},
    ...overrides,
  } as People;
}

describe("loadLanguagesFromCsv", () => {
  // AC1: 71 records, each with a resolvable family and an authoritative name.
  // @req REQ-136
  it("returns exactly 71 records from the corpus CSV", () => {
    const languages = loadLanguagesFromCsv();

    expect(languages).toHaveLength(71);
    for (const language of languages) {
      expect(language.familyId).toMatch(/^FLG_/);
      expect(language.name.length).toBeGreaterThan(0);
      expect(language.nameProvenance).toBe("sourced");
    }
  });

  // AC2: the Glottolog source is preserved at the official tier with url/glottocode intact.
  // @req REQ-136
  it("preserves the Glottolog source at the official tier with url and glottocode intact", () => {
    const languages = loadLanguagesFromCsv();
    const yoruba = languages.find((l) => l.id === "yor");

    expect(yoruba?.glottocode).toBe("yoru1245");
    expect(yoruba?.source).toMatchObject({
      url: "https://glottolog.org/resource/languoid/id/yoru1245",
      tier: "official",
    });
  });

  // @req REQ-136
  it("parses a row from an arbitrary CSV path into a language record", () => {
    const tmpDir = join(__dirname, `tmp_csv_${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const csvPath = join(tmpDir, "langue_par_famille.csv");
    writeFileSync(
      csvPath,
      "id_langue,nom_langue,code_iso_639_3,id_famille,glottocode,source_title,source_url,source_doi,source_tier,source_access_date,source_notes\n" +
        "LANG_1,Wolof,wol,FLG_ATLANTIQUE,wolo1242,Glottolog 5.3,https://glottolog.org/resource/languoid/id/wolo1242,,1,2026-07-29,\n"
    );

    const languages = loadLanguagesFromCsv(csvPath);
    rmSync(tmpDir, { recursive: true, force: true });

    expect(languages).toEqual([
      {
        id: "wol",
        name: "Wolof",
        familyId: "FLG_ATLANTIQUE",
        nameProvenance: "sourced",
        glottocode: "wolo1242",
        source: {
          title: "Glottolog 5.3 - Wolof",
          url: "https://glottolog.org/resource/languoid/id/wolo1242",
          tier: "official",
        },
      },
    ]);
  });
});

describe("deriveLanguagesFromPeoples", () => {
  // AC: a people-declared code already in the CSV produces no duplicate.
  // @req REQ-136
  it("produces no record when the people-declared code is already known", () => {
    const peoples = [person({ content: { languages: { isoCodes: ["yor"] } } })];

    expect(deriveLanguagesFromPeoples(peoples, new Set(["yor"]))).toEqual([]);
  });

  // AC: a code declared by a people and absent from the CSV is flagged derived, with no source.
  // @req REQ-136
  it("flags a people-declared code absent from the CSV as derived, with no source", () => {
    const peoples = [
      person({
        languageFamilyId: "FLG_KXA",
        content: {
          languages: {
            mainLanguage: "Ju|'hoan (Ju|'hoansi)",
            isoCodes: ["ktz"],
          },
        },
      }),
    ];

    expect(deriveLanguagesFromPeoples(peoples, new Set())).toEqual([
      {
        id: "ktz",
        name: "Ju|'hoan",
        familyId: "FLG_KXA",
        nameProvenance: "derived",
      },
    ]);
  });

  // @req REQ-136
  it("falls back to the bare code when no declaring people gives it a readable name", () => {
    const peoples = [
      person({
        languageFamilyId: undefined,
        content: { languages: { isoCodes: ["xyz"] } },
      }),
    ];

    expect(deriveLanguagesFromPeoples(peoples, new Set())).toEqual([
      {
        id: "xyz",
        name: "xyz",
        familyId: undefined,
        nameProvenance: "derived",
      },
    ]);
  });

  // @req REQ-136
  it("deduplicates a code declared by more than one people", () => {
    const peoples = [
      person({ id: "PPL_A", content: { languages: { isoCodes: ["ktz"] } } }),
      person({ id: "PPL_B", content: { languages: { isoCodes: ["ktz"] } } }),
    ];

    expect(deriveLanguagesFromPeoples(peoples, new Set())).toHaveLength(1);
  });
});

describe("loadAllLanguages", () => {
  // AC: the loader returns the union of the CSV languages and any derived-only languages.
  // @req REQ-136
  it("returns the union of the CSV languages and the derived-only languages", () => {
    const tmpDir = join(__dirname, `tmp_csv_${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const csvPath = join(tmpDir, "langue_par_famille.csv");
    const fichePath = join(tmpDir, "langues");
    mkdirSync(fichePath);
    writeFileSync(
      csvPath,
      "id_langue,nom_langue,code_iso_639_3,id_famille,glottocode,source_title,source_url,source_doi,source_tier,source_access_date,source_notes\n" +
        "LANG_1,Wolof,wol,FLG_ATLANTIQUE,wolo1242,Glottolog 5.3,https://glottolog.org/resource/languoid/id/wolo1242,,1,2026-07-29,\n"
    );
    const peoples = [
      person({
        languageFamilyId: "FLG_KXA",
        content: { languages: { mainLanguage: "Ju|'hoan", isoCodes: ["ktz"] } },
      }),
      person({ content: { languages: { isoCodes: ["wol"] } } }),
    ];

    const languages = loadAllLanguages(peoples, csvPath, fichePath);
    rmSync(tmpDir, { recursive: true, force: true });

    expect(languages.map((l) => l.id).sort()).toEqual(["ktz", "wol"]);
    expect(languages.find((l) => l.id === "wol")?.nameProvenance).toBe(
      "sourced"
    );
    expect(languages.find((l) => l.id === "ktz")?.nameProvenance).toBe(
      "derived"
    );
  });

  // AC: a fiche replaces overlapping CSV/people data and remains unique.
  // @req REQ-136
  it("gives fiche data precedence by ISO 639-3 without creating duplicates", () => {
    const tmpDir = join(__dirname, `tmp_languages_${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const csvPath = join(tmpDir, "langue_par_famille.csv");
    const fichePath = join(tmpDir, "langues");
    mkdirSync(fichePath);
    writeFileSync(
      csvPath,
      "id_langue,nom_langue,code_iso_639_3,id_famille,glottocode,source_title,source_url,source_doi,source_tier,source_access_date,source_notes\n" +
        "LANG_1,Wolof CSV,wol,FLG_CSV,wolo1242,Glottolog 5.3,https://glottolog.org/resource/languoid/id/wolo1242,,1,2026-07-29,\n"
    );
    writeFileSync(
      join(fichePath, "wol.json"),
      JSON.stringify({
        id: "wol",
        isoCode639_3: "wol",
        glottocode: "nucl1347",
        nameFr: "Wolof fiche",
        nameEn: "Wolof",
        alternateNames: ["Ouolof"],
        spellingAliases: ["Volof"],
        familyId: "FLG_ATLANTIQUE",
        peoples: [],
        content: {
          vehicularRole: null,
          dialects: [],
          vitalityStatus: null,
          sources: [
            {
              title: "Fiche source",
              url: "https://example.org/wol",
              tier: "referenced",
            },
          ],
        },
      })
    );
    const peoples = [person({ content: { languages: { isoCodes: ["wol"] } } })];

    const languages = loadAllLanguages(peoples, csvPath, fichePath);
    rmSync(tmpDir, { recursive: true, force: true });

    expect(languages).toHaveLength(1);
    expect(languages[0]).toMatchObject({
      id: "wol",
      name: "Wolof fiche",
      familyId: "FLG_ATLANTIQUE",
      glottocode: "nucl1347",
      spellingAliases: ["Volof"],
      sources: [{ title: "Fiche source", tier: "referenced" }],
    });
  });

  // AC: the migration's argument-free corpus path includes language fiches.
  // @req REQ-136
  it("includes the language fiche corpus by default", () => {
    const languages = loadAllLanguages([]);
    const yoruba = languages.filter((language) => language.id === "yor");

    expect(yoruba).toHaveLength(1);
    expect(yoruba[0]).toMatchObject({
      name: "Yoruba",
      nameProvenance: "sourced",
      nameEn: "Yoruba",
      sources: expect.arrayContaining([
        expect.objectContaining({ tier: "official" }),
      ]),
    });
  });
});
