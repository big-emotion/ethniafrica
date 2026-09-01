import { beforeEach, describe, expect, it, vi } from "vitest";

import afroasiaticFamily from "../../dataset/source/afrik/famille_linguistique/FLG_AFROASIATIQUE.json";
import betePeople from "../../dataset/source/afrik/peuples/FLG_KROU/PPL_BETE.json";
import coteDIvoire from "../../dataset/source/afrik/pays/CIV.json";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Country } from "@/types/afrik";
import { loadAllCountries } from "@/lib/afrik/loaders/countryLoader";
import { loadAllLanguageFamilies } from "@/lib/afrik/loaders/languageFamilyLoader";
import { loadAllLanguages } from "@/lib/afrik/loaders/languageCsvLoader";
import {
  emptyLanguageLoadReport,
  loadLanguages,
} from "@/lib/afrik/loaders/languageProvenanceLoader";
import { loadAllPeoples } from "@/lib/afrik/loaders/peopleLoader";
import {
  loadAllRelationFiles,
  loadRelations,
} from "@/lib/afrik/loaders/relationJsonLoader";
import {
  loadAllMigrationFiles,
  loadMigrations,
} from "@/lib/afrik/loaders/migrationJsonLoader";
import { AFRIK_RECETTE_SUPABASE_URL } from "../lib/afrikSyncTarget";
import { migrateAfrikToDatabase } from "../migrateAfrikToDatabase";
import type { LanguageFamily, People } from "@/types/afrik";
import type { LanguageRecord } from "@/lib/afrik/loaders/languageCsvLoader";
import type { LanguageLoadReport } from "@/lib/afrik/loaders/languageProvenanceLoader";
import type { RelationRecord } from "@/types/relations";
import type { MigrationRecord } from "@/types/migrations";

vi.mock("@/lib/afrik/loaders/languageFamilyLoader");
vi.mock("@/lib/afrik/loaders/languageCsvLoader");
vi.mock("@/lib/afrik/loaders/languageProvenanceLoader");
vi.mock("@/lib/afrik/loaders/peopleLoader");
vi.mock("@/lib/afrik/loaders/countryLoader");
vi.mock("@/lib/afrik/loaders/relationJsonLoader");
vi.mock("@/lib/afrik/loaders/migrationJsonLoader");
vi.mock("@/lib/supabase/admin");

function emptyLanguageReport(): LanguageLoadReport {
  return {
    total: 0,
    inserted: 0,
    sourced: 0,
    derived: 0,
    perFamily: {},
    errors: [],
  };
}

const PRODUCTION_URL = "https://ethniafrica-production.supabase.co";
// JSON imports retain narrower inferred fields than the evolutionary AFRIK types.
const familyFixture = afroasiaticFamily as unknown as LanguageFamily;
const peopleFixture = betePeople as unknown as People;
const recetteTarget = {
  environment: "recette",
  activeSupabaseUrl: AFRIK_RECETTE_SUPABASE_URL,
};

type TableName =
  | "afrik_language_families"
  | "afrik_peoples"
  | "afrik_countries"
  | "afrik_people_countries"
  | "afrik_people_relations";

interface DatabaseRow {
  id?: string;
  content?: unknown;
  people_id?: string;
  country_id?: string;
  [key: string]: unknown;
}

interface UpsertOperation {
  table: TableName;
  row: DatabaseRow;
}

interface SupabaseDoubleOptions {
  rows?: Partial<Record<TableName, DatabaseRow[]>>;
  persistUpserts?: boolean;
  writeError?: (
    operation: UpsertOperation,
    existingRow: DatabaseRow | undefined
  ) => { message: string } | null;
}

