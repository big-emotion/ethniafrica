// @req REQ-052
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { checkTreeCoverage, checkTreeIntegrity } from "../validateAfrikData";

function writeFamily(root: string, familyId: string) {
  const familyDir = join(root, "famille_linguistique");
  mkdirSync(familyDir, { recursive: true });
  writeFileSync(
    join(familyDir, `${familyId}.json`),
    JSON.stringify({ id: familyId })
  );
}

function writeLanguages(
  root: string,
  rows: Array<{
    id: string;
    name: string;
    isoCode: string;
    familyId: string;
  }>
) {
  const familyDir = join(root, "famille_linguistique");
  mkdirSync(familyDir, { recursive: true });
  const header = "id_langue,nom_langue,code_iso_639_3,id_famille,source\n";
  const body = rows
    .map(
      ({ id, name, isoCode, familyId }) =>
        `${id},${name},${isoCode},${familyId},"Ethnologue"`
    )
    .join("\n");
  writeFileSync(
    join(familyDir, "langue_par_famille.csv"),
    `${header}${body}\n`
  );
}

function writePeople(
  root: string,
  familyId: string,
  peopleId: string,
  isoCodes: unknown[]
) {
  const peopleDir = join(root, "peuples", familyId);
  mkdirSync(peopleDir, { recursive: true });
  writeFileSync(
    join(peopleDir, `${peopleId}.json`),
    JSON.stringify({
      id: peopleId,
      languageFamilyId: familyId,
      content: { languages: { isoCodes } },
    })
  );
}

