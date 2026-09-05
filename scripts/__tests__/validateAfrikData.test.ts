// @req REQ-026
// @req REQ-027
// @req REQ-028
// @req REQ-029
// @req REQ-030
// @req REQ-031
// @req REQ-032
// @req REQ-130
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import {
  checkFlgFolderMatch,
  checkPplDuplicates,
  checkRetiredIdentifiers,
  checkPeopleReferencesResolve,
  RETIRED_IDENTIFIERS_LEDGER,
  checkExternalIdentifierFormats,
  checkPeopleGroupConsistency,
  checkPopulationSums,
  checkIsoValidity,
  checkOrphanFiches,
  checkSourceUrls,
  checkPopulationPercentageDrift,
  checkAuthorizedSourceTiers,
  checkCountryNameFrDistinctFromOfficial,
  checkFamilyStructuralCompleteness,
  checkCountryCodesResolve,
  checkHistoricalAffiliationModel,
  OFF_MAP_COUNTRIES,
  checkSourceIdentity,
  AFRICAN_REFERENCE_COUNTRY_CODES,
} from "../validateAfrikData";

// ─── helpers ──────────────────────────────────────────────────────────────────

function writePaysCsv(
  csvPath: string,
  rows: Array<{ id_pays: string; population_totale: number; annee?: number }>
) {
  mkdirSync(join(csvPath, ".."), { recursive: true });
  const header = "id_pays,nom_pays,population_totale,source,source_url,annee\n";
  const body = rows
    .map(
      (r) =>
        `${r.id_pays},"pays test",${r.population_totale},"ONU","https://example.org/${r.id_pays}",${r.annee ?? 2025}`
    )
    .join("\n");
  writeFileSync(csvPath, header + body + "\n");
}