function createSupabaseDouble(options: SupabaseDoubleOptions = {}) {
  const rows: Record<TableName, DatabaseRow[]> = {
    afrik_language_families: [...(options.rows?.afrik_language_families ?? [])],
    afrik_peoples: [...(options.rows?.afrik_peoples ?? [])],
    afrik_countries: [...(options.rows?.afrik_countries ?? [])],
    afrik_people_countries: [...(options.rows?.afrik_people_countries ?? [])],
    afrik_people_relations: [...(options.rows?.afrik_people_relations ?? [])],
  };
  const operations: UpsertOperation[] = [];
  const persistUpserts = options.persistUpserts ?? true;

  const from = vi.fn((table: TableName) => ({
    select: vi.fn(async () => ({ data: rows[table], error: null })),
    upsert: vi.fn(async (row: DatabaseRow) => {
      const operation = { table, row } satisfies UpsertOperation;
      operations.push(operation);

      const key =
        table === "afrik_people_countries"
          ? `${row.people_id}:${row.country_id}`
          : row.id;
      const index = rows[table].findIndex((candidate) => {
        const candidateKey =
          table === "afrik_people_countries"
            ? `${candidate.people_id}:${candidate.country_id}`
            : candidate.id;
        return candidateKey === key;
      });
      const error = options.writeError?.(operation, rows[table][index]);
      if (error) {
        return { error };
      }

      if (persistUpserts) {
        if (index === -1) {
          rows[table].push(row);
        } else {
          rows[table][index] = { ...rows[table][index], ...row };
        }
      }

      return { error: null };
    }),
  }));

  return { client: { from }, operations };
}

function useSupabaseDouble(options: SupabaseDoubleOptions = {}) {
  const database = createSupabaseDouble(options);
  // The generated Supabase fluent type is wider than this focused test double.
  vi.mocked(createAdminClient).mockReturnValue(
    database.client as unknown as ReturnType<typeof createAdminClient>
  );
  return database;
}

