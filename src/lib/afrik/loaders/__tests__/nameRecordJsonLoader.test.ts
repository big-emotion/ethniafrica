import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/api/logger";
import {
  loadAllNameRecordDossiers,
  loadNameRecords,
} from "../nameRecordJsonLoader";
import type { NameRecordDossier, NameRecordSource } from "@/types/names";

// ─── fixtures ─────────────────────────────────────────────────────────────

function validNameFile(overrides: Record<string, unknown> = {}) {
  return {
    _meta: {
      format: "AFRIK JSON v2",
      entity: "nom",
      directives: "Voir DIRECTIVES-AFRIK.md pour les règles complètes.",
    },
    id: "PPL_TEST",
    entityType: "people",
    names: [
      {
        nameText: "Yorùbá",
        nameType: "endonym",
        languageOfOrigin: "yor",
        meaning: null,
        periodLabel: "Usage contemporain",
        imposedBy: null,
        impositionPeriod: null,
        whyProblematic: null,
        contemporaryUsage: "Terme universel.",
        sortRank: 0,
        sources: [
          {
            title: "Ethnologue: Languages of the World — Yoruba (yor)",
            author: "SIL International",
            year: 2024,
            url: "https://www.ethnologue.com/language/yor",
            tier: 1,
            notes: "",
          },
        ],
      },
      {
        nameText: "Nago",
        nameType: "exonym",
        languageOfOrigin: null,
        meaning: null,
        periodLabel: "Période coloniale française",
        imposedBy: "Administration coloniale française",
        impositionPeriod: "XIXe-XXe siècle",
        whyProblematic: "Terme réducteur employé par l'administration.",
        contemporaryUsage: null,
        sortRank: 1,
        sources: [
          {
            title: "Glottolog 5.0 — Yoruboid: Yoruba",
            author: "Max Planck Institute",
            year: 2024,
            url: "https://glottolog.org/resource/languoid/id/yoru1245",
            tier: 1,
            notes: "",
          },
        ],
      },
    ],
    ...overrides,
  };
}

const dialloVariantSource: NameRecordSource = {
  title: "Waccugol Almaami Alfaajo — English translation",
  author: "Boston University NEH Ajami project",
  year: 2022,
  url: "https://sites.bu.edu/nehajami/files/2022/08/Waccugol-Almaami-Alfaajo_English-translation.pdf",
  tier: "referenced",
  notes:
    "Discovered and cross-checked via https://en.wikipedia.org/wiki/Diallo and https://de.wikipedia.org/wiki/Diallo.",
};

function patronymeDossierWithSources(
  sources: NameRecordSource[]
): NameRecordDossier {
  return {
    id: "PAT_DIALLO",
    entityType: "patronyme",
    names: [
      {
        nameText: "Diallo",
        nameType: "surname",
        languageOfOrigin: null,
        meaning: null,
        periodLabel: null,
        imposedBy: null,
        impositionPeriod: null,
        whyProblematic: null,
        contemporaryUsage: null,
        sortRank: 0,
        sources,
      },
    ],
  };
}

function writeNomsFile(
  root: string,
  fileName: string,
  data: Record<string, unknown>
) {
  const dir = join(root, "noms");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), JSON.stringify(data));
}

// ─── Supabase test double ──────────────────────────────────────────────────

interface SourceRow {
  id: string;
  title: string;
  author?: string;
  year?: number;
  url?: string;
  tier?: string;
  notes?: string | null;
}

interface AssertionRow {
  id: string;
  entity_type: string;
  entity_id: string;
  field_path: string;
  statement?: string;
  source_ids?: string[];
}

interface NameRecordRow {
  entity_type: string;
  entity_id: string;
  name_text: string;
  name_type: string;
  assertion_id: string;
  sort_rank: number;
  [key: string]: unknown;
}

interface SupabaseDoubleOptions {
  rejectNameText?: string;
}

