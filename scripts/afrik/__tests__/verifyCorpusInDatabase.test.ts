import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CORPUS_TABLES,
  buildCorpusExpectations,
  canonicalJson,
  compareTable,
  selectSampleKeys,
  type CorpusSnapshot,
} from "../verifyCorpusInDatabase";

function corpus(overrides: Partial<CorpusSnapshot> = {}): CorpusSnapshot {
  return {
    languageFamilies: [
      {
        id: "FLG_BANTU",
        nameFr: "Bantu",
        nameEn: undefined,
        content: { summary: "x" },
      },
    ],
    languages: [
      {
        id: "yor",
        name: "Yoruba",
        familyId: "FLG_BANTU",
        nameProvenance: "sourced",
        glottocode: "yoru1245",
      },
    ],
    peoples: [
      {
        id: "PPL_YORUBA",
        nameMain: "Yoruba",
        languageFamilyId: "FLG_BANTU",
        currentCountries: ["NGA", "BEN", "NGA", "ZZZ", ""],
        content: {
          appellations: { spellingAliases: ["Yorouba"] },
          languages: { isoCodes: ["yor", "xxx", "yor"] },
        },
      },
    ],
    countries: [
      {
        id: "NGA",
        nameFr: "Nigeria",
        content: {},
      },
      { id: "BEN", nameFr: "Bénin", summary: "s", content: {} },
    ],
    patronymes: [
      {
        id: "PAT_ADE",
        nameSystem: "yoruba",
        casteOrSocialFunction: { value: "royal" },
      },
    ],
    ...overrides,
  } as unknown as CorpusSnapshot;
}

function expectationFor(table: string, snapshot = corpus()) {
  const expectation = buildCorpusExpectations(snapshot).find(
    (entry) => entry.table === table
  );
  if (!expectation) throw new Error(`No expectation for ${table}`);
  return expectation;
}

describe("canonicalJson", () => {
  // jsonb returns keys in its own order and drops undefined; a hash that saw
  // either difference would report every row of the corpus as drifted.
  // @req REQ-032
  it("ignores key order and undefined members, and keeps array order", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, 1], c: undefined } })).toBe(
      canonicalJson({ a: { d: [2, 1] }, b: 1 })
    );
    expect(canonicalJson({ a: [1, 2] })).not.toBe(canonicalJson({ a: [2, 1] }));
  });
});

describe("selectSampleKeys", () => {
  // @req REQ-032
  it("draws every Nth key of the sorted, de-duplicated set, the same way every run", () => {
    const keys = Array.from(
      { length: 200 },
      (_, index) => `K${String(199 - index).padStart(3, "0")}`
    );

    const sample = selectSampleKeys([...keys, "K000"], 50);

    expect(sample).toHaveLength(50);
    expect(sample[0]).toBe("K000");
    expect(sample[1]).toBe("K004");
    expect(selectSampleKeys([...keys].reverse(), 50)).toEqual(sample);
  });

  // @req REQ-032
  it("takes every key of a table smaller than the sample", () => {
    expect(selectSampleKeys(["b", "a"], 50)).toEqual(["a", "b"]);
  });
});

