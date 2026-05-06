import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import {
  checkFlgFolderMatch,
  checkPplDuplicates,
  checkPopulationSums,
  checkIsoValidity,
  checkOrphanFiches,
  checkSourceUrls,
} from "../validateAfrikData";

// ─── helpers ──────────────────────────────────────────────────────────────────

function writeFLG(root: string, id: string) {
  const dir = join(root, "famille_linguistique");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${id}.json`), JSON.stringify({ id }));
}

function writePPL(
  root: string,
  flgFolder: string,
  pplId: string,
  overrides: Record<string, unknown> = {}
) {
  const dir = join(root, "peuples", flgFolder);
  mkdirSync(dir, { recursive: true });
  const base = {
    id: pplId,
    content: {
      languages: { isoCodes: ["zul"] },
      demography: {
        distributionByCountry: [{ country: "ZAF", population: 10000000 }],
      },
      sources: ["Wikipedia (https://en.wikipedia.org/wiki/Zulu_people)"],
    },
  };
  writeFileSync(
    join(dir, `${pplId}.json`),
    JSON.stringify({ ...base, ...overrides })
  );
}

function writePays(
  root: string,
  isoCode: string,
  peoples: Array<{
    peopleId: string;
    languageFamily: string;
    percentageInCountry: number;
  }>
) {
  const dir = join(root, "pays");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${isoCode}.json`),
    JSON.stringify({
      id: isoCode,
      content: { demographics: { peoples } },
    })
  );
}

// ─── test suite ───────────────────────────────────────────────────────────────