function writePaysWithPopulation(
  root: string,
  isoCode: string,
  peoples: Array<{
    name: string;
    population?: number;
    percentageInCountry?: number;
    referenceYear?: number;
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

function writePplWithAppellations(
  root: string,
  flgFolder: string,
  pplId: string,
  appellations: { peopleGroupId?: string; peopleGroupLabel?: string }
) {
  const dir = join(root, "peuples", flgFolder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${pplId}.json`),
    JSON.stringify({
      id: pplId,
      content: {
        appellations,
        languages: { isoCodes: ["ful"] },
        demography: { distributionByCountry: [] },
        sources: [],
      },
    })
  );
}

function writePplWithHistoricalAffiliation(
  root: string,
  flgFolder: string,
  pplId: string,
  historicalAffiliation: {
    description?: string;
    sources?: Array<{ title?: string; url?: string | null; tier?: string }>;
  }
) {
  const dir = join(root, "peuples", flgFolder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${pplId}.json`),
    JSON.stringify({
      id: pplId,
      content: {
        historicalAffiliation,
        languages: { isoCodes: ["hat"] },
        demography: { distributionByCountry: [] },
        sources: [],
      },
    })
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

function writePaysNames(
  root: string,
  isoCode: string,
  names: { nameFr?: string; nameOfficial?: string }
) {
  const dir = join(root, "pays");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${isoCode}.json`),
    JSON.stringify({ id: isoCode, ...names, content: {} })
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

    // @req REQ-026
    it("ignores archive folders that are not FLG identifiers", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      mkdirSync(join(tmpDir, "peuples", "FLG_BANTU"), { recursive: true });
      mkdirSync(join(tmpDir, "peuples", "V1"), { recursive: true });

      const result = checkFlgFolderMatch(tmpDir);

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
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

  // ── FR27 : checkRetiredIdentifiers ─────────────────────────────────────────

  describe("checkRetiredIdentifiers (FR27)", () => {
    const ledgerEntry = (
      decision: "merged" | "renamed" | "kept-distinct",
      retiredId: string,
      successorId: string | null
    ) => ({
      decision,
      retiredId,
      successorId,
      reason: "Adjudicated for the test fixture, with a reason long enough.",
      decidedOn: "2026-09-05",
    });

    function writeLedger(root: string, entries: unknown[]) {
      mkdirSync(root, { recursive: true });
      writeFileSync(
        join(root, RETIRED_IDENTIFIERS_LEDGER),
        JSON.stringify(entries)
      );
    }

    // @req REQ-027
    it("returns ok:true when no ledger exists yet", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");

      expect(checkRetiredIdentifiers(tmpDir).ok).toBe(true);
    });

    // @req REQ-027
    it("accepts a ledger whose successors exist and whose retired ids have no fiche", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_SENGA");
      writePPL(tmpDir, "FLG_BANTU", "PPL_NSENGA");
      writeLedger(tmpDir, [
        ledgerEntry("merged", "PPL_ZOULOU", "PPL_ZULU"),
        ledgerEntry("kept-distinct", "PPL_SENGA", null),
      ]);

      const result = checkRetiredIdentifiers(tmpDir);
      expect(result.errors).toEqual([]);
      expect(result.ok).toBe(true);
    });

    // @req REQ-027
    it("fails when a retired id still exists as a fiche file", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZOULOU");
      writeLedger(tmpDir, [ledgerEntry("merged", "PPL_ZOULOU", "PPL_ZULU")]);

      const result = checkRetiredIdentifiers(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("PPL_ZOULOU"))).toBe(true);
    });

    // @req REQ-027
    it("fails when a successor has no fiche or is itself retired", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");
      writeLedger(tmpDir, [
        ledgerEntry("merged", "PPL_ZOULOU", "PPL_AMAZULU"),
        ledgerEntry("renamed", "PPL_AMAZULU", "PPL_ZULU"),
      ]);

      const result = checkRetiredIdentifiers(tmpDir);
      expect(result.ok).toBe(false);
      // PPL_ZOULOU points at a retired id: a redirect must land in one hop.
      expect(result.errors.some((e) => e.includes("PPL_ZOULOU"))).toBe(true);
    });

    // @req REQ-027
    it("fails when a kept-distinct id has no fiche, or a merge has no successor", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");
      writeLedger(tmpDir, [
        ledgerEntry("kept-distinct", "PPL_SENGA", null),
        ledgerEntry("merged", "PPL_ZOULOU", null),
      ]);

      const result = checkRetiredIdentifiers(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("PPL_SENGA"))).toBe(true);
      expect(result.errors.some((e) => e.includes("PPL_ZOULOU"))).toBe(true);
    });

    // @req REQ-027
    it("warns when a country still names a retired id, and fails when nothing succeeds it", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");
      writePaysWithPopulation(tmpDir, "ZAF", [
        { name: "Zulu", population: 1, percentageInCountry: 100 },
      ]);
      writeFileSync(
        join(tmpDir, "pays", "ZAF.json"),
        JSON.stringify({
          id: "ZAF",
          content: {
            majorPeoples: [{ peopleId: "PPL_ZOULOU" }],
            demographics: { peoples: [{ peopleId: "PPL_XHOSA_OLD" }] },
          },
        })
      );
      writeLedger(tmpDir, [
        ledgerEntry("merged", "PPL_ZOULOU", "PPL_ZULU"),
        ledgerEntry("kept-distinct", "PPL_XHOSA_OLD", null),
      ]);

      const result = checkRetiredIdentifiers(tmpDir);
      expect(
        result.warnings.some(
          (w) => w.includes("PPL_ZOULOU") && w.includes("PPL_ZULU")
        )
      ).toBe(true);
      // A kept-distinct entry retires nothing, so its id must exist as a fiche.
      expect(result.errors.some((e) => e.includes("PPL_XHOSA_OLD"))).toBe(true);
    });
  });

  // ── FR27 : checkPeopleReferencesResolve ────────────────────────────────────

  describe("checkPeopleReferencesResolve (FR27)", () => {
    function writeReferencingCorpus(root: string) {
      writeFLG(root, "FLG_BANTU");
      writePPL(root, "FLG_BANTU", "PPL_ZULU");
      writePPL(root, "FLG_BANTU", "PPL_XHOSA", { id: "PPL_XHOSA" });
      writeFileSync(
        join(root, "famille_linguistique", "FLG_BANTU.json"),
        JSON.stringify({
          id: "FLG_BANTU",
          content: { associatedPeoples: [{ peopleId: "PPL_ZULU" }] },
        })
      );
      mkdirSync(join(root, "pays"), { recursive: true });
      writeFileSync(
        join(root, "pays", "ZAF.json"),
        JSON.stringify({
          id: "ZAF",
          content: {
            majorPeoples: [{ peopleId: "PPL_ZULU" }],
            demographics: { peoples: [{ peopleId: "PPL_XHOSA" }] },
          },
        })
      );
      mkdirSync(join(root, "relations"), { recursive: true });
      writeFileSync(
        join(root, "relations", "REL_TEST.json"),
        JSON.stringify({
          id: "REL_TEST",
          peopleIdA: "PPL_ZULU",
          peopleIdB: "PPL_XHOSA",
        })
      );
      mkdirSync(join(root, "patronymes"), { recursive: true });
      writeFileSync(
        join(root, "patronymes", "PAT_TEST.json"),
        JSON.stringify({
          id: "PAT_TEST",
          peoples: [{ peopleId: "PPL_ZULU", status: "attested" }],
        })
      );
      mkdirSync(join(root, "migrations"), { recursive: true });
      writeFileSync(
        join(root, "migrations", "MGR_TEST.json"),
        JSON.stringify({
          id: "MGR_TEST",
          peoplesInvolved: [{ id: "PPL_XHOSA", role: "origin" }],
        })
      );
    }

    // @req REQ-027
    it("returns ok:true when every reference names an existing fiche", () => {
      writeReferencingCorpus(tmpDir);

      const result = checkPeopleReferencesResolve(tmpDir);
      expect(result.errors).toEqual([]);
      expect(result.ok).toBe(true);
    });

    // @req REQ-027
    it("resolves a reference to a retired id through its successor", () => {
      writeReferencingCorpus(tmpDir);
      writeFileSync(
        join(tmpDir, "pays", "ZAF.json"),
        JSON.stringify({
          id: "ZAF",
          content: { majorPeoples: [{ peopleId: "PPL_ZOULOU" }] },
        })
      );
      writeFileSync(
        join(tmpDir, RETIRED_IDENTIFIERS_LEDGER),
        JSON.stringify([
          {
            decision: "merged",
            retiredId: "PPL_ZOULOU",
            successorId: "PPL_ZULU",
            reason: "Same people under two spellings, kept the endonym.",
            decidedOn: "2026-09-05",
          },
        ])
      );

      expect(checkPeopleReferencesResolve(tmpDir).ok).toBe(true);
    });

    // @req REQ-027
    it("fails on a country, family, relation, patronym or migration naming an unknown id", () => {
      writeReferencingCorpus(tmpDir);
      writeFileSync(
        join(tmpDir, "pays", "ZAF.json"),
        JSON.stringify({
          id: "ZAF",
          content: {
            majorPeoples: [{ peopleId: "PPL_GHOST_MAJOR" }],
            demographics: { peoples: [{ peopleId: "PPL_GHOST_DEMO" }] },
          },
        })
      );
      writeFileSync(
        join(tmpDir, "famille_linguistique", "FLG_BANTU.json"),
        JSON.stringify({
          id: "FLG_BANTU",
          content: { associatedPeoples: [{ peopleId: "PPL_GHOST_FAMILY" }] },
        })
      );
      writeFileSync(
        join(tmpDir, "relations", "REL_TEST.json"),
        JSON.stringify({
          id: "REL_TEST",
          peopleIdA: "PPL_ZULU",
          peopleIdB: "PPL_GHOST_REL",
        })
      );
      writeFileSync(
        join(tmpDir, "patronymes", "PAT_TEST.json"),
        JSON.stringify({
          id: "PAT_TEST",
          peoples: [{ peopleId: "PPL_GHOST_PAT" }],
        })
      );
      writeFileSync(
        join(tmpDir, "migrations", "MGR_TEST.json"),
        JSON.stringify({
          id: "MGR_TEST",
          peoplesInvolved: [{ id: "PPL_GHOST_MGR" }],
        })
      );

      const result = checkPeopleReferencesResolve(tmpDir);
      expect(result.ok).toBe(false);
      for (const ghost of [
        "PPL_GHOST_MAJOR",
        "PPL_GHOST_DEMO",
        "PPL_GHOST_FAMILY",
        "PPL_GHOST_REL",
        "PPL_GHOST_PAT",
        "PPL_GHOST_MGR",
      ]) {
        expect(result.errors.some((e) => e.includes(ghost))).toBe(true);
      }
    });

    // @req REQ-027
    it("ignores curator worksheets and templates", () => {
      writeReferencingCorpus(tmpDir);
      writeFileSync(
        join(tmpDir, "patronymes", "_candidates.json"),
        JSON.stringify({ peopleIds: ["PPL_GHOST_WORKSHEET"] })
      );
      mkdirSync(join(tmpDir, "systemes_onomastiques"), { recursive: true });
      writeFileSync(
        join(tmpDir, "systemes_onomastiques", "ONS_TEMPLATE.json"),
        JSON.stringify({ associatedPeoples: ["PPL_XXXXX"] })
      );

      expect(checkPeopleReferencesResolve(tmpDir).ok).toBe(true);
    });
  });

  // ── ETNI-1414 : checkExternalIdentifierFormats ─────────────────────────────

  describe("checkExternalIdentifierFormats (ETNI-1414)", () => {
    // @req REQ-128
    it("returns ok:true when all three identifiers are well-formed", () => {
      writeFLG(tmpDir, "FLG_BENOUECONGO");
      writePPL(tmpDir, "FLG_BENOUECONGO", "PPL_YORUBA", {
        content: {
          externalIdentifiers: {
            wikidataId: "Q34636",
            glottocode: "yoru1245",
            iso639_3: "yor",
          },
          languages: { isoCodes: ["yor"] },
          demography: { distributionByCountry: [] },
          sources: [],
        },
      });

      const result = checkExternalIdentifierFormats(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-128
    it("errors when wikidataId does not match the Q-id format", () => {
      writeFLG(tmpDir, "FLG_BENOUECONGO");
      writePPL(tmpDir, "FLG_BENOUECONGO", "PPL_YORUBA", {
        content: {
          externalIdentifiers: { wikidataId: "34636" },
          languages: { isoCodes: ["yor"] },
          demography: { distributionByCountry: [] },
          sources: [],
        },
      });

      const result = checkExternalIdentifierFormats(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.includes("PPL_YORUBA") &&
            e.includes("wikidataId") &&
            e.includes("34636")
        )
      ).toBe(true);
    });

    // @req REQ-128
    it("errors when glottocode does not match the 4-letter/4-digit format", () => {
      writeFLG(tmpDir, "FLG_BENOUECONGO");
      writePPL(tmpDir, "FLG_BENOUECONGO", "PPL_YORUBA", {
        content: {
          externalIdentifiers: { glottocode: "Yoru1245" },
          languages: { isoCodes: ["yor"] },
          demography: { distributionByCountry: [] },
          sources: [],
        },
      });

      const result = checkExternalIdentifierFormats(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.includes("PPL_YORUBA") &&
            e.includes("glottocode") &&
            e.includes("Yoru1245")
        )
      ).toBe(true);
    });

    // @req REQ-128
    it("errors when iso639_3 is not a 3-letter lowercase code", () => {
      writeFLG(tmpDir, "FLG_BENOUECONGO");
      writePPL(tmpDir, "FLG_BENOUECONGO", "PPL_YORUBA", {
        content: {
          externalIdentifiers: { iso639_3: "YOR" },
          languages: { isoCodes: ["yor"] },
          demography: { distributionByCountry: [] },
          sources: [],
        },
      });

      const result = checkExternalIdentifierFormats(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.includes("PPL_YORUBA") &&
            e.includes("iso639_3") &&
            e.includes("YOR")
        )
      ).toBe(true);
    });

    // @req REQ-128
    it("returns ok:true when a fiche has no externalIdentifiers section at all", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");

      const result = checkExternalIdentifierFormats(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-128
    it("returns ok:true when externalIdentifiers is present but every field is absent", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU", {
        content: {
          externalIdentifiers: {},
          languages: { isoCodes: ["zul"] },
          demography: { distributionByCountry: [] },
          sources: [],
        },
      });

      const result = checkExternalIdentifierFormats(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── ETNI-1391 : checkPeopleGroupConsistency ────────────────────────────────

  describe("checkPeopleGroupConsistency (ETNI-1391)", () => {
    // @req REQ-002
    it("returns ok:true when no fiche declares a people group", () => {
      writeFLG(tmpDir, "FLG_BANTU");
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");

      const result = checkPeopleGroupConsistency(tmpDir);
      expect(result.ok).toBe(true);
    });

    // @req REQ-002
    it("returns ok:true when split fiches agree on id and label", () => {
      writeFLG(tmpDir, "FLG_ATLANTIQUE");
      writePplWithAppellations(tmpDir, "FLG_ATLANTIQUE", "PPL_FULANI", {
        peopleGroupId: "PGRP_FULANI",
        peopleGroupLabel: "Peul / Fulani",
      });
      writePplWithAppellations(tmpDir, "FLG_ATLANTIQUE", "PPL_FULANI_MASSINA", {
        peopleGroupId: "PGRP_FULANI",
        peopleGroupLabel: "Peul / Fulani",
      });

      const result = checkPeopleGroupConsistency(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    // @req REQ-002
    it("errors when a peopleGroupId is set without a peopleGroupLabel", () => {
      writeFLG(tmpDir, "FLG_ATLANTIQUE");
      writePplWithAppellations(tmpDir, "FLG_ATLANTIQUE", "PPL_FULANI", {
        peopleGroupId: "PGRP_FULANI",
      });

      const result = checkPeopleGroupConsistency(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some(
          (e) => e.includes("PGRP_FULANI") && e.includes("peopleGroupLabel")
        )
      ).toBe(true);
    });

    // @req REQ-002
    it("errors when a peopleGroupLabel is set without a peopleGroupId", () => {
      writeFLG(tmpDir, "FLG_ATLANTIQUE");
      writePplWithAppellations(tmpDir, "FLG_ATLANTIQUE", "PPL_FULANI", {
        peopleGroupLabel: "Peul / Fulani",
      });

      const result = checkPeopleGroupConsistency(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some(
          (e) => e.includes("Peul / Fulani") && e.includes("peopleGroupId")
        )
      ).toBe(true);
    });

    // @req REQ-002
    it("errors when two fiches share a peopleGroupId but disagree on the label", () => {
      writeFLG(tmpDir, "FLG_ATLANTIQUE");
      writePplWithAppellations(tmpDir, "FLG_ATLANTIQUE", "PPL_FULANI", {
        peopleGroupId: "PGRP_FULANI",
        peopleGroupLabel: "Peul / Fulani",
      });
      writePplWithAppellations(tmpDir, "FLG_ATLANTIQUE", "PPL_FULANI_MASSINA", {
        peopleGroupId: "PGRP_FULANI",
        peopleGroupLabel: "Fulani (Massina)",
      });

      const result = checkPeopleGroupConsistency(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some(
          (e) => e.includes("PGRP_FULANI") && e.includes("disagreeing")
        )
      ).toBe(true);
    });

    // @req REQ-002
    it("warns, but does not error, when a peopleGroupId is declared by only one fiche", () => {
      writeFLG(tmpDir, "FLG_ATLANTIQUE");
      writePplWithAppellations(tmpDir, "FLG_ATLANTIQUE", "PPL_FULANI", {
        peopleGroupId: "PGRP_FULANI",
        peopleGroupLabel: "Peul / Fulani",
      });

      const result = checkPeopleGroupConsistency(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.warnings.some((w) => w.includes("single fiche"))).toBe(
        true
      );
    });
  });

  // ── FR111 : checkHistoricalAffiliationModel (REQ-127) ──────────────────────

  describe("checkHistoricalAffiliationModel (FR111, REQ-127)", () => {
    // @req REQ-127
    it("returns ok:true when no fiche declares a historical affiliation", () => {
      writeFLG(tmpDir, "FLG_CREOLE");
      writePPL(tmpDir, "FLG_CREOLE", "PPL_HAITIAN");

      const result = checkHistoricalAffiliationModel(tmpDir);
      expect(result.ok).toBe(true);
    });

    // @req REQ-127
    it("returns ok:true for a well-formed historical affiliation, sourced and tiered", () => {
      writeFLG(tmpDir, "FLG_CREOLE");
      writePplWithHistoricalAffiliation(tmpDir, "FLG_CREOLE", "PPL_HAITIAN", {
        description:
          "Peuple afro-descendant formé par la traite transatlantique ; Glottolog classe le créole haïtien sous la famille de son lexifieur, jamais sous une famille africaine.",
        sources: [
          {
            title: "UNESCO — Mémoire du monde, route des esclaves",
            url: "https://www.unesco.org/en/memory-world",
            tier: "official",
          },
        ],
      });

      const result = checkHistoricalAffiliationModel(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-127
    it("does not touch languageFamilyId when historicalAffiliation is present", () => {
      writeFLG(tmpDir, "FLG_CREOLE");
      writePplWithHistoricalAffiliation(tmpDir, "FLG_CREOLE", "PPL_HAITIAN", {
        description: "Lien historique avec l'Afrique via la traite négrière.",
        sources: [
          {
            title: "UNESCO — Mémoire du monde, route des esclaves",
            url: "https://www.unesco.org/en/memory-world",
            tier: "official",
          },
        ],
      });

      const dir = join(tmpDir, "peuples", "FLG_CREOLE");
      const written = JSON.parse(
        readFileSync(join(dir, "PPL_HAITIAN.json"), "utf-8")
      );
      expect(written.languageFamilyId).toBeUndefined();
      expect(written.content.historicalAffiliation).toBeDefined();
    });

    // @req REQ-127
    it("errors when historicalAffiliation has no description", () => {
      writeFLG(tmpDir, "FLG_CREOLE");
      writePplWithHistoricalAffiliation(tmpDir, "FLG_CREOLE", "PPL_HAITIAN", {
        description: "",
        sources: [
          {
            title: "UNESCO — Mémoire du monde, route des esclaves",
            url: "https://www.unesco.org/en/memory-world",
            tier: "official",
          },
        ],
      });

      const result = checkHistoricalAffiliationModel(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("description"))).toBe(true);
    });

    // @req REQ-127
    it("errors when historicalAffiliation has no sources", () => {
      writeFLG(tmpDir, "FLG_CREOLE");
      writePplWithHistoricalAffiliation(tmpDir, "FLG_CREOLE", "PPL_HAITIAN", {
        description: "Lien historique avec l'Afrique via la traite négrière.",
        sources: [],
      });

      const result = checkHistoricalAffiliationModel(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("sources"))).toBe(true);
    });

    // @req REQ-127
    it("errors when a historicalAffiliation source carries no valid tier", () => {
      writeFLG(tmpDir, "FLG_CREOLE");
      writePplWithHistoricalAffiliation(tmpDir, "FLG_CREOLE", "PPL_HAITIAN", {
        description: "Lien historique avec l'Afrique via la traite négrière.",
        sources: [
          {
            title: "Un blog non tierré",
            url: "https://example.org/blog",
            tier: "invented-tier",
          },
        ],
      });

      const result = checkHistoricalAffiliationModel(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("tier"))).toBe(true);
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

  // ── checkCountryCodesResolve ───────────────────────────────────────────────

  describe("checkCountryCodesResolve", () => {
    function writeDistribution(
      countries: Array<{ country: string; population: number }>
    ): void {
      const dir = join(tmpDir, "peuples", "FLG_BANTU");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "PPL_ZULU.json"),
        JSON.stringify({
          id: "PPL_ZULU",
          content: {
            languages: { isoCodes: ["zul"] },
            demography: { distributionByCountry: countries },
            sources: [],
          },
        })
      );
    }

    // "GBN" for Gabon passed FR29 for as long as it existed: the shape check
    // only asks for three uppercase letters, so a typo reads as valid and the
    // presence silently stops being drawable. This is the check that fails.
    // @req REQ-119
    it("rejects a well-formed code that names no country the atlas knows", () => {
      writeDistribution([{ country: "GBN", population: 50000 }]);

      const result = checkCountryCodesResolve(tmpDir);

      expect(result.ok).toBe(false);
      expect(result.errors.some((error) => error.includes("GBN"))).toBe(true);
    });

    // @req REQ-119
    it("accepts a country the admin-0 asset draws", () => {
      writeDistribution([{ country: "ZAF", population: 10000000 }]);

      expect(checkCountryCodesResolve(tmpDir).ok).toBe(true);
    });

    // The asset is keyed by Natural Earth codes for two territories; the
    // corpus writes ISO. Both spellings name geometry that exists.
    // @req REQ-119
    it("accepts an ISO code the asset holds under its Natural Earth key", () => {
      writeDistribution([{ country: "SSD", population: 1000000 }]);

      expect(checkCountryCodesResolve(tmpDir).ok).toBe(true);
    });

    // A diaspora outside Africa is a real declared presence, not an error —
    // but it has to be declared here too, so a new one is a deliberate act
    // rather than a typo that happens to fall through.
    // @req REQ-119
    it("accepts an off-map country only when it is on the declared list", () => {
      writeDistribution([{ country: "USA", population: 1200000 }]);
      expect(checkCountryCodesResolve(tmpDir).ok).toBe(true);

      writeDistribution([{ country: "JPN", population: 1200 }]);
      expect(checkCountryCodesResolve(tmpDir).ok).toBe(false);
    });

    // DEC-030 attaches Afro-descendant peoples by history rather than
    // filiation; their host countries — Brazil, Haiti — carry no admin-0
    // geometry, so a fiche declaring them needs the same off-map path USA
    // already uses.
    // @req REQ-130
    it("accepts Brazil and Haiti as declared off-map presences", () => {
      writeDistribution([
        { country: "BRA", population: 15000000 },
        { country: "HTI", population: 9000000 },
      ]);

      expect(checkCountryCodesResolve(tmpDir).ok).toBe(true);
    });

    // Extending the off-map list must not change how a country already
    // covered by admin-0 geometry resolves.
    // @req REQ-130
    it("still resolves an African country through admin-0 geometry, unaffected by the off-map list", () => {
      writeDistribution([{ country: "ZAF", population: 10000000 }]);

      const result = checkCountryCodesResolve(tmpDir);

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── OFF_MAP_COUNTRIES (REQ-130) ────────────────────────────────────────────

  describe("OFF_MAP_COUNTRIES holds the non-African host codes (REQ-130)", () => {
    // @req REQ-130
    it("declares Brazil and Haiti alongside the pre-existing codes", () => {
      expect(OFF_MAP_COUNTRIES.has("BRA")).toBe(true);
      expect(OFF_MAP_COUNTRIES.has("HTI")).toBe(true);
      expect(OFF_MAP_COUNTRIES.has("USA")).toBe(true);
    });

    // @req REQ-130
    it("never holds a code from the African reference set", () => {
      for (const code of OFF_MAP_COUNTRIES) {
        expect(AFRICAN_REFERENCE_COUNTRY_CODES.has(code)).toBe(false);
      }
    });
  });

  // ── FR90 : checkFamilyStructuralCompleteness ───────────────────────────────

  describe("checkFamilyStructuralCompleteness (FR90)", () => {
    function writeFlgWithContent(
      root: string,
      id: string,
      overrides: {
        branches?: unknown;
        distributionByCountry?: unknown;
      } = {}
    ) {
      const dir = join(root, "famille_linguistique");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, `${id}.json`),
        JSON.stringify({
          id,
          content: {
            generalInfo: {
              branches: overrides.branches ?? ["Bénoué-Congo"],
            },
            distribution: {
              distributionByCountry: overrides.distributionByCountry ?? {
                COD: 50000000,
              },
            },
          },
        })
      );
    }

    // @req REQ-119
    it("returns ok:true when branches and distributionByCountry are populated", () => {
      writeFlgWithContent(tmpDir, "FLG_BANTU");

      const result = checkFamilyStructuralCompleteness(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-119
    it("returns ok:false when branches is empty", () => {
      writeFlgWithContent(tmpDir, "FLG_BANTU", { branches: [] });

      const result = checkFamilyStructuralCompleteness(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some((e) => e.includes("generalInfo.branches"))
      ).toBe(true);
    });

    // @req REQ-119
    it("returns ok:false when branches contains a blank entry", () => {
      writeFlgWithContent(tmpDir, "FLG_BANTU", {
        branches: ["Bantoïde", "  "],
      });

      const result = checkFamilyStructuralCompleteness(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some((e) => e.includes("generalInfo.branches"))
      ).toBe(true);
    });

    // @req REQ-119
    it("returns ok:false when distributionByCountry is empty", () => {
      writeFlgWithContent(tmpDir, "FLG_BANTU", { distributionByCountry: {} });

      const result = checkFamilyStructuralCompleteness(tmpDir);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes("distribution.distributionByCountry")
        )
      ).toBe(true);
    });

    // @req REQ-119
    it("returns ok:false when a country code is not ISO 3166-1 α-3", () => {
      writeFlgWithContent(tmpDir, "FLG_BANTU", {
        distributionByCountry: { cod: 50000000 },
      });

      const result = checkFamilyStructuralCompleteness(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("cod"))).toBe(true);
    });

    // @req REQ-119
    it("returns ok:false when a speaker count is not a positive number", () => {
      writeFlgWithContent(tmpDir, "FLG_BANTU", {
        distributionByCountry: { COD: 0 },
      });

      const result = checkFamilyStructuralCompleteness(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes('["COD"]'))).toBe(true);
    });

    // @req REQ-119
    it("returns ok:true when famille_linguistique directory is empty", () => {
      mkdirSync(join(tmpDir, "famille_linguistique"), { recursive: true });

      const result = checkFamilyStructuralCompleteness(tmpDir);
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

    it("writes source-url-health.log two levels above datasetRoot (dataset/ sibling)", async () => {
      // Build a fake datasetRoot mimicking <repo>/dataset/source/afrik
      // tmpDir acts as the repo root; datasetRoot = tmpDir/dataset/source/afrik
      const fakeDatasetRoot = join(tmpDir, "dataset", "source", "afrik");
      mkdirSync(join(fakeDatasetRoot, "peuples"), { recursive: true });

      // Expected log location: tmpDir/dataset/source-url-health.log
      const expectedLogPath = resolve(
        fakeDatasetRoot,
        "../..",
        "source-url-health.log"
      );

      // Verify the resolved path is indeed <repo>/dataset/source-url-health.log
      expect(expectedLogPath).toBe(
        join(tmpDir, "dataset", "source-url-health.log")
      );

      // Trigger a run (no PPL files → no URLs → log still written if it would be)
      // We only need to verify the path arithmetic; no network calls needed.
      process.env.CHECK_SOURCE_URLS = "true";
      await checkSourceUrls(fakeDatasetRoot);
      delete process.env.CHECK_SOURCE_URLS;

      // Log file should exist at the expected path (even if empty, it gets written)
      // (appendFileSync is called with empty content when there are no URLs)
      expect(existsSync(expectedLogPath)).toBe(true);
    });
  });

  // ── Source tiers ────────────────────────────────────────────────────────

  describe("checkSourceIdentity", () => {
    const cite = (source: Record<string, unknown>) => ({
      content: {
        languages: { isoCodes: ["zul"] },
        demography: {
          distributionByCountry: [{ country: "ZAF", population: 10000 }],
        },
        sources: [source],
      },
    });

    // @req REQ-092
    it("passes when one title always carries the same locator", () => {
      const source = {
        title: "Statistics South Africa — Census 2011",
        url: "https://www.statssa.gov.za/census/census_2011/",
        tier: "official",
      };
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU", cite(source));
      writePPL(tmpDir, "FLG_BANTU", "PPL_SOTHO", cite(source));

      expect(checkSourceIdentity(tmpDir)).toMatchObject({
        ok: true,
        errors: [],
      });
    });

    // @req REQ-092
    it("fails when one title is cited with two different URLs", () => {
      const title = "The Morphological Analysis of Zulu Clan Names";
      writePPL(
        tmpDir,
        "FLG_BANTU",
        "PPL_ZULU",
        cite({
          title,
          url: "https://doi.org/10.5430/elr.v9n3p36",
          tier: "referenced",
        })
      );
      writePPL(
        tmpDir,
        "FLG_BANTU",
        "PPL_SOTHO",
        cite({
          title,
          url: "https://www.researchgate.net/publication/345494106",
          tier: "referenced",
        })
      );

      const result = checkSourceIdentity(tmpDir);

      expect(result.ok).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("one title, one locator")
      );
    });

    // @req REQ-092
    it("rejects a standing left over from the retired numeric scale", () => {
      writePPL(
        tmpDir,
        "FLG_BANTU",
        "PPL_ZULU",
        cite({
          title: "General History of Africa",
          url: "https://unesco.org",
          tier: 1,
        })
      );

      const result = checkSourceIdentity(tmpDir);

      expect(result.ok).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('declares standing "1"')
      );
    });

    // @req REQ-092
    it("accepts needs_review, which marks an unadjudicated source rather than a weak one", () => {
      writePPL(
        tmpDir,
        "FLG_BANTU",
        "PPL_ZULU",
        cite({ title: "Oral testimony, Ulundi", tier: "needs_review" })
      );

      expect(checkSourceIdentity(tmpDir)).toMatchObject({
        ok: true,
        errors: [],
      });
    });
  });

  describe("checkAuthorizedSourceTiers", () => {
    // @req REQ-092
    it("tiers a discovery-only citation as unverified instead of refusing it", () => {
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU");

      const result = checkAuthorizedSourceTiers(tmpDir);

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(
        result.warnings.some((warning) =>
          warning.includes(
            'cites "wikipedia", which publishes at tier unverified'
          )
        )
      ).toBe(true);
    });

    // @req REQ-092
    it("tiers an AI-generated citation as unverified instead of refusing it", () => {
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU", {
        content: {
          languages: { isoCodes: ["zul"] },
          demography: {
            distributionByCountry: [{ country: "ZAF", population: 10000000 }],
          },
          sources: [{ url: "https://chatgpt.com/share/example" }],
        },
      });

      const result = checkAuthorizedSourceTiers(tmpDir);

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(
        result.warnings.some((warning) =>
          warning.includes(
            'cites "ai-generated", which publishes at tier unverified'
          )
        )
      ).toBe(true);
    });

    // @req REQ-092
    it("tiers an off-catalogue citation as unverified", () => {
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU", {
        content: {
          languages: { isoCodes: ["zul"] },
          demography: {
            distributionByCountry: [{ country: "ZAF", population: 10000000 }],
          },
          sources: [{ url: "https://unlisted.example/source" }],
        },
      });

      const result = checkAuthorizedSourceTiers(tmpDir);

      expect(result.ok).toBe(true);
      expect(
        result.warnings.some((warning) =>
          warning.includes(
            'cites "unknown", which publishes at tier unverified'
          )
        )
      ).toBe(true);
    });

    // @req REQ-092
    it("says nothing about a catalogued authority", () => {
      writePPL(tmpDir, "FLG_BANTU", "PPL_ZULU", {
        content: {
          languages: { isoCodes: ["zul"] },
          demography: {
            distributionByCountry: [{ country: "ZAF", population: 10000000 }],
          },
          sources: [{ url: "https://www.unesco.org/en/languages" }],
        },
      });

      const result = checkAuthorizedSourceTiers(tmpDir);

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  // ── FR32 : checkPopulationPercentageDrift ─────────────────────────────────

  describe("checkPopulationPercentageDrift (FR32)", () => {
    let csvPath: string;

    beforeEach(() => {
      csvPath = join(tmpDir, "pays_demographie.csv");
    });

    it("returns ok:true when no entry has both population and percentageInCountry", () => {
      writePaysCsv(csvPath, [{ id_pays: "KEN", population_totale: 55000000 }]);
      writePaysWithPopulation(tmpDir, "KEN", [
        { name: "Kikuyu", percentageInCountry: 22 },
        { name: "Luhya", percentageInCountry: 14 },
      ]);

      const result = checkPopulationPercentageDrift(tmpDir, csvPath);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // A census headcount is dated by its census, not by the atlas's 2025
    // reference year. Measured against the 2025 total it always drifts —
    // Kenya's 2019 Kikuyu count reads 17.1 % of the 2019 country and 14.2 % of
    // the 2025 one — so the comparison has to reach for the total of the year
    // the value carries.
    // @req REQ-032
    it("compares a dated headcount against the total of its own year", () => {
      writePaysCsv(csvPath, [
        { id_pays: "KEN", population_totale: 47564296, annee: 2019 },
        { id_pays: "KEN", population_totale: 57500000, annee: 2025 },
      ]);
      writePaysWithPopulation(tmpDir, "KEN", [
        {
          name: "Kikuyu",
          population: 8148668,
          percentageInCountry: 17.1,
          referenceYear: 2019,
        },
      ]);

      const result = checkPopulationPercentageDrift(tmpDir, csvPath);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-032
    it("still reads an undated headcount against the 2025 total", () => {
      writePaysCsv(csvPath, [
        { id_pays: "KEN", population_totale: 10000000, annee: 2025 },
      ]);
      writePaysWithPopulation(tmpDir, "KEN", [
        { name: "Kikuyu", population: 5000000, percentageInCountry: 20 },
      ]);

      const result = checkPopulationPercentageDrift(tmpDir, csvPath);
      expect(result.ok).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    // No invented total: a year the CSV does not cover is reported, not
    // silently measured against a different year's denominator.
    // @req REQ-032
    it("warns instead of erroring when the CSV has no total for that year", () => {
      writePaysCsv(csvPath, [
        { id_pays: "KEN", population_totale: 57500000, annee: 2025 },
      ]);
      writePaysWithPopulation(tmpDir, "KEN", [
        {
          name: "Kikuyu",
          population: 8148668,
          percentageInCountry: 17.1,
          referenceYear: 2019,
        },
      ]);

      const result = checkPopulationPercentageDrift(tmpDir, csvPath);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.join(" ")).toMatch(/2019/);
    });

    it("returns ok:true when drift is within 2 pp", () => {
      writePaysCsv(csvPath, [{ id_pays: "KEN", population_totale: 10000000 }]);
      // implied = 2100000/10000000*100 = 21%, stated = 20%, drift = 1pp → ok
      writePaysWithPopulation(tmpDir, "KEN", [
        { name: "Kikuyu", population: 2100000, percentageInCountry: 20 },
      ]);

      const result = checkPopulationPercentageDrift(tmpDir, csvPath);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns ok:false (hard error) when drift > 2 pp for a non-ZAF country", () => {
      writePaysCsv(csvPath, [{ id_pays: "KEN", population_totale: 10000000 }]);
      // implied = 5000000/10000000*100 = 50%, stated = 20%, drift = 30pp → error
      writePaysWithPopulation(tmpDir, "KEN", [
        { name: "Kikuyu", population: 5000000, percentageInCountry: 20 },
      ]);

      const result = checkPopulationPercentageDrift(tmpDir, csvPath);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("KEN"))).toBe(true);
      expect(result.errors.some((e) => e.includes("Kikuyu"))).toBe(true);
    });

    it("returns warning only (not error) for ZAF regardless of drift", () => {
      writePaysCsv(csvPath, [{ id_pays: "ZAF", population_totale: 10000000 }]);
      // drift = 30pp — should warn but not error
      writePaysWithPopulation(tmpDir, "ZAF", [
        { name: "Zulu", population: 5000000, percentageInCountry: 20 },
      ]);

      const result = checkPopulationPercentageDrift(tmpDir, csvPath);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.some((w) => w.includes("ZAF"))).toBe(true);
    });

    it("returns warning only when country has no CSV row (no invented total)", () => {
      writePaysCsv(csvPath, [{ id_pays: "KEN", population_totale: 55000000 }]);
      // NGR has no CSV row → skip with warning
      writePaysWithPopulation(tmpDir, "NGR", [
        { name: "Hausa", population: 1000000, percentageInCountry: 20 },
      ]);

      const result = checkPopulationPercentageDrift(tmpDir, csvPath);
      expect(result.ok).toBe(true);
      expect(result.warnings.some((w) => w.includes("NGR"))).toBe(true);
    });

    it("returns warning only when CSV file is missing", () => {
      writePaysWithPopulation(tmpDir, "KEN", [
        { name: "Kikuyu", population: 5000000, percentageInCountry: 20 },
      ]);
      const missingCsv = join(tmpDir, "nonexistent.csv");

      const result = checkPopulationPercentageDrift(tmpDir, missingCsv);
      expect(result.ok).toBe(true);
      expect(result.warnings.some((w) => w.includes("not found"))).toBe(true);
    });
  });

  describe("checkCountryNameFrDistinctFromOfficial (FR33)", () => {
    // @req REQ-033
    it("returns ok:true when nameFr differs from nameOfficial", () => {
      writePaysNames(tmpDir, "NGA", {
        nameFr: "Nigeria",
        nameOfficial:
          "République fédérale du Nigeria (Federal Republic of Nigeria)",
      });

      const result = checkCountryNameFrDistinctFromOfficial(tmpDir);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // @req REQ-033
    it("returns ok:true when nameOfficial is absent", () => {
      writePaysNames(tmpDir, "NGA", { nameFr: "Nigeria" });

      const result = checkCountryNameFrDistinctFromOfficial(tmpDir);
      expect(result.ok).toBe(true);
    });

    // @req REQ-033
    it("returns ok:false (hard error) when nameFr duplicates nameOfficial", () => {
      writePaysNames(tmpDir, "NGA", {
        nameFr: "République fédérale du Nigeria (Federal Republic of Nigeria)",
        nameOfficial:
          "République fédérale du Nigeria (Federal Republic of Nigeria)",
      });

      const result = checkCountryNameFrDistinctFromOfficial(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("NGA"))).toBe(true);
      expect(
        result.errors.some((e) => e.includes("duplicates nameOfficial"))
      ).toBe(true);
    });

    // @req REQ-033
    it("returns ok:false when nameFr is missing or empty", () => {
      writePaysNames(tmpDir, "NGA", {
        nameFr: "",
        nameOfficial:
          "République fédérale du Nigeria (Federal Republic of Nigeria)",
      });

      const result = checkCountryNameFrDistinctFromOfficial(tmpDir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("missing or empty"))).toBe(
        true
      );
    });

    // @req REQ-033
    it("returns ok:true when pays directory has no JSON files", () => {
      mkdirSync(join(tmpDir, "pays"), { recursive: true });

      const result = checkCountryNameFrDistinctFromOfficial(tmpDir);
      expect(result.ok).toBe(true);
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
