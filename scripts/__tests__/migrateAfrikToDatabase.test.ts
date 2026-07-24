import { beforeEach, describe, expect, it, vi } from "vitest";

import afroasiaticFamily from "../../dataset/source/afrik/famille_linguistique/FLG_AFROASIATIQUE.json";
import betePeople from "../../dataset/source/afrik/peuples/FLG_KROU/PPL_BETE.json";
import coteDIvoire from "../../dataset/source/afrik/pays/CIV.json";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAllCountries } from "@/lib/afrik/loaders/countryLoader";
import { loadAllLanguageFamilies } from "@/lib/afrik/loaders/languageFamilyLoader";
import { loadAllPeoples } from "@/lib/afrik/loaders/peopleLoader";
import { migrateAfrikToDatabase } from "../migrateAfrikToDatabase";
import type { LanguageFamily, People } from "@/types/afrik";

vi.mock("@/lib/afrik/loaders/languageFamilyLoader");
vi.mock("@/lib/afrik/loaders/peopleLoader");
vi.mock("@/lib/afrik/loaders/countryLoader");
vi.mock("@/lib/supabase/admin");

const STAGING_URL = "https://ethniafrica-staging.supabase.co";
// JSON imports retain narrower inferred fields than the evolutionary AFRIK types.
const familyFixture = afroasiaticFamily as unknown as LanguageFamily;
const peopleFixture = betePeople as unknown as People;
const stagingTarget = {
  target: "staging",
  activeSupabaseUrl: STAGING_URL,
  expectedStagingSupabaseUrl: STAGING_URL,
};

type TableName =
  | "afrik_language_families"
  | "afrik_peoples"
  | "afrik_countries"
  | "afrik_people_countries";

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
}

function createSupabaseDouble(options: SupabaseDoubleOptions = {}) {
  const rows: Record<TableName, DatabaseRow[]> = {
    afrik_language_families: [...(options.rows?.afrik_language_families ?? [])],
    afrik_peoples: [...(options.rows?.afrik_peoples ?? [])],
    afrik_countries: [...(options.rows?.afrik_countries ?? [])],
    afrik_people_countries: [...(options.rows?.afrik_people_countries ?? [])],
  };
  const operations: UpsertOperation[] = [];
  const persistUpserts = options.persistUpserts ?? true;

  const from = vi.fn((table: TableName) => ({
    select: vi.fn(async () => ({ data: rows[table], error: null })),
    upsert: vi.fn(async (row: DatabaseRow) => {
      operations.push({ table, row });

      if (persistUpserts) {
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

        if (index === -1) {
          rows[table].push(row);
        } else {
          rows[table][index] = row;
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
    vi.mocked(loadAllPeoples).mockResolvedValue([peopleFixture]);
    vi.mocked(loadAllCountries).mockResolvedValue([coteDIvoire]);
  });

  it("validates the staging target before constructing the admin client", async () => {
    await expect(
      migrateAfrikToDatabase({
        dryRun: true,
        writeErrorReport: false,
        target: {
          target: "production",
          activeSupabaseUrl: "https://ethniafrica-production.supabase.co",
          expectedStagingSupabaseUrl: STAGING_URL,
        },
      })
    ).rejects.toThrow('Migration target must be exactly "staging"');

    expect(createAdminClient).not.toHaveBeenCalled();
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
      target: stagingTarget,
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
      target: stagingTarget,
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
      target: stagingTarget,
    });

    expect(report.verification.after?.hasDrift).toBe(true);
    expect(report.verification.errors).toEqual([
      "Post-sync verification found residual AFRIK source drift",
    ]);
  });
});
