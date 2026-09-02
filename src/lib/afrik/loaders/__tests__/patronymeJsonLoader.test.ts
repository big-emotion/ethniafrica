import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadAllPatronymeDossiers,
  loadPatronymes,
} from "../patronymeJsonLoader";
import type { PatronymeDossier } from "../../parsers/patronymeTypes";
import {
  SOURCE_KEY,
  validPatronymeFiche,
} from "../../parsers/__tests__/fixtures/validPatronymeFiche.fixture";

interface Row {
  [key: string]: unknown;
}

interface SupabaseDoubleOptions {
  peopleIds?: string[];
  countryIds?: string[];
  personIds?: string[];
  patronymeIds?: string[];
  rejectTable?: string;
}

function createSupabaseDouble(options: SupabaseDoubleOptions = {}) {
  const writes: Array<{ table: string; row: Row }> = [];
  const sources: Row[] = [];
  const revisions: Row[] = [];
  const assertions: Row[] = [];
  const rows: Record<string, Row[]> = {
    afrik_peoples: (options.peopleIds ?? ["PPL_MALINKE"]).map((id) => ({ id })),
    afrik_countries: (options.countryIds ?? ["MLI"]).map((id) => ({ id })),
    persons: (options.personIds ?? ["PER_MODIBO_KEITA"]).map((id) => ({ id })),
    afrik_patronymes: (options.patronymeIds ?? []).map((id) => ({ id })),
    afrik_patronyme_peoples: [],
    afrik_patronyme_countries: [],
    afrik_patronyme_persons: [],
    afrik_patronyme_alliances: [],
    name_records: [],
  };
  let sequence = 0;

  const remember = (table: string, row: Row, keys: string[]) => {
    writes.push({ table, row });
    if (options.rejectTable === table) {
      return { error: { message: `rejected ${table}` } };
    }

    const tableRows = rows[table] ?? (rows[table] = []);
    const index = tableRows.findIndex((candidate) =>
      keys.every((key) => candidate[key] === row[key])
    );
    if (index === -1) tableRows.push(row);
    else tableRows[index] = { ...tableRows[index], ...row };
    return { error: null };
  };

  const from = vi.fn((table: string) => {
    if (["afrik_peoples", "afrik_countries", "persons"].includes(table)) {
      return {
        select: vi.fn(async () => ({ data: rows[table], error: null })),
      };
    }

    if (table === "afrik_patronymes") {
      return {
        select: vi.fn(async () => ({ data: rows[table], error: null })),
        upsert: vi.fn(async (row: Row) => remember(table, row, ["id"])),
      };
    }

    if (table === "sources") {
      return {
        upsert: vi.fn((row: Row) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              writes.push({ table, row });
              if (options.rejectTable === table) {
                return { data: null, error: { message: `rejected ${table}` } };
              }
              const existing = sources.find(
                (candidate) => candidate.title === row.title
              );
              if (existing) Object.assign(existing, row);
              else sources.push({ id: `src-${++sequence}`, ...row });
              const persisted = sources.find(
                (candidate) => candidate.title === row.title
              );
              return { data: { id: persisted?.id }, error: null };
            }),
          })),
        })),
      };
    }

    if (table === "fiche_revisions") {
      return {
        upsert: vi.fn((row: Row) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              writes.push({ table, row });
              const existing = revisions.find(
                (candidate) =>
                  candidate.entity_type === row.entity_type &&
                  candidate.entity_id === row.entity_id &&
                  candidate.version === row.version
              );
              if (existing) Object.assign(existing, row);
              else revisions.push({ id: `rev-${++sequence}`, ...row });
              const persisted = revisions.find(
                (candidate) =>
                  candidate.entity_type === row.entity_type &&
                  candidate.entity_id === row.entity_id &&
                  candidate.version === row.version
              );
              return { data: { id: persisted?.id }, error: null };
            }),
          })),
        })),
      };
    }

    if (table === "assertions") {
      return {
        select: vi.fn(() => {
          const filters: Row = {};
          const builder = {
            eq: vi.fn((column: string, value: unknown) => {
              filters[column] = value;
              return builder;
            }),
            maybeSingle: vi.fn(async () => ({
              data:
                assertions.find(
                  (candidate) =>
                    candidate.entity_type === filters.entity_type &&
                    candidate.entity_id === filters.entity_id &&
                    candidate.field_path === filters.field_path
                ) ?? null,
              error: null,
            })),
          };
          return builder;
        }),
        update: vi.fn((patch: Row) => ({
          eq: vi.fn(async (_column: string, id: string) => {
            writes.push({ table, row: { id, ...patch } });
            const existing = assertions.find(
              (candidate) => candidate.id === id
            );
            if (existing) Object.assign(existing, patch);
            return { error: null };
          }),
        })),
        insert: vi.fn((row: Row) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              writes.push({ table, row });
              const created = { id: `ast-${++sequence}`, ...row };
              assertions.push(created);
              return { data: { id: created.id }, error: null };
            }),
          })),
        })),
      };
    }

    const keyColumns: Record<string, string[]> = {
      name_records: ["entity_type", "entity_id", "name_text", "name_type"],
      afrik_patronyme_peoples: ["patronyme_id", "people_id"],
      afrik_patronyme_countries: ["patronyme_id", "country_id"],
      afrik_patronyme_persons: ["patronyme_id", "person_id"],
      afrik_patronyme_alliances: ["name_id_a", "name_id_b"],
    };
    if (keyColumns[table]) {
      return {
        upsert: vi.fn(async (row: Row) =>
          remember(table, row, keyColumns[table])
        ),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return { client: { from }, rows, sources, revisions, assertions, writes };
}

function secondDossier(
  overrides: Record<string, unknown> = {}
): PatronymeDossier {
  return validPatronymeFiche({
    id: "PAT_KONDE",
    nameMain: "Kondé",
    spellings: [
      {
        spelling: "Kondé",
        attestations: [{ countryId: "MLI", sourceRefs: [SOURCE_KEY] }],
      },
    ],
    alliances: [],
    bearers: [],
    ...overrides,
  }) as PatronymeDossier;
}

describe("patronymeJsonLoader", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      __dirname,
      `tmp_test_patronymes_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(join(tmpDir, "patronymes"), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  });

  // @req REQ-133
  // @req REQ-134
  it("discovers every valid non-illustrative PAT file and surfaces malformed files", () => {
    writeFileSync(
      join(tmpDir, "patronymes", "PAT_KEITA.json"),
      JSON.stringify(validPatronymeFiche())
    );
    writeFileSync(
      join(tmpDir, "patronymes", "PAT_WRONG_FILENAME.json"),
      JSON.stringify(secondDossier())
    );
    writeFileSync(join(tmpDir, "patronymes", "PAT_BROKEN.json"), "{");
    writeFileSync(
      join(tmpDir, "patronymes", "PAT_EXAMPLE.json"),
      JSON.stringify(
        validPatronymeFiche({
          id: "PAT_EXAMPLE",
          _meta: {
            format: "AFRIK JSON v2",
            entity: "patronyme",
            directives: "Fixture only.",
            illustrative: true,
          },
        })
      )
    );

    const batch = loadAllPatronymeDossiers(tmpDir);

    expect(batch.dossiers.map(({ id }) => id)).toEqual(["PAT_KEITA"]);
    expect(batch.errors).toEqual([
      expect.stringMatching(/PAT_BROKEN\.json.*invalid JSON/),
      expect.stringMatching(/PAT_WRONG_FILENAME\.json.*PAT_KONDE\.json/),
    ]);
  });

  // @req REQ-133
  // @req REQ-134
  it("preflights the complete reference graph and performs no write when one reference is absent", async () => {
    const database = createSupabaseDouble({ personIds: [] });
    const dossiers = [
      validPatronymeFiche() as PatronymeDossier,
      secondDossier(),
    ];

    const report = await loadPatronymes(database.client as never, {
      dossiers,
      errors: [],
    });

    expect(report).toMatchObject({ total: 2, inserted: 0 });
    expect(report.errors).toContainEqual(
      expect.stringMatching(/PER_MODIBO_KEITA.*does not exist/)
    );
    expect(database.writes).toEqual([]);
  });

  // @req REQ-130
  it("accepts a declared off-map country the atlas stores no row for", async () => {
    const database = createSupabaseDouble({
      countryIds: ["MLI"],
      patronymeIds: ["PAT_KONDE"],
    });
    const diaspora = validPatronymeFiche({
      countries: [
        { countryId: "MLI", status: "attested", sourceRefs: [SOURCE_KEY] },
        { countryId: "ESP", status: "attested", sourceRefs: [SOURCE_KEY] },
      ],
    }) as PatronymeDossier;

    const report = await loadPatronymes(database.client as never, {
      dossiers: [diaspora],
      errors: [],
    });

    expect(report.errors).toEqual([]);
    expect(report).toMatchObject({ total: 1, inserted: 1 });
  });

  // @req REQ-130
  it("still rejects a country that is neither African nor a declared diaspora presence", async () => {
    const database = createSupabaseDouble({
      countryIds: ["MLI"],
      patronymeIds: ["PAT_KONDE"],
    });
    const bogus = validPatronymeFiche({
      countries: [
        { countryId: "GBN", status: "attested", sourceRefs: [SOURCE_KEY] },
      ],
    }) as PatronymeDossier;

    const report = await loadPatronymes(database.client as never, {
      dossiers: [bogus],
      errors: [],
    });

    expect(report.errors).toContainEqual(
      expect.stringMatching(/GBN does not exist/)
    );
    expect(report).toMatchObject({ inserted: 0 });
  });

  // @req REQ-133
  // @req REQ-134
  it("rejects conflicting authority labels for the same source before writing", async () => {
    const database = createSupabaseDouble({
      patronymeIds: ["PAT_KONDE"],
    });
    const keita = validPatronymeFiche() as PatronymeDossier;
    const konde = secondDossier({
      sources: [
        {
          ...validPatronymeFiche().sources[0],
          tier: "unverified",
        },
      ],
    });

    const report = await loadPatronymes(database.client as never, {
      dossiers: [keita, konde],
      errors: [],
    });

    expect(report.errors).toContainEqual(
      expect.stringMatching(/conflicting source.*tier/i)
    );
    expect(database.writes).toEqual([]);
  });

  // @req REQ-133
  // @req REQ-134
  it("writes every parent before projections and preserves the complete dossier as content", async () => {
    const database = createSupabaseDouble();
    const keita = validPatronymeFiche({
      sources: [
        {
          ...validPatronymeFiche().sources[0],
          tier: "unverified",
        },
      ],
    }) as PatronymeDossier;

    const report = await loadPatronymes(database.client as never, {
      dossiers: [
        keita,
        secondDossier({
          sources: [
            {
              ...validPatronymeFiche().sources[0],
              tier: "unverified",
            },
          ],
        }),
      ],
      errors: [],
    });

    expect(report).toMatchObject({
      total: 2,
      inserted: 2,
      spellings: 2,
      peopleLinks: 2,
      countryLinks: 2,
      bearerLinks: 1,
      alliances: 1,
      errors: [],
    });
    const tables = database.writes.map(({ table }) => table);
    const lastParent = tables.lastIndexOf("afrik_patronymes");
    expect(lastParent).toBeGreaterThanOrEqual(1);
    expect(
      tables
        .slice(0, lastParent + 1)
        .every((table) => table === "afrik_patronymes")
    ).toBe(true);
    expect(database.rows.afrik_patronymes[0]).toMatchObject({
      id: "PAT_KEITA",
      name_system: "clan_name",
      content: keita,
    });
    expect(database.sources).toContainEqual(
      expect.objectContaining({ tier: "unverified" })
    );
    expect(database.rows.name_records).toContainEqual(
      expect.objectContaining({
        entity_type: "patronyme",
        entity_id: "PAT_KEITA",
        name_text: "Keïta",
        name_type: "surname",
      })
    );
    expect(database.rows.afrik_patronyme_persons).toEqual([
      { patronyme_id: "PAT_KEITA", person_id: "PER_MODIBO_KEITA" },
    ]);
    expect(database.rows.afrik_patronyme_alliances).toEqual([
      expect.objectContaining({
        name_id_a: "PAT_KEITA",
        name_id_b: "PAT_KONDE",
        alliance_type: "joking_kinship",
        tier: "unverified",
      }),
    ]);
  });

  // @req REQ-133
  // @req REQ-134
  it("previews and replays a valid batch without writes or duplicate projections", async () => {
    const database = createSupabaseDouble();
    const batch = {
      dossiers: [validPatronymeFiche() as PatronymeDossier, secondDossier()],
      errors: [],
    };
    const references = {
      peopleIds: new Set(["PPL_MALINKE"]),
      countryIds: new Set(["MLI"]),
      personIds: new Set(["PER_MODIBO_KEITA"]),
      patronymeIds: new Set<string>(),
    };

    const preview = await loadPatronymes(database.client as never, batch, {
      dryRun: true,
      references,
    });
    expect(preview).toMatchObject({ total: 2, inserted: 0, errors: [] });
    expect(database.writes).toEqual([]);

    await loadPatronymes(database.client as never, batch);
    const replay = await loadPatronymes(database.client as never, batch);

    expect(replay.errors).toEqual([]);
    expect(database.rows.afrik_patronymes).toHaveLength(2);
    expect(database.rows.name_records).toHaveLength(2);
    expect(database.rows.afrik_patronyme_peoples).toHaveLength(2);
    expect(database.rows.afrik_patronyme_countries).toHaveLength(2);
    expect(database.rows.afrik_patronyme_persons).toHaveLength(1);
    expect(database.rows.afrik_patronyme_alliances).toHaveLength(1);
    expect(database.assertions).toHaveLength(2);
    expect(database.revisions).toHaveLength(2);
  });

  // @req REQ-133
  // @req REQ-134
  it("creates distinct assertions for spellings that normalize to the same key", async () => {
    const database = createSupabaseDouble({
      patronymeIds: ["PAT_KONDE"],
    });
    const base = validPatronymeFiche();
    const dossier = validPatronymeFiche({
      spellings: [
        base.spellings[0],
        {
          ...base.spellings[0],
          spelling: "Keita",
        },
      ],
    }) as PatronymeDossier;

    const report = await loadPatronymes(database.client as never, {
      dossiers: [dossier],
      errors: [],
    });

    expect(report.errors).toEqual([]);
    expect(database.assertions).toHaveLength(2);
    expect(
      new Set(database.assertions.map(({ field_path }) => field_path)).size
    ).toBe(2);
    expect(database.rows.name_records).toHaveLength(2);
  });

  // @req REQ-133
  it("projects every regional alliance term to the only SQL alliance enum", async () => {
    const database = createSupabaseDouble();
    const dossier = validPatronymeFiche({
      alliances: [
        {
          targetPatronymeId: "PAT_KONDE",
          allianceType: "terme régional non normalisé",
          sourceRefs: [SOURCE_KEY],
        },
      ],
    }) as PatronymeDossier;

    const report = await loadPatronymes(database.client as never, {
      dossiers: [dossier, secondDossier()],
      errors: [],
    });

    expect(report.errors).toEqual([]);
    expect(database.rows.afrik_patronyme_alliances).toContainEqual(
      expect.objectContaining({ alliance_type: "joking_kinship" })
    );
  });
});