function createSupabaseDouble(options: SupabaseDoubleOptions = {}) {
  const sources: SourceRow[] = [];
  const assertions: AssertionRow[] = [];
  const nameRecords: NameRecordRow[] = [];
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

  const from = vi.fn((table: string) => {
    if (table === "sources") {
      return {
        upsert: vi.fn((row: Omit<SourceRow, "id">) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              const existing = sources.find((s) => s.title === row.title);
              if (existing) {
                Object.assign(existing, row);
                return { data: { id: existing.id }, error: null };
              }
              const created = { id: nextId("src"), ...row };
              sources.push(created);
              return { data: { id: created.id }, error: null };
            }),
          })),
        })),
      };
    }

    if (table === "assertions") {
      return {
        select: vi.fn(() => {
          const filters: Record<string, unknown> = {};
          const builder = {
            eq: vi.fn((col: string, value: unknown) => {
              filters[col] = value;
              return builder;
            }),
            maybeSingle: vi.fn(async () => {
              const existing = assertions.find(
                (a) =>
                  a.entity_type === filters.entity_type &&
                  a.entity_id === filters.entity_id &&
                  a.field_path === filters.field_path
              );
              return { data: existing ?? null, error: null };
            }),
          };
          return builder;
        }),
        update: vi.fn((patch: Partial<AssertionRow>) => ({
          eq: vi.fn(async (_col: string, id: string) => {
            const existing = assertions.find((a) => a.id === id);
            if (existing) Object.assign(existing, patch);
            return { error: null };
          }),
        })),
        insert: vi.fn((row: Omit<AssertionRow, "id">) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              const created = { id: nextId("assert"), ...row };
              assertions.push(created);
              return { data: { id: created.id }, error: null };
            }),
          })),
        })),
      };
    }

    if (table === "name_records") {
      return {
        upsert: vi.fn(async (row: NameRecordRow) => {
          if (
            options.rejectNameText &&
            row.name_text === options.rejectNameText
          ) {
            return {
              error: {
                message: `name_records row rejected: assertion ${row.assertion_id} cites zero Tier 1/2 sources (source or drop, FR57).`,
              },
            };
          }

          const index = nameRecords.findIndex(
            (candidate) =>
              candidate.entity_type === row.entity_type &&
              candidate.entity_id === row.entity_id &&
              candidate.name_text === row.name_text &&
              candidate.name_type === row.name_type
          );
          if (index === -1) {
            nameRecords.push(row);
          } else {
            nameRecords[index] = row;
          }
          return { error: null };
        }),
      };
    }

    throw new Error(`Unexpected table in test double: ${table}`);
  });

  return { client: { from }, sources, assertions, nameRecords };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe("nameRecordJsonLoader", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_test_names_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("loadAllNameRecordDossiers", () => {
    // @req REQ-057
    it("loads a valid dossier from a real fixture file", () => {
      writeNomsFile(tmpDir, "PPL_TEST.json", validNameFile());

      const dossiers = loadAllNameRecordDossiers(tmpDir);

      expect(dossiers).toHaveLength(1);
      expect(dossiers[0].id).toBe("PPL_TEST");
      expect(dossiers[0].names).toHaveLength(2);
    });

    // @req REQ-057
    it("excludes files marked _meta.illustrative (production-load exclusion)", () => {
      writeNomsFile(
        tmpDir,
        "PPL_ILLUSTRATIVE.json",
        validNameFile({
          _meta: {
            format: "AFRIK JSON v2",
            entity: "nom",
            directives: "Voir DIRECTIVES-AFRIK.md.",
            illustrative: true,
          },
        })
      );

      const dossiers = loadAllNameRecordDossiers(tmpDir);

      expect(dossiers).toHaveLength(0);
    });

    // @req REQ-057
    it("skips a file failing the strict model and logs the error", () => {
      const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
      writeNomsFile(
        tmpDir,
        "PPL_INVALID.json",
        validNameFile({
          names: [
            {
              nameText: "Broken",
              nameType: "endonym",
              languageOfOrigin: "yor",
              meaning: null,
              periodLabel: null,
              imposedBy: null,
              impositionPeriod: null,
              whyProblematic: null,
              contemporaryUsage: null,
              sortRank: 0,
              sources: [], // invalid: at least one source required
            },
          ],
        })
      );

      const dossiers = loadAllNameRecordDossiers(tmpDir);

      expect(dossiers).toHaveLength(0);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    // @req REQ-057
    it("returns an empty array when the noms directory is absent", () => {
      expect(loadAllNameRecordDossiers(join(tmpDir, "missing"))).toEqual([]);
    });
  });

  describe("loadNameRecords", () => {
    // @req REQ-135
    it("loads sourced patronyme spellings under one canonical entity", async () => {
      const database = createSupabaseDouble();
      const dossier: NameRecordDossier = {
        id: "PAT_DIALLO",
        entityType: "patronyme",
        names: [
          {
            nameText: "Diallo",
            nameType: "surname",
            languageOfOrigin: null,
            meaning: null,
            periodLabel: null,
            imposedBy: null,
            impositionPeriod: null,
            whyProblematic: null,
            contemporaryUsage: null,
            sortRank: 0,
            sources: [dialloVariantSource],
          },
          {
            nameText: "Jallow",
            nameType: "historical_spelling",
            languageOfOrigin: null,
            meaning: null,
            periodLabel: null,
            imposedBy: null,
            impositionPeriod: null,
            whyProblematic: null,
            contemporaryUsage: null,
            sortRank: 1,
            sources: [dialloVariantSource],
          },
          {
            nameText: "Jalloh",
            nameType: "historical_spelling",
            languageOfOrigin: null,
            meaning: null,
            periodLabel: null,
            imposedBy: null,
            impositionPeriod: null,
            whyProblematic: null,
            contemporaryUsage: null,
            sortRank: 2,
            sources: [dialloVariantSource],
          },
        ],
      };

      const report = await loadNameRecords(database.client as never, [dossier]);

      expect(report).toMatchObject({ total: 3, inserted: 3 });
      expect(report.errors).toEqual([]);
      expect(report.dropped).toEqual([]);
      expect(database.sources).toEqual([
        expect.objectContaining({
          url: dialloVariantSource.url,
          tier: "referenced",
          notes: expect.stringContaining(
            "https://en.wikipedia.org/wiki/Diallo"
          ),
        }),
      ]);
      expect(database.sources[0].notes).toContain(
        "https://de.wikipedia.org/wiki/Diallo"
      );
      expect(database.assertions).toHaveLength(3);
      expect(database.assertions).toEqual(
        expect.arrayContaining(
          dossier.names.map((entry) =>
            expect.objectContaining({
              entity_type: "patronyme",
              entity_id: "PAT_DIALLO",
              statement: entry.nameText,
            })
          )
        )
      );
      expect(database.nameRecords).toHaveLength(3);
      expect(database.nameRecords).toEqual(
        expect.arrayContaining(
          dossier.names.map((entry) =>
            expect.objectContaining({
              entity_type: "patronyme",
              entity_id: "PAT_DIALLO",
              name_text: entry.nameText,
            })
          )
        )
      );
      expect(
        new Set(database.nameRecords.map((record) => record.entity_id))
      ).toEqual(new Set(["PAT_DIALLO"]));
    });

    // @req REQ-135
    it("loads a patronyme entry sourced only at unverified (Source Tier Policy: nothing is forbidden, everything is labelled)", async () => {
      const database = createSupabaseDouble();
      const dossier = patronymeDossierWithSources([
        { ...dialloVariantSource, tier: "unverified" },
      ]);

      const report = await loadNameRecords(database.client as never, [dossier]);

      expect(report).toMatchObject({ total: 1, inserted: 1 });
      expect(report.dropped).toEqual([]);
      expect(database.assertions).toHaveLength(1);
      expect(database.nameRecords).toHaveLength(1);
      expect(database.sources[0]).toMatchObject({ tier: "unverified" });
    });

    // @req REQ-057
    it("upserts sources, one assertion per record, then the name_records row", async () => {
      const database = createSupabaseDouble();
      const dossiers = [validNameFile()] as unknown as Parameters<
        typeof loadNameRecords
      >[1];

      const report = await loadNameRecords(database.client as never, dossiers);

      expect(report.total).toBe(2);
      expect(report.inserted).toBe(2);
      expect(report.errors).toEqual([]);
      expect(report.dropped).toEqual([]);

      expect(database.sources).toHaveLength(2);
      expect(database.assertions).toHaveLength(2);
      expect(database.nameRecords).toHaveLength(2);

      const endonymAssertion = database.assertions.find(
        (a) => a.field_path === "names.endonym.yoruba"
      );
      expect(endonymAssertion).toMatchObject({
        entity_type: "people",
        entity_id: "PPL_TEST",
        field_path: "names.endonym.yoruba",
      });
      expect(endonymAssertion?.source_ids).toHaveLength(1);

      const endonymRecord = database.nameRecords.find(
        (r) => r.name_type === "endonym"
      );
      expect(endonymRecord?.sort_rank).toBe(0);
      const exonymRecord = database.nameRecords.find(
        (r) => r.name_type === "exonym"
      );
      expect(exonymRecord?.sort_rank).toBe(1);
    });

    // @req REQ-057
    it("dedups a source cited by more than one name entry via the title constraint", async () => {
      const database = createSupabaseDouble();
      const sharedSource = {
        title: "Shared Tier 1 Source",
        author: "SIL International",
        year: 2024,
        url: "https://example.org/shared",
        tier: 1,
        notes: "",
      };
      const dossier = validNameFile({
        names: [
          {
            nameText: "Yorùbá",
            nameType: "endonym",
            languageOfOrigin: "yor",
            meaning: null,
            periodLabel: null,
            imposedBy: null,
            impositionPeriod: null,
            whyProblematic: null,
            contemporaryUsage: null,
            sortRank: 0,
            sources: [sharedSource],
          },
          {
            nameText: "Nago",
            nameType: "exonym",
            languageOfOrigin: null,
            meaning: null,
            periodLabel: null,
            imposedBy: "Administration coloniale française",
            impositionPeriod: null,
            whyProblematic: "Terme réducteur.",
            contemporaryUsage: null,
            sortRank: 1,
            sources: [sharedSource],
          },
        ],
      });

      const report = await loadNameRecords(
        database.client as never,
        [dossier] as unknown as Parameters<typeof loadNameRecords>[1]
      );

      expect(report.inserted).toBe(2);
      expect(database.sources).toHaveLength(1);
    });

    // @req REQ-057
    it("is idempotent on re-run: no duplicate assertions or name_records rows", async () => {
      const database = createSupabaseDouble();
      const dossiers = [validNameFile()] as unknown as Parameters<
        typeof loadNameRecords
      >[1];

      await loadNameRecords(database.client as never, dossiers);
      const secondReport = await loadNameRecords(
        database.client as never,
        dossiers
      );

      expect(secondReport.inserted).toBe(2);
      expect(database.sources).toHaveLength(2);
      expect(database.assertions).toHaveLength(2);
      expect(database.nameRecords).toHaveLength(2);
    });

    // @req REQ-057
    it("logs, drops, and continues past a record the trigger rejects", async () => {
      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      const database = createSupabaseDouble({ rejectNameText: "Nago" });
      const dossiers = [validNameFile()] as unknown as Parameters<
        typeof loadNameRecords
      >[1];

      const report = await loadNameRecords(database.client as never, dossiers);

      expect(report.total).toBe(2);
      expect(report.inserted).toBe(1);
      expect(report.dropped).toHaveLength(1);
      expect(report.dropped[0]).toContain("Nago");
      expect(warnSpy).toHaveBeenCalled();
      expect(database.nameRecords).toHaveLength(1);
      expect(database.nameRecords[0].name_text).toBe("Yorùbá");

      warnSpy.mockRestore();
    });
  });
});
