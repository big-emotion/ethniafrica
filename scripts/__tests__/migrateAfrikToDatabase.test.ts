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
import { loadNameRecords } from "@/lib/afrik/loaders/nameRecordJsonLoader";
import {
  emptyAppellationLoadReport,
  loadPeopleAppellations,
} from "@/lib/afrik/loaders/peopleAppellationLoader";
import {
  loadAllPatronymeDossiers,
  loadPatronymes,
} from "@/lib/afrik/loaders/patronymeJsonLoader";
import {
  loadAllPersonDossiers,
  loadPersons,
} from "@/lib/afrik/loaders/personJsonLoader";
import {
  loadAllRelationFiles,
  loadRelations,
} from "@/lib/afrik/loaders/relationJsonLoader";
import {
  loadAllMigrationFiles,
  loadMigrations,
} from "@/lib/afrik/loaders/migrationJsonLoader";
import {
  emptyProvenanceReport,
  writeFicheProvenance,
} from "@/lib/afrik/loaders/provenanceWriter";
import { classificationLabels } from "@/lib/translations";
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
vi.mock("@/lib/afrik/loaders/nameRecordJsonLoader");
vi.mock("@/lib/afrik/loaders/peopleAppellationLoader");
vi.mock("@/lib/afrik/loaders/patronymeJsonLoader");
vi.mock("@/lib/afrik/loaders/personJsonLoader");
vi.mock("@/lib/afrik/loaders/relationJsonLoader");
vi.mock("@/lib/afrik/loaders/migrationJsonLoader");
vi.mock("@/lib/supabase/admin");
// Mocked at a real seam rather than faked: `writeFicheProvenance` owns the
// sources → fiche_revisions → assertions fabric and carries its own tests for
// the idempotence rules. What belongs to this file is the decision of *when* a
// classification assertion is minted and whether the column is written after —
// which a three-table PostgREST double would obscure rather than prove.
vi.mock("@/lib/afrik/loaders/provenanceWriter");

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