describe("FR52 tree integrity", () => {
  let datasetRoot: string;

  beforeEach(() => {
    datasetRoot = join(
      __dirname,
      `tmp_tree_integrity_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(datasetRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(datasetRoot)) {
      rmSync(datasetRoot, { recursive: true, force: true });
    }
  });

  describe("checkTreeIntegrity", () => {
    // @req REQ-052
    it("passes when language and people links are valid", () => {
      writeFamily(datasetRoot, "FLG_BANTU");
      writeLanguages(datasetRoot, [
        {
          id: "LANG_BANTU_1",
          name: "Zulu",
          isoCode: "zul",
          familyId: "FLG_BANTU",
        },
      ]);
      writePeople(datasetRoot, "FLG_BANTU", "PPL_ZULU", ["zul"]);

      const result = checkTreeIntegrity(datasetRoot);

      expect(result).toEqual({ ok: true, errors: [], warnings: [] });
    });

    // @req REQ-052
    it("hard-errors when a language row references a missing family", () => {
      writeFamily(datasetRoot, "FLG_BANTU");
      writeLanguages(datasetRoot, [
        {
          id: "LANG_UNKNOWN_1",
          name: "Unknown",
          isoCode: "unk",
          familyId: "FLG_UNKNOWN",
        },
      ]);

      const result = checkTreeIntegrity(datasetRoot);

      expect(result.ok).toBe(false);
      expect(result.errors).toContain(
        'FR52 language "unk": family "FLG_UNKNOWN" has no matching FLG JSON file'
      );
    });

    // @req REQ-052
    it("hard-errors on malformed and duplicate language ISO 639-3 codes", () => {
      writeFamily(datasetRoot, "FLG_BANTU");
      writeLanguages(datasetRoot, [
        {
          id: "LANG_BANTU_1",
          name: "Zulu",
          isoCode: "ZUL",
          familyId: "FLG_BANTU",
        },
        {
          id: "LANG_BANTU_2",
          name: "Zulu duplicate",
          isoCode: "zul",
          familyId: "FLG_BANTU",
        },
        {
          id: "LANG_BANTU_3",
          name: "Zulu duplicate again",
          isoCode: "zul",
          familyId: "FLG_BANTU",
        },
      ]);

      const result = checkTreeIntegrity(datasetRoot);

      expect(result.ok).toBe(false);
      expect(result.errors).toContain(
        'FR52 language row "LANG_BANTU_1": invalid ISO 639-3 code "ZUL" (expected 3 lowercase letters)'
      );
      expect(
        result.errors.some(
          (error) =>
            error.includes('duplicate ISO 639-3 code "zul"') &&
            error.includes("LANG_BANTU_2") &&
            error.includes("LANG_BANTU_3")
        )
      ).toBe(true);
    });

    // @req REQ-052
    it("hard-errors on a blank language ISO 639-3 code", () => {
      writeFamily(datasetRoot, "FLG_BANTU");
      writeLanguages(datasetRoot, [
        {
          id: "LANG_BANTU_1",
          name: "Missing code",
          isoCode: "",
          familyId: "FLG_BANTU",
        },
      ]);

      const result = checkTreeIntegrity(datasetRoot);

      expect(result.ok).toBe(false);
      expect(result.errors).toContain(
        'FR52 language row "LANG_BANTU_1": invalid ISO 639-3 code "" (expected 3 lowercase letters)'
      );
    });

    // @req REQ-052
    it("hard-errors on people ISO codes using the FR29 pattern", () => {
      writeFamily(datasetRoot, "FLG_BANTU");
      writeLanguages(datasetRoot, [
        {
          id: "LANG_BANTU_1",
          name: "Zulu",
          isoCode: "zul",
          familyId: "FLG_BANTU",
        },
      ]);
      writePeople(datasetRoot, "FLG_BANTU", "PPL_ZULU", [
        "zul",
        "ZUL",
        "zu",
        123,
      ]);

      const result = checkTreeIntegrity(datasetRoot);

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'FR52 PPL_ZULU.json: invalid ISO 639-3 language code "ZUL" (expected 3 lowercase letters)',
          'FR52 PPL_ZULU.json: invalid ISO 639-3 language code "zu" (expected 3 lowercase letters)',
          'FR52 PPL_ZULU.json: invalid ISO 639-3 language code "123" (expected 3 lowercase letters)',
        ])
      );
    });
  });

  describe("checkTreeCoverage", () => {
    // @req REQ-052
    it("emits no warning when every people has a language row in its own family", () => {
      writeFamily(datasetRoot, "FLG_BANTU");
      writeLanguages(datasetRoot, [
        {
          id: "LANG_BANTU_1",
          name: "Zulu",
          isoCode: "zul",
          familyId: "FLG_BANTU",
        },
      ]);
      writePeople(datasetRoot, "FLG_BANTU", "PPL_ZULU", ["zul"]);

      const result = checkTreeCoverage(datasetRoot);

      expect(result).toEqual({ ok: true, errors: [], warnings: [] });
    });

    // @req REQ-052
    it("soft-warns per family with linked, unlinked, and total people counts", () => {
      writeFamily(datasetRoot, "FLG_BANTU");
      writeLanguages(datasetRoot, [
        {
          id: "LANG_BANTU_1",
          name: "Zulu",
          isoCode: "zul",
          familyId: "FLG_BANTU",
        },
        {
          id: "LANG_OTHER_1",
          name: "Other family language",
          isoCode: "xho",
          familyId: "FLG_OTHER",
        },
      ]);
      writePeople(datasetRoot, "FLG_BANTU", "PPL_ZULU", ["zul"]);
      writePeople(datasetRoot, "FLG_BANTU", "PPL_XHOSA", ["xho"]);

      const result = checkTreeCoverage(datasetRoot);

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toEqual([
        "FR52-coverage FLG_BANTU: 1 linked / 1 unlinked / 2 total",
      ]);
    });

    // @req REQ-052
    it("counts a people as linked when any ISO code matches its own family", () => {
      writeFamily(datasetRoot, "FLG_BANTU");
      writeLanguages(datasetRoot, [
        {
          id: "LANG_BANTU_1",
          name: "Zulu",
          isoCode: "zul",
          familyId: "FLG_BANTU",
        },
      ]);
      writePeople(datasetRoot, "FLG_BANTU", "PPL_MULTILINGUAL", ["xho", "zul"]);

      const result = checkTreeCoverage(datasetRoot);

      expect(result.warnings).toHaveLength(0);
    });
  });
});