describe("migrateAfrikToDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadAllLanguageFamilies).mockResolvedValue([familyFixture]);
    vi.mocked(loadAllLanguages).mockReturnValue([]);
    vi.mocked(emptyLanguageLoadReport).mockImplementation(emptyLanguageReport);
    vi.mocked(loadLanguages).mockResolvedValue(emptyLanguageReport());
    vi.mocked(loadAllPeoples).mockResolvedValue([peopleFixture]);
    // A JSON import widens every string to `string`, so the fiche's
    // `sources[].tier` loses its literal type against FicheSource.
    vi.mocked(loadAllCountries).mockResolvedValue([coteDIvoire as Country]);
    vi.mocked(loadAllRelationFiles).mockReturnValue([]);
    vi.mocked(loadRelations).mockResolvedValue({
      total: 0,
      inserted: 0,
      errors: [],
    });
    vi.mocked(loadAllMigrationFiles).mockReturnValue([]);
    vi.mocked(loadMigrations).mockResolvedValue({
      total: 0,
      inserted: 0,
      errors: [],
    });
  });

  // @req REQ-032
  it("rejects a mismatched production project before constructing the admin client", async () => {
    await expect(
      migrateAfrikToDatabase({
        dryRun: true,
        writeErrorReport: false,
        target: {
          environment: "production",
          activeSupabaseUrl: PRODUCTION_URL,
          productionSupabaseUrl: "https://ethniafrica-other.supabase.co",
        },
      })
    ).rejects.toThrow(/not the configured production project/);

    expect(createAdminClient).not.toHaveBeenCalled();
  });

  // Inverted deliberately. This used to assert that --target=production against
  // the recette project was the *correct* pairing, because the old guard's
  // "production" constant held the recette ref. That assertion is what made
  // every production deploy write the corpus into recette.
  // @req REQ-032
  it("refuses production declared against the recette project, and never reaches the client", async () => {
    await expect(
      migrateAfrikToDatabase({
        dryRun: true,
        writeErrorReport: false,
        target: {
          environment: "production",
          activeSupabaseUrl: AFRIK_RECETTE_SUPABASE_URL,
          productionSupabaseUrl: PRODUCTION_URL,
        },
      })
    ).rejects.toThrow(/recette project/);

    expect(createAdminClient).not.toHaveBeenCalled();
  });

  // @req REQ-032
  it("previews production against the configured production project without writing", async () => {
    const database = useSupabaseDouble();

    const report = await migrateAfrikToDatabase({
      dryRun: true,
      writeErrorReport: false,
      target: {
        environment: "production",
        activeSupabaseUrl: PRODUCTION_URL,
        productionSupabaseUrl: PRODUCTION_URL,
      },
    });

    expect(report.verification.before.hasDrift).toBe(true);
    expect(database.operations).toHaveLength(0);
  });

  it("reports source/database drift in dry-run mode without writing", async () => {
    const database = useSupabaseDouble({
      rows: {
        afrik_language_families: [
          { id: afroasiaticFamily.id, content: {} },
          { id: "FLG_KROU", content: {} },
        ],
        afrik_peoples: [{ id: betePeople.id, content: {} }],
        afrik_countries: [{ id: coteDIvoire.id, content: {} }],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: true,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(report.verification.before).toMatchObject({
      languageFamilies: { missing: [], stale: [afroasiaticFamily.id] },
      peoples: { missing: [], stale: [betePeople.id] },
      countries: { missing: [], stale: [coteDIvoire.id] },
      hasDrift: true,
    });
    expect(report.verification.after).toBeNull();
    expect(database.operations).toHaveLength(0);
  });

  it("upserts complete source content in hierarchy order and verifies the result", async () => {
    const database = useSupabaseDouble({
      rows: {
        afrik_language_families: [
          { id: afroasiaticFamily.id, content: {} },
          { id: "FLG_KROU", content: {} },
        ],
        afrik_peoples: [{ id: betePeople.id, content: {} }],
        afrik_countries: [{ id: coteDIvoire.id, content: {} }],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(report.relations.errors).toEqual([]);
    expect(report.relations.inserted).toBe(1);
    expect(database.operations.map(({ table }) => table)).toEqual([
      "afrik_language_families",
      "afrik_peoples",
      "afrik_countries",
      "afrik_people_countries",
    ]);
    expect(database.operations[0].row.content).toEqual(
      afroasiaticFamily.content
    );
    expect(database.operations[1].row.content).toEqual(betePeople.content);
    expect(database.operations[2].row.content).toEqual(coteDIvoire.content);
    expect(database.operations[0].row).not.toHaveProperty("created_at");
    expect(database.operations[1].row).not.toHaveProperty("created_at");
    expect(database.operations[2].row).not.toHaveProperty("created_at");
    expect(report.verification.before.hasDrift).toBe(true);
    expect(report.verification.after).toMatchObject({ hasDrift: false });
    expect(report.verification.errors).toEqual([]);
  });

  // @req REQ-032
  it("does not rewrite an unchanged protected classification while synchronizing content", async () => {
    const database = useSupabaseDouble({
      rows: {
        afrik_language_families: [
          {
            id: afroasiaticFamily.id,
            classification_status: familyFixture.classificationStatus ?? null,
            content: {},
          },
          { id: "FLG_KROU", content: {} },
        ],
        afrik_peoples: [
          {
            id: betePeople.id,
            classification_status: peopleFixture.classificationStatus ?? null,
            content: {},
          },
        ],
        afrik_countries: [{ id: coteDIvoire.id, content: {} }],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    const protectedWrites = database.operations.filter(
      ({ table, row }) =>
        (table === "afrik_language_families" || table === "afrik_peoples") &&
        Object.hasOwn(row, "classification_status")
    );
    expect(protectedWrites).toEqual([]);
    expect(report.languageFamilies.errors).toEqual([]);
    expect(report.peoples.errors).toEqual([]);
    expect(report.protectedDrift).toEqual({
      languageFamilies: [],
      peoples: [],
    });
    expect(report.verification.after?.hasDrift).toBe(false);
  });

  // @req REQ-032
  it("synchronizes content while preserving and reporting protected classification drift", async () => {
    const integrityError =
      'Integrity check failed: UPDATE requires an assertion row for field_path "classification_status"';
    const database = useSupabaseDouble({
      rows: {
        afrik_language_families: [
          {
            id: afroasiaticFamily.id,
            classification_status: familyFixture.classificationStatus ?? null,
            content: {},
          },
          { id: "FLG_KROU", content: {} },
        ],
        afrik_peoples: [
          {
            id: betePeople.id,
            classification_status: null,
            content: {},
          },
        ],
        afrik_countries: [{ id: coteDIvoire.id, content: {} }],
      },
      writeError: (operation, existingRow) => {
        if (
          existingRow &&
          Object.hasOwn(operation.row, "classification_status") &&
          operation.row.classification_status !==
            existingRow.classification_status
        ) {
          return { message: integrityError };
        }
        return null;
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    const peopleWrites = database.operations.filter(
      ({ table }) => table === "afrik_peoples"
    );
    expect(peopleWrites).toHaveLength(1);
    expect(peopleWrites[0].row).not.toHaveProperty("classification_status");
    expect(report.peoples.inserted).toBe(1);
    expect(report.peoples.errors).toEqual([]);
    expect(report.protectedDrift.peoples).toEqual([
      {
        id: betePeople.id,
        field: "classification_status",
        databaseStatus: null,
        sourceStatus: peopleFixture.classificationStatus,
      },
    ]);
    expect(report.verification.after?.peoples.stale).toEqual([]);
  });

  // @req REQ-032
  it("skips diaspora relations outside the AFRIK country catalog", async () => {
    vi.mocked(loadAllPeoples).mockResolvedValue([
      {
        ...peopleFixture,
        currentCountries: [coteDIvoire.id, "FRA"],
      },
    ]);
    const database = useSupabaseDouble({
      rows: {
        afrik_language_families: [
          { id: afroasiaticFamily.id, content: {} },
          { id: "FLG_KROU", content: {} },
        ],
        afrik_peoples: [{ id: betePeople.id, content: {} }],
        afrik_countries: [{ id: coteDIvoire.id, content: {} }],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(report.relations).toMatchObject({
      total: 2,
      inserted: 1,
      errors: [],
    });
    expect(
      database.operations.filter(
        ({ table }) => table === "afrik_people_countries"
      )
    ).toEqual([
      {
        table: "afrik_people_countries",
        row: {
          people_id: betePeople.id,
          country_id: coteDIvoire.id,
        },
      },
    ]);
  });

  it("reports residual drift when successful writes do not synchronize content", async () => {
    useSupabaseDouble({
      persistUpserts: false,
      rows: {
        afrik_language_families: [
          { id: afroasiaticFamily.id, content: {} },
          { id: "FLG_KROU", content: {} },
        ],
        afrik_peoples: [{ id: betePeople.id, content: {} }],
        afrik_countries: [{ id: coteDIvoire.id, content: {} }],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(report.verification.after?.hasDrift).toBe(true);
    expect(report.verification.errors).toEqual([
      "Post-sync verification found residual AFRIK source drift",
    ]);
  });

  // @req REQ-032
  it("registers the additive relations step and reports the loader's result", async () => {
    const relationFixture: RelationRecord = {
      id: "REL_TEST_COMMERCIAL_01",
      relationType: "commercial",
      peopleIdA: "PPL_TEST_A",
      peopleIdB: "PPL_TEST_B",
      direction: "bidirectional",
      period: { startYear: null, endYear: null, label: "illustratif" },
      description: "illustratif",
      sources: [],
    };
    vi.mocked(loadAllRelationFiles).mockReturnValue([relationFixture]);
    vi.mocked(loadRelations).mockResolvedValue({
      total: 1,
      inserted: 1,
      errors: [],
    });
    useSupabaseDouble({
      rows: {
        afrik_language_families: [
          { id: afroasiaticFamily.id, content: {} },
          { id: "FLG_KROU", content: {} },
        ],
        afrik_peoples: [{ id: betePeople.id, content: {} }],
        afrik_countries: [{ id: coteDIvoire.id, content: {} }],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(report.peopleRelations).toMatchObject({
      total: 1,
      inserted: 1,
      errors: [],
      orphans: [],
    });
    expect(loadRelations).toHaveBeenCalledWith(expect.anything(), [
      relationFixture,
    ]);
  });

  // @req REQ-136
  it("registers the language load step and reports the loader's result", async () => {
    const languageFixture: LanguageRecord = {
      id: "yor",
      name: "Yoruba",
      familyId: afroasiaticFamily.id,
      nameProvenance: "sourced",
    };
    vi.mocked(loadAllLanguages).mockReturnValue([languageFixture]);
    vi.mocked(loadLanguages).mockResolvedValue({
      total: 1,
      inserted: 1,
      sourced: 1,
      derived: 0,
      perFamily: { [afroasiaticFamily.id]: 1 },
      errors: [],
    });
    useSupabaseDouble({
      rows: {
        afrik_language_families: [
          { id: afroasiaticFamily.id, content: {} },
          { id: "FLG_KROU", content: {} },
        ],
        afrik_peoples: [{ id: betePeople.id, content: {} }],
        afrik_countries: [{ id: coteDIvoire.id, content: {} }],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(report.languages).toMatchObject({
      total: 1,
      inserted: 1,
      sourced: 1,
      perFamily: { [afroasiaticFamily.id]: 1 },
    });
    expect(loadLanguages).toHaveBeenCalledWith(expect.anything(), [
      languageFixture,
    ]);
  });

  // @req REQ-032
  it("registers the additive migrations step and reports the loader's result", async () => {
    const migrationFixture: MigrationRecord = {
      id: "MGR_TEST_EXPANSION_01",
      nameMain: "illustratif",
      migrationGroup: null,
      eventType: "expansion",
      classificationStatus: "reconstructive",
      timeRange: { startYear: -1000, endYear: -500, datingNote: null },
      geometry: {
        type: "LineString",
        coordinates: [
          [10, 5],
          [12, 3],
        ],
      },
      peoplesInvolved: [{ id: "PPL_TEST_A", role: "origin" }],
      content: {
        summary: "illustratif",
        narrative: "illustratif",
        debate: null,
        sources: [],
      },
    };
    vi.mocked(loadAllMigrationFiles).mockReturnValue([migrationFixture]);
    vi.mocked(loadMigrations).mockResolvedValue({
      total: 1,
      inserted: 1,
      errors: [],
    });
    useSupabaseDouble({
      rows: {
        afrik_language_families: [
          { id: afroasiaticFamily.id, content: {} },
          { id: "FLG_KROU", content: {} },
        ],
        afrik_peoples: [{ id: betePeople.id, content: {} }],
        afrik_countries: [{ id: coteDIvoire.id, content: {} }],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(report.migrations).toMatchObject({
      total: 1,
      inserted: 1,
      errors: [],
    });
    expect(loadMigrations).toHaveBeenCalledWith(expect.anything(), [
      migrationFixture,
    ]);
  });

  // @req REQ-032
  it("flags a relation present in the database but absent from source as a report-only orphan", async () => {
    vi.mocked(loadAllRelationFiles).mockReturnValue([]);
    const database = useSupabaseDouble({
      rows: {
        afrik_language_families: [
          { id: afroasiaticFamily.id, content: {} },
          { id: "FLG_KROU", content: {} },
        ],
        afrik_peoples: [{ id: betePeople.id, content: {} }],
        afrik_countries: [{ id: coteDIvoire.id, content: {} }],
        afrik_people_relations: [{ id: "REL_DELETED_FROM_TREE" }],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(report.peopleRelations.orphans).toEqual(["REL_DELETED_FROM_TREE"]);
    expect(
      database.operations.filter(
        ({ table }) => table === "afrik_people_relations"
      )
    ).toEqual([]);
  });
});
