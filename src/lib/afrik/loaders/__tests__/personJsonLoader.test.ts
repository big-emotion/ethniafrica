import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/api/logger";
import { loadAllPersonDossiers, loadPersons } from "../personJsonLoader";
import type { PersonDossier } from "@/types/persons";

// ─── fixtures ─────────────────────────────────────────────────────────────

function validPersonFile(overrides: Record<string, unknown> = {}) {
  return {
    _meta: {
      format: "AFRIK JSON v2",
      entity: "personne",
      directives: "Voir DIRECTIVES-AFRIK.md pour les règles complètes.",
    },
    id: "PER_DELAFOSSE",
    fullName: "Maurice Delafosse",
    roleCategory: "ethnographer",
    countryIds: ["MLI"],
    peopleLinks: [{ peopleId: "PPL_BAMBARA", relationLabel: "observation" }],
    sources: [
      {
        title: "Haut-Sénégal-Niger",
        author: "Maurice Delafosse",
        year: 1912,
        url: "https://example.org/haut-senegal-niger",
        tier: "referenced",
        notes: "",
      },
    ],
    ...overrides,
  };
}

function writePersonneFile(
  root: string,
  fileName: string,
  data: Record<string, unknown>
) {
  const dir = join(root, "personnes");
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

interface PersonRow {
  id: string;
  full_name: string;
  role_category: string | null;
  assertion_id: string;
  [key: string]: unknown;
}

interface PersonPeopleRow {
  person_id: string;
  people_id: string;
  relation_label: string;
}

interface PersonCountryRow {
  person_id: string;
  country_id: string;
}

interface SupabaseDoubleOptions {
  /** Simulates the DB trigger/NOT NULL rejecting a specific person id. */
  rejectPersonId?: string;
  rejectReason?: string;
}

function createSupabaseDouble(options: SupabaseDoubleOptions = {}) {
  const sources: SourceRow[] = [];
  const assertions: AssertionRow[] = [];
  const persons: PersonRow[] = [];
  const personPeoples: PersonPeopleRow[] = [];
  const personCountries: PersonCountryRow[] = [];
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

    if (table === "persons") {
      return {
        upsert: vi.fn(async (row: PersonRow) => {
          if (options.rejectPersonId && row.id === options.rejectPersonId) {
            return {
              error: {
                message:
                  options.rejectReason ??
                  `persons row rejected: assertion ${row.assertion_id} cites no source (source or nothing, ARCH-018).`,
              },
            };
          }

          const index = persons.findIndex((p) => p.id === row.id);
          if (index === -1) {
            persons.push(row);
          } else {
            persons[index] = row;
          }
          return { error: null };
        }),
      };
    }

    if (table === "person_peoples") {
      return {
        upsert: vi.fn(async (row: PersonPeopleRow) => {
          const index = personPeoples.findIndex(
            (p) =>
              p.person_id === row.person_id && p.people_id === row.people_id
          );
          if (index === -1) {
            personPeoples.push(row);
          } else {
            personPeoples[index] = row;
          }
          return { error: null };
        }),
      };
    }

    if (table === "person_countries") {
      return {
        upsert: vi.fn(async (row: PersonCountryRow) => {
          const index = personCountries.findIndex(
            (p) =>
              p.person_id === row.person_id && p.country_id === row.country_id
          );
          if (index === -1) {
            personCountries.push(row);
          } else {
            personCountries[index] = row;
          }
          return { error: null };
        }),
      };
    }

    throw new Error(`Unexpected table in test double: ${table}`);
  });

  return {
    client: { from },
    sources,
    assertions,
    persons,
    personPeoples,
    personCountries,
  };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe("personJsonLoader", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_test_persons_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("loadAllPersonDossiers", () => {
    // @req REQ-137
    it("loads a valid dossier from a real fixture file", () => {
      writePersonneFile(tmpDir, "PER_DELAFOSSE.json", validPersonFile());

      const dossiers = loadAllPersonDossiers(tmpDir);

      expect(dossiers).toHaveLength(1);
      expect(dossiers[0].id).toBe("PER_DELAFOSSE");
      expect(dossiers[0].roleCategory).toBe("ethnographer");
    });

    // @req REQ-137
    it("excludes files marked _meta.illustrative", () => {
      writePersonneFile(
        tmpDir,
        "PER_ILLUSTRATIVE.json",
        validPersonFile({
          _meta: {
            format: "AFRIK JSON v2",
            entity: "personne",
            directives: "Voir DIRECTIVES-AFRIK.md.",
            illustrative: true,
          },
        })
      );

      expect(loadAllPersonDossiers(tmpDir)).toHaveLength(0);
    });

    // AC1 (ETNI-1382/ETNI-1585): a person without a role category is refused.
    // @req REQ-137
    it("fails to load a fiche missing the role category, with a clear error", () => {
      const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
      writePersonneFile(
        tmpDir,
        "PER_NOROLE.json",
        validPersonFile({ roleCategory: "" })
      );

      const dossiers = loadAllPersonDossiers(tmpDir);

      expect(dossiers).toHaveLength(0);
      expect(errorSpy).toHaveBeenCalled();
      const [, , meta] = errorSpy.mock.calls[0];
      expect(JSON.stringify(meta)).toContain("roleCategory");
      errorSpy.mockRestore();
    });

    // AC2 (ETNI-1382/ETNI-1585): a person without an attached source is
    // refused — the strict model requires >= 1 source before the DB trigger
    // is even reached.
    // @req REQ-137
    it("fails to load a fiche with no attached source, with a clear error", () => {
      const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
      writePersonneFile(
        tmpDir,
        "PER_NOSOURCE.json",
        validPersonFile({ sources: [] })
      );

      const dossiers = loadAllPersonDossiers(tmpDir);

      expect(dossiers).toHaveLength(0);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    // @req REQ-137
    it("returns an empty array when the personnes directory is absent", () => {
      expect(loadAllPersonDossiers(join(tmpDir, "missing"))).toEqual([]);
    });
  });

  describe("loadPersons", () => {
    // @req REQ-137
    it("writes sources, one assertion, the person row and its joins", async () => {
      const database = createSupabaseDouble();
      const dossiers = [validPersonFile()] as unknown as PersonDossier[];

      const report = await loadPersons(database.client as never, dossiers);

      expect(report).toMatchObject({ total: 1, inserted: 1 });
      expect(report.errors).toEqual([]);
      expect(report.dropped).toEqual([]);

      expect(database.sources).toHaveLength(1);
      expect(database.assertions).toHaveLength(1);
      expect(database.assertions[0]).toMatchObject({
        entity_type: "person",
        entity_id: "PER_DELAFOSSE",
      });

      expect(database.persons).toHaveLength(1);
      expect(database.persons[0]).toMatchObject({
        id: "PER_DELAFOSSE",
        full_name: "Maurice Delafosse",
        role_category: "ethnographer",
      });

      expect(database.personCountries).toEqual([
        { person_id: "PER_DELAFOSSE", country_id: "MLI" },
      ]);
    });

    // AC3 (ETNI-1382): an ethnographer's link to a people is recorded via the
    // inverse observation relation, never as membership.
    // @req REQ-137
    it("writes an ethnographer's people link as observation, never membership", async () => {
      const database = createSupabaseDouble();
      const dossiers = [validPersonFile()] as unknown as PersonDossier[];

      await loadPersons(database.client as never, dossiers);

      expect(database.personPeoples).toEqual([
        {
          person_id: "PER_DELAFOSSE",
          people_id: "PPL_BAMBARA",
          relation_label: "observation",
        },
      ]);
      expect(
        database.personPeoples.every((p) => p.relation_label !== "membership")
      ).toBe(true);
    });

    // @req REQ-137
    it("writes a people link declared as membership as membership", async () => {
      const database = createSupabaseDouble();
      const dossiers = [
        validPersonFile({
          id: "PER_MEMBER",
          peopleLinks: [
            { peopleId: "PPL_BAMBARA", relationLabel: "membership" },
          ],
        }),
      ] as unknown as PersonDossier[];

      await loadPersons(database.client as never, dossiers);

      expect(database.personPeoples).toEqual([
        {
          person_id: "PER_MEMBER",
          people_id: "PPL_BAMBARA",
          relation_label: "membership",
        },
      ]);
    });

    // AC2 (ETNI-1382): defense in depth — the DB trigger rejecting a person
    // for lacking a sourced assertion is logged, dropped, and does not stop
    // the rest of the batch from loading.
    // @req REQ-137
    it("logs, drops, and continues past a person the source-or-nothing trigger rejects", async () => {
      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      const database = createSupabaseDouble({
        rejectPersonId: "PER_DELAFOSSE",
      });
      const dossiers = [
        validPersonFile(),
        validPersonFile({ id: "PER_OTHER", fullName: "Someone Else" }),
      ] as unknown as PersonDossier[];

      const report = await loadPersons(database.client as never, dossiers);

      expect(report.total).toBe(2);
      expect(report.inserted).toBe(1);
      expect(report.dropped).toHaveLength(1);
      expect(report.dropped[0]).toContain("PER_DELAFOSSE");
      expect(report.dropped[0]).toContain("source or nothing");
      expect(warnSpy).toHaveBeenCalled();
      expect(database.persons).toHaveLength(1);
      expect(database.persons[0].id).toBe("PER_OTHER");

      warnSpy.mockRestore();
    });

    // @req REQ-137
    it("is idempotent on re-run: no duplicate assertions, persons or joins", async () => {
      const database = createSupabaseDouble();
      const dossiers = [validPersonFile()] as unknown as PersonDossier[];

      await loadPersons(database.client as never, dossiers);
      const secondReport = await loadPersons(
        database.client as never,
        dossiers
      );

      expect(secondReport.inserted).toBe(1);
      expect(database.sources).toHaveLength(1);
      expect(database.assertions).toHaveLength(1);
      expect(database.persons).toHaveLength(1);
      expect(database.personPeoples).toHaveLength(1);
    });
  });
});
