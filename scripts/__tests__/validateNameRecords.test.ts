// @req REQ-032
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import {
  checkNameRecordModel,
  checkNameRecordSources,
  checkNameRecordEndonymCoverage,
  checkNameRecordReferences,
  checkNameRecordDuplicates,
} from "../validateAfrikData";

// ─── helpers ──────────────────────────────────────────────────────────────────

function writePpl(root: string, flgFolder: string, pplId: string) {
  const dir = join(root, "peuples", flgFolder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${pplId}.json`), JSON.stringify({ id: pplId }));
}

function validNameEntry(overrides: Record<string, unknown> = {}) {
  return {
    nameText: "Endotest",
    nameType: "endonym",
    languageOfOrigin: "aaa",
    meaning: null,
    periodLabel: null,
    imposedBy: null,
    impositionPeriod: null,
    whyProblematic: null,
    contemporaryUsage: null,
    sortRank: 0,
    sources: [
      {
        title: "Titre",
        author: "Auteur",
        year: 2000,
        url: "https://www.un.org/en/x",
        tier: 1,
        notes: "",
      },
    ],
    ...overrides,
  };
}

function validNameFile(overrides: Record<string, unknown> = {}) {
  return {
    _meta: {
      format: "AFRIK JSON v2",
      entity: "nom",
      directives: "Voir DIRECTIVES-AFRIK.md pour les règles complètes.",
    },
    id: "PPL_A",
    entityType: "people",
    names: [validNameEntry()],
    ...overrides,
  };
}

function writeNameFile(
  root: string,
  fileName: string,
  data: Record<string, unknown>
) {
  const dir = join(root, "noms");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), JSON.stringify(data));
}

// ─── test suite ───────────────────────────────────────────────────────────────

describe("name-record validator (FR53-FR57, Story 8.3)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_test_noms_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmpDir, { recursive: true });
    writePpl(tmpDir, "FLG_TEST", "PPL_A");
    writePpl(tmpDir, "FLG_TEST", "PPL_B");
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("empty/absent noms directory", () => {
    // @req REQ-032
    it("every check passes when the directory does not exist", () => {
      expect(checkNameRecordModel(tmpDir).ok).toBe(true);
      expect(checkNameRecordSources(tmpDir).ok).toBe(true);
      expect(checkNameRecordEndonymCoverage(tmpDir).ok).toBe(true);
      expect(checkNameRecordReferences(tmpDir).ok).toBe(true);
      expect(checkNameRecordDuplicates(tmpDir).ok).toBe(true);
    });
  });

  describe("a fully valid name file", () => {
    // @req REQ-032
    it("produces no errors across every rule", () => {
      writeNameFile(tmpDir, "PPL_A.json", validNameFile());

      expect(checkNameRecordModel(tmpDir).ok).toBe(true);
      expect(checkNameRecordSources(tmpDir).ok).toBe(true);
      expect(checkNameRecordEndonymCoverage(tmpDir).ok).toBe(true);
      expect(checkNameRecordReferences(tmpDir).ok).toBe(true);
      expect(checkNameRecordDuplicates(tmpDir).ok).toBe(true);
    });
  });

  describe("FR55-iso — languageOfOrigin must be a valid ISO 639-3 code", () => {
    // @req REQ-032
    it("checkNameRecordModel fails on a malformed languageOfOrigin", () => {
      writeNameFile(
        tmpDir,
        "PPL_A.json",
        validNameFile({
          names: [validNameEntry({ languageOfOrigin: "ENGLISH" })],
        })
      );

      const result = checkNameRecordModel(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("FR55-iso"))).toBe(true);
      expect(result.errors.some((e) => e.includes("PPL_A.json"))).toBe(true);
    });

    // @req REQ-032
    it("checkNameRecordModel passes on a well-formed ISO 639-3 code", () => {
      writeNameFile(
        tmpDir,
        "PPL_A.json",
        validNameFile({
          names: [validNameEntry({ languageOfOrigin: "yor" })],
        })
      );

      expect(checkNameRecordModel(tmpDir).ok).toBe(true);
    });
  });

  describe("FR56-imposed — imposedBy set ⇒ whyProblematic non-empty", () => {
    // @req REQ-032
    it("checkNameRecordModel fails when imposedBy is set and whyProblematic is empty", () => {
      writeNameFile(
        tmpDir,
        "PPL_A.json",
        validNameFile({
          names: [
            validNameEntry({
              nameText: "Exotest",
              nameType: "exonym",
              imposedBy: "Administration coloniale",
              whyProblematic: null,
            }),
          ],
        })
      );

      const result = checkNameRecordModel(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("FR56-imposed"))).toBe(true);
    });

    // @req REQ-032
    it("checkNameRecordModel passes when imposedBy is set and whyProblematic is populated", () => {
      writeNameFile(
        tmpDir,
        "PPL_A.json",
        validNameFile({
          names: [
            validNameEntry({
              nameText: "Exotest",
              nameType: "exonym",
              imposedBy: "Administration coloniale",
              whyProblematic: "Terme imposé pendant la période coloniale.",
            }),
          ],
        })
      );

      expect(checkNameRecordModel(tmpDir).ok).toBe(true);
    });
  });

  describe("FR57-source — ≥1 Tier 1|2 source; Tier 2 requires Wikipedia cross-check note", () => {
    // @req REQ-032
    it("checkNameRecordSources fails when a Tier 2 source has no cross-check note", () => {
      writeNameFile(
        tmpDir,
        "PPL_A.json",
        validNameFile({
          names: [
            validNameEntry({
              sources: [
                {
                  title: "T",
                  author: "A",
                  year: 2000,
                  url: "https://fr.wikipedia.org/wiki/X",
                  tier: 2,
                  notes: "",
                },
              ],
            }),
          ],
        })
      );

      const result = checkNameRecordSources(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("FR57-source"))).toBe(true);
    });

    // @req REQ-032
    it("checkNameRecordSources passes when a Tier 2 source carries a cross-check note", () => {
      writeNameFile(
        tmpDir,
        "PPL_A.json",
        validNameFile({
          names: [
            validNameEntry({
              sources: [
                {
                  title: "T",
                  author: "A",
                  year: 2000,
                  url: "https://fr.wikipedia.org/wiki/X",
                  tier: 2,
                  notes: "Cross-checked FR + EN Wikipedia, primary source: ...",
                },
              ],
            }),
          ],
        })
      );

      expect(checkNameRecordSources(tmpDir).ok).toBe(true);
    });
  });

  describe("FR54-endonym — every covered people has ≥1 endonym record", () => {
    // @req REQ-032
    it("checkNameRecordEndonymCoverage fails when a file has no endonym record", () => {
      writeNameFile(
        tmpDir,
        "PPL_A.json",
        validNameFile({
          names: [
            validNameEntry({
              nameText: "Exotest",
              nameType: "exonym",
              imposedBy: "Administration coloniale",
              whyProblematic: "Terme imposé.",
            }),
          ],
        })
      );

      const result = checkNameRecordEndonymCoverage(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("FR54-endonym"))).toBe(true);
    });

    // @req REQ-032
    it("checkNameRecordEndonymCoverage passes when a file has an endonym record", () => {
      writeNameFile(tmpDir, "PPL_A.json", validNameFile());
      expect(checkNameRecordEndonymCoverage(tmpDir).ok).toBe(true);
    });
  });

  describe("FR53-ref — peopleId must resolve to an existing PPL fiche", () => {
    // @req REQ-032
    it("checkNameRecordReferences fails when peopleId is unknown", () => {
      writeNameFile(
        tmpDir,
        "PPL_GHOST.json",
        validNameFile({ id: "PPL_GHOST" })
      );

      const result = checkNameRecordReferences(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("FR53-ref"))).toBe(true);
      expect(result.errors.some((e) => e.includes("PPL_GHOST"))).toBe(true);
    });

    // @req REQ-032
    it("checkNameRecordReferences passes when peopleId resolves", () => {
      writeNameFile(tmpDir, "PPL_A.json", validNameFile());
      expect(checkNameRecordReferences(tmpDir).ok).toBe(true);
    });
  });

  describe("FR53-dup — no duplicate (peopleId, nameText, nameType) across the dataset", () => {
    // @req REQ-032
    it("checkNameRecordDuplicates fails when two entries share peopleId+nameText+nameType", () => {
      writeNameFile(
        tmpDir,
        "PPL_A.json",
        validNameFile({
          names: [validNameEntry(), validNameEntry({ sortRank: 1 })],
        })
      );

      const result = checkNameRecordDuplicates(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("FR53-dup"))).toBe(true);
    });

    // @req REQ-032
    it("checkNameRecordDuplicates passes when no duplicates exist", () => {
      writeNameFile(tmpDir, "PPL_A.json", validNameFile());
      writeNameFile(tmpDir, "PPL_B.json", validNameFile({ id: "PPL_B" }));

      expect(checkNameRecordDuplicates(tmpDir).ok).toBe(true);
    });
  });
});