function emptyAppellationReport() {
  return { total: 0, inserted: 0, rejected: [], errors: [] };
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
  | "afrik_people_languages"
  | "afrik_peoples"
  | "afrik_countries"
  | "afrik_people_countries"
  | "afrik_people_relations";

interface DatabaseRow {
  id?: string;
  content?: unknown;
  people_id?: string;
  country_id?: string;
  language_id?: string;
  [key: string]: unknown;
}

interface UpsertOperation {
  table: TableName;
  row: DatabaseRow;
}

interface UpsertCall {
  table: TableName;
  rows: DatabaseRow[];
  options?: { onConflict?: string };
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
    afrik_people_languages: [...(options.rows?.afrik_people_languages ?? [])],
    afrik_peoples: [...(options.rows?.afrik_peoples ?? [])],
    afrik_countries: [...(options.rows?.afrik_countries ?? [])],
    afrik_people_countries: [...(options.rows?.afrik_people_countries ?? [])],
    afrik_people_relations: [...(options.rows?.afrik_people_relations ?? [])],
  };
  const operations: UpsertOperation[] = [];
  const upsertCalls: UpsertCall[] = [];
  const persistUpserts = options.persistUpserts ?? true;

  const deleted: Array<{ table: TableName; ids: string[] }> = [];

  const from = vi.fn((table: TableName) => ({
    // Thenable rather than async: an unqualified `select()` still resolves to
    // the whole table as it always did, while the orphan scan's paged read
    // reaches `.range()` on the same object. The double holds far fewer rows
    // than a page, so one range is always the whole table.
    select: vi.fn(() => ({
      then: (
        resolve: (value: { data: DatabaseRow[]; error: null }) => unknown
      ) => resolve({ data: rows[table], error: null }),
      range: async (from: number, to: number) => ({
        data: rows[table].slice(from, to + 1),
        error: null,
      }),
    })),
    delete: vi.fn(() => ({
      in: async (_column: string, ids: string[]) => {
        deleted.push({ table, ids });
        rows[table] = rows[table].filter(
          (row) => !ids.includes(row.id as string)
        );
        return { error: null };
      },
    })),
    upsert: vi.fn(
      async (
        payload: DatabaseRow | DatabaseRow[],
        upsertOptions?: { onConflict?: string }
      ) => {
        const payloadRows = Array.isArray(payload) ? payload : [payload];
        upsertCalls.push({ table, rows: payloadRows, options: upsertOptions });

        for (const row of payloadRows) {
          const operation = { table, row } satisfies UpsertOperation;
          operations.push(operation);

          const key =
            table === "afrik_people_countries"
              ? `${row.people_id}:${row.country_id}`
              : table === "afrik_people_languages"
                ? `${row.people_id}:${row.language_id}`
                : row.id;
          const index = rows[table].findIndex((candidate) => {
            const candidateKey =
              table === "afrik_people_countries"
                ? `${candidate.people_id}:${candidate.country_id}`
                : table === "afrik_people_languages"
                  ? `${candidate.people_id}:${candidate.language_id}`
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
        }

        return { error: null };
      }
    ),
  }));

  return { client: { from }, operations, rows, upsertCalls, deleted };
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
    vi.mocked(loadAllLanguages).mockReturnValue(
      (peopleFixture.content.languages?.isoCodes ?? []).map((id) => ({
        id,
        name: id,
        familyId: peopleFixture.languageFamilyId,
        nameProvenance: "derived" as const,
      }))
    );
    vi.mocked(emptyProvenanceReport).mockImplementation(() => ({
      total: 0,
      assertionsWritten: 0,
      skippedWithoutSources: 0,
      errors: [],
    }));
    // The writer succeeds by default; the tests that care about a refusal say so.
    vi.mocked(writeFicheProvenance).mockImplementation(
      async (_client, _fiche, report) => {
        report.total += 1;
        report.assertionsWritten += 1;
      }
    );
    vi.mocked(emptyLanguageLoadReport).mockImplementation(emptyLanguageReport);
    vi.mocked(emptyAppellationLoadReport).mockImplementation(
      emptyAppellationReport
    );
    vi.mocked(loadPeopleAppellations).mockResolvedValue(
      emptyAppellationReport()
    );
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
    vi.mocked(loadNameRecords).mockResolvedValue({
      total: 0,
      inserted: 0,
      dropped: [],
      errors: [],
    });
    vi.mocked(loadAllPersonDossiers).mockReturnValue([]);
    vi.mocked(loadPersons).mockResolvedValue({
      total: 0,
      inserted: 0,
      dropped: [],
      errors: [],
    });
    vi.mocked(loadAllPatronymeDossiers).mockReturnValue({
      dossiers: [],
      errors: [],
    });
    vi.mocked(loadPatronymes).mockResolvedValue({
      total: 0,
      inserted: 0,
      spellings: 0,
      peopleLinks: 0,
      countryLinks: 0,
      bearerLinks: 0,
      alliances: 0,
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

  // @req REQ-133
  // @req REQ-134
  it("preflights and counts patronymes in dry-run mode without invoking any data loader writes", async () => {
    vi.mocked(loadAllPersonDossiers).mockReturnValue([
      { id: "PER_MODIBO_KEITA" } as never,
    ]);
    vi.mocked(loadAllPatronymeDossiers).mockReturnValue({
      dossiers: [{ id: "PAT_KEITA" } as never, { id: "PAT_KONDE" } as never],
      errors: [],
    });
    vi.mocked(loadPatronymes).mockResolvedValue({
      total: 2,
      inserted: 0,
      spellings: 2,
      peopleLinks: 2,
      countryLinks: 2,
      bearerLinks: 1,
      alliances: 1,
      errors: [],
    });
    const database = useSupabaseDouble();

    const report = await migrateAfrikToDatabase({
      dryRun: true,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(report.patronymes).toMatchObject({
      total: 2,
      inserted: 0,
      errors: [],
    });
    expect(loadPersons).not.toHaveBeenCalled();
    expect(loadPatronymes).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        dossiers: [
          expect.objectContaining({ id: "PAT_KEITA" }),
          expect.objectContaining({ id: "PAT_KONDE" }),
        ],
      }),
      expect.objectContaining({
        dryRun: true,
        references: expect.objectContaining({
          peopleIds: new Set([peopleFixture.id]),
          countryIds: new Set([coteDIvoire.id]),
          personIds: new Set(["PER_MODIBO_KEITA"]),
        }),
      })
    );
    expect(database.operations).toEqual([]);
  });

  // @req REQ-133
  // @req REQ-134
  it("loads people and countries before persons, then patronymes", async () => {
    const events: string[] = [];
    vi.mocked(loadAllPersonDossiers).mockReturnValue([
      { id: "PER_MODIBO_KEITA" } as never,
    ]);
    vi.mocked(loadPersons).mockImplementation(async () => {
      events.push("persons");
      return { total: 1, inserted: 1, dropped: [], errors: [] };
    });
    vi.mocked(loadPatronymes).mockImplementation(async () => {
      events.push("patronymes");
      return {
        total: 1,
        inserted: 1,
        spellings: 1,
        peopleLinks: 1,
        countryLinks: 1,
        bearerLinks: 1,
        alliances: 0,
        errors: [],
      };
    });
    useSupabaseDouble({
      writeError: ({ table }) => {
        if (table === "afrik_peoples") events.push("peoples");
        if (table === "afrik_countries") events.push("countries");
        return null;
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(events.indexOf("peoples")).toBeLessThan(events.indexOf("countries"));
    expect(events.indexOf("countries")).toBeLessThan(events.indexOf("persons"));
    expect(events.indexOf("persons")).toBeLessThan(
      events.indexOf("patronymes")
    );
    expect(report.persons).toMatchObject({ total: 1, inserted: 1 });
    expect(report.patronymes).toMatchObject({ total: 1, inserted: 1 });
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
      "afrik_people_languages",
      "afrik_people_languages",
      "afrik_people_languages",
      "afrik_countries",
      "afrik_people_countries",
    ]);
    expect(database.operations[0].row.content).toEqual(
      afroasiaticFamily.content
    );
    expect(database.operations[1].row.content).toEqual(betePeople.content);
    const countryOperation = database.operations.find(
      ({ table }) => table === "afrik_countries"
    )!;
    expect(countryOperation.row.content).toEqual(coteDIvoire.content);
    expect(database.operations[0].row).not.toHaveProperty("created_at");
    expect(database.operations[1].row).not.toHaveProperty("created_at");
    expect(countryOperation.row).not.toHaveProperty("created_at");
    expect(report.verification.before.hasDrift).toBe(true);
    expect(report.verification.after).toMatchObject({ hasDrift: false });
    expect(report.verification.errors).toEqual([]);
  });

  // AC: a fiche that omits spellingAliases upserts an empty array, not undefined or an error.
  // @req REQ-032
  it("defaults a people's spelling_aliases to an empty array when the fiche omits it", async () => {
    const appellationsWithoutAlias = { ...peopleFixture.content.appellations };
    delete appellationsWithoutAlias.spellingAliases;
    const peopleWithoutAlias = {
      ...peopleFixture,
      content: {
        ...peopleFixture.content,
        appellations: appellationsWithoutAlias,
      },
    };
    vi.mocked(loadAllPeoples).mockResolvedValue([peopleWithoutAlias]);
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

    await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    const peopleOperation = database.operations.find(
      ({ table }) => table === "afrik_peoples"
    )!;
    expect(peopleOperation.row.spelling_aliases).toEqual([]);
  });

  // AC: a fiche's content.appellations.spellingAliases reaches the spelling_aliases
  // column unchanged, covering more than one declared alias.
  // @req REQ-032
  it("maps a people's declared spelling aliases onto spelling_aliases", async () => {
    const aliasedPeople = {
      ...peopleFixture,
      content: {
        ...peopleFixture.content,
        appellations: {
          ...peopleFixture.content.appellations,
          spellingAliases: ["Gour", "Gor"],
        },
      },
    };
    vi.mocked(loadAllPeoples).mockResolvedValue([aliasedPeople]);
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

    await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    const peopleOperation = database.operations.find(
      ({ table }) => table === "afrik_peoples"
    )!;
    expect(peopleOperation.row.spelling_aliases).toEqual(["Gour", "Gor"]);
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

  // This replaces a test that asserted the opposite, and the reversal is the
  // point of the change. Declining to overwrite a value a moderator set is
  // right; declining to fill a column nobody has set is not — it left the
  // corpus's own classification invisible on 795 of 800 peoples. The write is
  // still gated on AR3, so the assertion has to be minted first.
  // @req REQ-032
  it("mints a sourced assertion, then fills a classification the database left empty", async () => {
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
          { id: betePeople.id, classification_status: null, content: {} },
        ],
        afrik_countries: [{ id: coteDIvoire.id, content: {} }],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    const [minted] = vi
      .mocked(writeFicheProvenance)
      .mock.calls.filter(([, fiche]) => fiche.entityId === betePeople.id);

    expect(minted?.[1]).toMatchObject({
      entityType: "people",
      entityId: betePeople.id,
      targets: [
        {
          fieldPath: "classification_status",
          // The sentence the reader meets under the badge, not a column name.
          statement:
            classificationLabels[
              peopleFixture.classificationStatus as "colonial-legacy"
            ].tooltip,
        },
      ],
    });

    const peopleWrites = database.operations.filter(
      ({ table }) => table === "afrik_peoples"
    );
    expect(peopleWrites).toHaveLength(1);
    expect(peopleWrites[0].row.classification_status).toBe(
      peopleFixture.classificationStatus
    );
    expect(report.peoples.errors).toEqual([]);
    // Filled, so no longer drift the sync declined to resolve.
    expect(report.protectedDrift.peoples).toEqual([]);
  });

  // The guarantee that survives the reversal: a value already in the database
  // is a decision someone took, and the corpus does not get to overrule it.
  // @req REQ-032
  it("never overwrites a classification the database already carries, and reports the disagreement", async () => {
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
            classification_status: "consensual",
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

    const peopleWrites = database.operations.filter(
      ({ table }) => table === "afrik_peoples"
    );
    expect(peopleWrites[0].row).not.toHaveProperty("classification_status");
    expect(report.protectedDrift.peoples).toEqual([
      {
        id: betePeople.id,
        field: "classification_status",
        databaseStatus: "consensual",
        sourceStatus: peopleFixture.classificationStatus,
      },
    ]);
    expect(
      vi
        .mocked(writeFicheProvenance)
        .mock.calls.filter(([, fiche]) => fiche.entityId === betePeople.id)
    ).toEqual([]);
  });

  // The drift list is pruned once, from a set the concurrent lanes only add to.
  // Reassigning `protectedDrift.peoples` per entity after an await would let one
  // lane's read-modify-write restore the entry another lane had just removed —
  // so this drives two entities through at once, one fillable and one protected,
  // and insists the outcome tells them apart.
  // @req REQ-032
  it("prunes only the entities it filled when several are written at once", async () => {
    const filledPeople = {
      ...peopleFixture,
      id: "PPL_FILLABLE",
    } as People;
    vi.mocked(loadAllPeoples).mockResolvedValue([peopleFixture, filledPeople]);

    useSupabaseDouble({
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
          // Already decided by a human: must survive the prune.
          {
            id: betePeople.id,
            classification_status: "consensual",
            content: {},
          },
          // Empty: must be filled and dropped from the list.
          { id: "PPL_FILLABLE", classification_status: null, content: {} },
        ],
        afrik_countries: [{ id: coteDIvoire.id, content: {} }],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(report.protectedDrift.peoples).toEqual([
      {
        id: betePeople.id,
        field: "classification_status",
        databaseStatus: "consensual",
        sourceStatus: peopleFixture.classificationStatus,
      },
    ]);
  });

  // A fiche citing nothing earns no assertion — the writer refuses, and rightly:
  // an assertion with an empty source list would raise the subject's confidence
  // for having claimed something. The column then stays empty rather than
  // arriving unsourced, and the fiche is named so a curator can source it.
  // @req REQ-032
  it("leaves the classification empty when the fiche earns no assertion", async () => {
    vi.mocked(writeFicheProvenance).mockImplementation(
      async (_client, _fiche, report) => {
        report.total += 1;
        report.skippedWithoutSources += 1;
      }
    );

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
          { id: betePeople.id, classification_status: null, content: {} },
        ],
        afrik_countries: [{ id: coteDIvoire.id, content: {} }],
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
    expect(peopleWrites[0].row).not.toHaveProperty("classification_status");
    expect(report.protectedDrift.peoples).toEqual([
      {
        id: betePeople.id,
        field: "classification_status",
        databaseStatus: null,
        sourceStatus: peopleFixture.classificationStatus,
      },
    ]);
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

  // @req REQ-136
  it("upserts only declared relations backed by loaded language records and reports missing codes", async () => {
    const peopleWithMissingLanguage = {
      ...peopleFixture,
      content: {
        ...peopleFixture.content,
        languages: {
          ...peopleFixture.content.languages,
          isoCodes: ["bev", "missing", "bev"],
        },
      },
    };
    vi.mocked(loadAllPeoples).mockResolvedValue([peopleWithMissingLanguage]);
    vi.mocked(loadAllLanguages).mockReturnValue([
      {
        id: "bev",
        name: "Bété de Daloa",
        familyId: peopleFixture.languageFamilyId,
        nameProvenance: "derived",
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

    expect(report.peopleLanguages).toMatchObject({
      total: 2,
      inserted: 1,
      errors: [expect.stringMatching(/PPL_BETE.*missing/)],
    });
    expect(
      database.operations.filter(
        ({ table }) => table === "afrik_people_languages"
      )
    ).toEqual([
      {
        table: "afrik_people_languages",
        row: { people_id: betePeople.id, language_id: "bev" },
      },
    ]);
  });

  // @req REQ-136
  it("bounds people-language relation upserts to shared Supabase chunks", async () => {
    const languageRecords = Array.from({ length: 501 }, (_, index) => ({
      id: `l${index}`,
      name: `Language ${index}`,
      familyId: peopleFixture.languageFamilyId,
      nameProvenance: "derived" as const,
    }));
    vi.mocked(loadAllLanguages).mockReturnValue(languageRecords);
    vi.mocked(loadAllPeoples).mockResolvedValue([
      {
        ...peopleFixture,
        content: {
          ...peopleFixture.content,
          languages: {
            ...peopleFixture.content.languages,
            isoCodes: languageRecords.map(({ id }) => id),
          },
        },
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

    const relationCalls = database.upsertCalls.filter(
      ({ table }) => table === "afrik_people_languages"
    );
    expect(relationCalls.map(({ rows }) => rows.length)).toEqual([500, 1]);
    expect(
      relationCalls.every(
        ({ options }) => options?.onConflict === "people_id,language_id"
      )
    ).toBe(true);
    expect(report.peopleLanguages).toMatchObject({
      total: 501,
      inserted: 501,
      errors: [],
    });
  });

  // @req REQ-136
  it("replays people-language relation upserts without duplicating rows", async () => {
    const languages = [
      {
        id: "bev",
        name: "Bété de Daloa",
        familyId: peopleFixture.languageFamilyId,
        nameProvenance: "derived" as const,
      },
      {
        id: "bet",
        name: "Bété de Guibéroua",
        familyId: peopleFixture.languageFamilyId,
        nameProvenance: "derived" as const,
      },
    ];
    vi.mocked(loadAllLanguages).mockReturnValue(languages);
    vi.mocked(loadAllPeoples).mockResolvedValue([
      {
        ...peopleFixture,
        content: {
          ...peopleFixture.content,
          languages: {
            ...peopleFixture.content.languages,
            isoCodes: languages.map(({ id }) => id),
          },
        },
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

    await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });
    const replay = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(database.rows.afrik_people_languages).toEqual([
      { people_id: betePeople.id, language_id: "bev" },
      { people_id: betePeople.id, language_id: "bet" },
    ]);
    expect(replay.peopleLanguages).toMatchObject({
      total: 2,
      inserted: 2,
      errors: [],
    });
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
  /**
   * The corpus sync only ever upserted, so a fiche deleted from the dataset
   * kept its row for good — recette served fourteen such peoples for seven
   * months. These cover the wiring; the cap and the refusal wording are the
   * unit's own (scripts/__tests__/afrikCorpusOrphans.test.ts).
   */
  // @req REQ-032
  it("reports a row the corpus no longer declares without deleting it", async () => {
    const database = useSupabaseDouble({
      rows: {
        afrik_peoples: [
          { id: betePeople.id, content: {} },
          { id: "PPL_KHOZA_FAUXEX", content: {} },
        ],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(report.corpusOrphans.afrik_peoples.orphans).toEqual([
      "PPL_KHOZA_FAUXEX",
    ]);
    expect(report.corpusOrphans.afrik_peoples.deleted).toBe(0);
    expect(database.deleted).toEqual([]);
  });

  // @req REQ-032
  it("deletes the orphan when a run asks to prune and the drift stays small", async () => {
    // Twenty declared peoples against one ghost: 4.8%, just inside the cap the
    // scan refuses above. One fiche and one ghost would be a 50% drift, which
    // the scan reads as a failed corpus load rather than an editorial deletion.
    const declared = Array.from({ length: 20 }, (_, index) => ({
      ...peopleFixture,
      id: `${betePeople.id}_${index}`,
    })) as People[];
    vi.mocked(loadAllPeoples).mockResolvedValue(declared);

    const database = useSupabaseDouble({
      rows: {
        afrik_peoples: [
          ...declared.map((people) => ({ id: people.id, content: {} })),
          { id: "PPL_KHOZA_FAUXEX", content: {} },
        ],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: false,
      prune: true,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(report.corpusOrphans.afrik_peoples.deleted).toBe(1);
    expect(database.deleted).toEqual([
      { table: "afrik_peoples", ids: ["PPL_KHOZA_FAUXEX"] },
    ]);
  });

  // @req REQ-032
  it("leaves the orphan alone in a preview, whatever the run asked for", async () => {
    const database = useSupabaseDouble({
      rows: {
        afrik_peoples: [
          { id: betePeople.id, content: {} },
          { id: "PPL_KHOZA_FAUXEX", content: {} },
        ],
      },
    });

    const report = await migrateAfrikToDatabase({
      dryRun: true,
      prune: true,
      writeErrorReport: false,
      target: recetteTarget,
    });

    expect(report.corpusOrphans.afrik_peoples.orphans).toEqual([
      "PPL_KHOZA_FAUXEX",
    ]);
    expect(database.deleted).toEqual([]);
  });
});