describe("validateAfrikData – new integrity checks", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_test_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ── FR26 : checkFlgFolderMatch ─────────────────────────────────────────────

  describe("checkFlgFolderMatch (FR26)", () => {
    it("returns ok:true when every peuples/ subfolder matches a FLG JSON", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      mkdirSync(join(tmpDir, "peuples", "FLG_BANTU"), { recursive: true });

      const result = checkFlgFolderMatch(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns ok:true when peuples/ directory is empty (no sub-dirs)", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      mkdirSync(join(tmpDir, "peuples"), { recursive: true });

      const result = checkFlgFolderMatch(tmpDir);
      expect(result.ok).toBe(true);
    });

    it("returns ok:false when a peuples/ subfolder has no matching FLG JSON", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      mkdirSync(join(tmpDir, "peuples", "FLG_BANTU"), { recursive: true });
      // Extra folder with no matching FLG file
      mkdirSync(join(tmpDir, "peuples", "FLG_UNKNOWN"), { recursive: true });

      const result = checkFlgFolderMatch(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("FLG_UNKNOWN"))).toBe(true);
    });
  });

  // ── FR27 : checkPplDuplicates ──────────────────────────────────────────────

  describe("checkPplDuplicates (FR27)", () => {
    it("returns ok:true when all PPL ids are unique", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_XHOSA", { id: "PPL_XHOSA" });

      const result = checkPplDuplicates(tmpDir);
      expect(result.ok).toBe(true);
    });

    it("returns ok:true when peuples directory is empty", () => {
      mkdirSync(join(tmpDir, "peuples"), { recursive: true });

      const result = checkPplDuplicates(tmpDir);
      expect(result.ok).toBe(true);
    });

    it("returns ok:false when two PPL files share the same id", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      writeFLG(tmpDir, "FLG_NIGER");
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");
      // Different file name, same id inside
      const dir2 = join(tmpDir, "peuples", "FLG_NIGER");
      mkdirSync(dir2, { recursive: true });
      writeFileSync(
        join(dir2, "PPL_DUPLICATE.json"),
        JSON.stringify({
          id: "PPL_ZULU", // duplicate id
          content: {
            languages: { isoCodes: ["zul"] },
            demography: { distributionByCountry: [] },
            sources: [],
          },
        })
      );

      const result = checkPplDuplicates(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("PPL_ZULU"))).toBe(true);
    });
  });

  // ── FR28 : checkPopulationSums ─────────────────────────────────────────────

  describe("checkPopulationSums (FR28)", () => {
    it("returns ok:true when population sum is within [95, 105]", () => {
      writePays(tmpDir, "ZAF", [
        {
          peopleId: "PPL_ZULU",
          languageFamily: "FLG_BANTU",
          percentageInCountry: 50,
        },
        {
          peopleId: "PPL_XHOSA",
          languageFamily: "FLG_BANTU",
          percentageInCountry: 50,
        },
      ]);

      const result = checkPopulationSums(tmpDir);
      expect(result.ok).toBe(true);
    });

    it("returns ok:true when sum is exactly 95 (lower bound)", () => {
      writePays(tmpDir, "ZAF", [
        {
          peopleId: "PPL_ZULU",
          languageFamily: "FLG_BANTU",
          percentageInCountry: 95,
        },
      ]);

      const result = checkPopulationSums(tmpDir);
      expect(result.ok).toBe(true);
    });

    it("returns ok:true when sum is exactly 105 (upper bound)", () => {
      writePays(tmpDir, "ZAF", [
        {
          peopleId: "PPL_ZULU",
          languageFamily: "FLG_BANTU",
          percentageInCountry: 105,
        },
      ]);

      const result = checkPopulationSums(tmpDir);
      expect(result.ok).toBe(true);
    });

    it("returns ok:false when sum < 95", () => {
      writePays(tmpDir, "ZAF", [
        {
          peopleId: "PPL_ZULU",
          languageFamily: "FLG_BANTU",
          percentageInCountry: 50,
        },
      ]);

      const result = checkPopulationSums(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("ZAF"))).toBe(true);
    });

    it("returns ok:false when sum > 105", () => {
      writePays(tmpDir, "ZAF", [
        {
          peopleId: "PPL_ZULU",
          languageFamily: "FLG_BANTU",
          percentageInCountry: 60,
        },
        {
          peopleId: "PPL_XHOSA",
          languageFamily: "FLG_BANTU",
          percentageInCountry: 50,
        },
      ]);

      const result = checkPopulationSums(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("ZAF"))).toBe(true);
    });

    it("returns ok:true when pays directory has no JSON files", () => {
      mkdirSync(join(tmpDir, "pays"), { recursive: true });

      const result = checkPopulationSums(tmpDir);
      expect(result.ok).toBe(true);
    });

    it("returns ok:true when a pays JSON has no demographics.peoples", () => {
      const dir = join(tmpDir, "pays");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "ZAF.json"),
        JSON.stringify({ id: "ZAF", content: {} })
      );

      const result = checkPopulationSums(tmpDir);
      expect(result.ok).toBe(true);
    });
  });

  // ── FR29 : checkIsoValidity ────────────────────────────────────────────────

  describe("checkIsoValidity (FR29)", () => {
    it("returns ok:true for valid ISO codes", () => {
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");
      writeFLG(tmpDir, "FLG_BANTU");

      const result = checkIsoValidity(tmpDir);
      expect(result.ok).toBe(true);
    });

    it("returns ok:false when isoCodes contains an invalid entry (not 3 lowercase)", () => {
      const dir = join(tmpDir, "peuples", "FLG_BANTU");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "PPL_ZULU.json"),
        JSON.stringify({
          id: "PPL_ZULU",
          content: {
            languages: { isoCodes: ["ZUL"] }, // uppercase — invalid
            demography: {
              distributionByCountry: [{ country: "ZAF", population: 10000000 }],
            },
            sources: [],
          },
        })
      );

      const result = checkIsoValidity(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("ZUL"))).toBe(true);
    });

    it("returns ok:false when distributionByCountry contains invalid country code", () => {
      const dir = join(tmpDir, "peuples", "FLG_BANTU");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "PPL_ZULU.json"),
        JSON.stringify({
          id: "PPL_ZULU",
          content: {
            languages: { isoCodes: ["zul"] },
            demography: {
              distributionByCountry: [
                { country: "za", population: 10000000 }, // too short — invalid
              ],
            },
            sources: [],
          },
        })
      );

      const result = checkIsoValidity(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("za"))).toBe(true);
    });

    it("returns ok:true when peuples directory is empty", () => {
      mkdirSync(join(tmpDir, "peuples"), { recursive: true });

      const result = checkIsoValidity(tmpDir);
      expect(result.ok).toBe(true);
    });
  });

  // ── FR30/FR31 : checkSourceUrls ────────────────────────────────────────────

  describe("checkSourceUrls (FR30/FR31)", () => {
    it("returns ok:true immediately when CHECK_SOURCE_URLS is not set", async () => {
      const original = process.env.CHECK_SOURCE_URLS;
      delete process.env.CHECK_SOURCE_URLS;

      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");

      const result = await checkSourceUrls(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);

      if (original !== undefined) {
        process.env.CHECK_SOURCE_URLS = original;
      }
    });

    it("returns ok:true immediately when CHECK_SOURCE_URLS=false", async () => {
      process.env.CHECK_SOURCE_URLS = "false";

      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");

      const result = await checkSourceUrls(tmpDir);
      expect(result.ok).toBe(true);

      delete process.env.CHECK_SOURCE_URLS;
    });
  });

  // ── checkOrphanFiches ─────────────────────────────────────────────────────

  describe("checkOrphanFiches", () => {
    it("returns ok:true when every PPL file is inside a valid FLG folder", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");

      const result = checkOrphanFiches(tmpDir);
      expect(result.ok).toBe(true);
    });

    it("returns ok:false when a PPL file lives in a folder with no FLG JSON", () => {
      // No FLG_GHOST.json created
      const dir = join(tmpDir, "peuples", "FLG_GHOST");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "PPL_PHANTOM.json"),
        JSON.stringify({
          id: "PPL_PHANTOM",
          content: {
            languages: { isoCodes: ["eng"] },
            demography: { distributionByCountry: [] },
            sources: [],
          },
        })
      );
      mkdirSync(join(tmpDir, "famille_linguistique"), { recursive: true });

      const result = checkOrphanFiches(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("PPL_PHANTOM"))).toBe(true);
    });

    it("returns ok:true when peuples directory is empty", () => {
      mkdirSync(join(tmpDir, "peuples"), { recursive: true });
      mkdirSync(join(tmpDir, "famille_linguistique"), { recursive: true });

      const result = checkOrphanFiches(tmpDir);
      expect(result.ok).toBe(true);
    });
  });
});