describe("buildCorpusExpectations", () => {
  // @req REQ-032
  it("covers every table the sync writes for the entity backbone", () => {
    expect(CORPUS_TABLES).toEqual([
      "afrik_language_families",
      "afrik_languages",
      "afrik_peoples",
      "afrik_people_languages",
      "afrik_countries",
      "afrik_people_countries",
      "afrik_patronymes",
    ]);
    expect(
      buildCorpusExpectations(corpus()).map((entry) => entry.table)
    ).toEqual(CORPUS_TABLES);
  });

  // The loader writes `?? null` for every optional column; the database hands
  // back null, never undefined.
  // @req REQ-032
  it("projects the columns the loader writes, with absent values as null", () => {
    expect(expectationFor("afrik_language_families").rows).toEqual([
      {
        id: "FLG_BANTU",
        name_fr: "Bantu",
        name_en: null,
        content: { summary: "x" },
      },
    ]);
    expect(expectationFor("afrik_countries").rows[1]).toEqual({
      id: "BEN",
      name_fr: "Bénin",
      name_official: null,
      name_en: null,
      summary: "s",
      etymology: null,
      name_origin_actor: null,
      content: {},
    });
    expect(expectationFor("afrik_patronymes").rows[0]).toMatchObject({
      id: "PAT_ADE",
      name_system: "yoruba",
      caste_or_social_function: "royal",
    });
  });

  // @req REQ-032
  it("expects only the relation rows the loader can write: unique, non-empty, pointing at a loaded row", () => {
    expect(expectationFor("afrik_people_countries").rows).toEqual([
      { people_id: "PPL_YORUBA", country_id: "NGA" },
      { people_id: "PPL_YORUBA", country_id: "BEN" },
    ]);
    expect(expectationFor("afrik_people_languages").rows).toEqual([
      { people_id: "PPL_YORUBA", language_id: "yor" },
    ]);
  });

  // The verifier restates each upsert's column list because the loader's row
  // builders are private. A column the loader starts writing and the verifier
  // never compares is the silent kind of drift, so the two lists are held
  // together by reading the loader itself.
  // @req REQ-032
  it("compares every column the loader upserts, except bookkeeping ones", () => {
    const sources = [
      "scripts/migrateAfrikToDatabase.ts",
      "src/lib/afrik/loaders/languageProvenanceLoader.ts",
      "src/lib/afrik/loaders/patronymeJsonLoader.ts",
    ].map((file) => readFileSync(join(process.cwd(), file), "utf8"));
    const bookkeeping = new Set(["updated_at", "classification_status"]);
    const compared: string[] = [];

    for (const expectation of buildCorpusExpectations(corpus())) {
      const literal = sources
        .map((source) =>
          new RegExp(
            `from\\("${expectation.table}"\\)\\s*\\.upsert\\(\\s*\\{([\\s\\S]*?)\\n\\s*\\},\\s*\\{ onConflict`
          ).exec(source)
        )
        .find(Boolean);
      if (!literal) continue; // relation tables upsert prebuilt row arrays

      const written = Array.from(
        literal[1].matchAll(/^\s*(?:\.\.\.\([^?]*\?\s*\{\s*)?([a-z_]+):/gm),
        (match) => match[1]
      ).filter((column) => !bookkeeping.has(column));

      expect([...expectation.columns].sort(), expectation.table).toEqual(
        [...new Set(written)].sort()
      );
      compared.push(expectation.table);
    }

    // Every object-literal upsert must have been found, or this test would
    // pass by comparing nothing the day a loader is reformatted.
    expect(compared).toHaveLength(6);
  });
});

describe("compareTable", () => {
  // @req REQ-032
  it("passes when the counts agree and every sampled row hashes the same", () => {
    const expectation = expectationFor("afrik_language_families");

    const verdict = compareTable(expectation, {
      count: 1,
      sampleRows: [
        {
          content: { summary: "x" },
          name_en: null,
          name_fr: "Bantu",
          id: "FLG_BANTU",
        },
      ],
    });

    expect(verdict.mismatches).toEqual([]);
    expect(verdict.sampled).toBe(1);
  });

  // The failure this verifier exists for: the sync went quiet, git moved on,
  // and the database kept serving the previous corpus.
  // @req REQ-032
  it("reports a count gap, a stale row naming its columns, and a missing row", () => {
    const snapshot = corpus({
      countries: [
        { id: "BEN", nameFr: "Bénin", content: { capital: "Porto-Novo" } },
        { id: "NGA", nameFr: "Nigeria", content: {} },
        { id: "TGO", nameFr: "Togo", content: {} },
      ],
    } as Partial<CorpusSnapshot>);
    const expectation = expectationFor("afrik_countries", snapshot);

    const verdict = compareTable(expectation, {
      count: 2,
      sampleRows: [
        {
          ...expectation.rows[0],
          name_fr: "Benin",
          content: { capital: "Cotonou" },
        },
        expectation.rows[1],
      ],
    });

    expect(verdict.expectedCount).toBe(3);
    expect(verdict.actualCount).toBe(2);
    expect(verdict.mismatches).toEqual([
      "row count: git holds 3, the database has 2",
      "BEN: differs in content, name_fr",
      "TGO: absent from the database",
    ]);
  });

  // A relation table is sampled per people: a link git dropped but the
  // upsert-only sync never removed is a row the database still serves.
  // @req REQ-032
  it("reports a relation row the database holds and git no longer declares", () => {
    const expectation = expectationFor("afrik_people_countries");

    const verdict = compareTable(expectation, {
      count: 2,
      sampleRows: [
        { people_id: "PPL_YORUBA", country_id: "BEN" },
        { people_id: "PPL_YORUBA", country_id: "TGO" },
      ],
    });

    expect(verdict.mismatches).toEqual([
      "PPL_YORUBA: git holds 2 row(s), the database 2, and they differ",
    ]);
  });
});
