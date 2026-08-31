/**
 * Test-first: service + handler for GET /v2/peoples/{id}/names (Story 8.6,
 * Epic 8 Names Atlas). Route-level tests live in
 * src/app/api/v2/__tests__/names-routes.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/supabase/queries/afrik/module-zero-batch", () => ({
  getConfidenceMap: vi.fn(),
}));

import {
  getPeopleNamesDossier,
  PeopleNamesNotFoundError,
} from "../services/names";
import { getPeopleNamesHandler } from "../handlers/peopleNames";
import { getConfidenceMap } from "@/lib/supabase/queries/afrik/module-zero-batch";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

function buildMaybeSingleQuery(row: Record<string, unknown> | null): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: null }));
  return query;
}

function buildNameRecordsQuery(
  rows: Array<Record<string, unknown>>,
  error: { message: string } | null = null
): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.order = vi.fn(() => query);
  // Supabase's PostgrestFilterBuilder is itself thenable — the query
  // resolves whichever builder method was called last.
  (
    query as unknown as {
      then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
    }
  ).then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: rows, error }).then(resolve);
  return query;
}

function buildAssertionsQuery(
  rows: Array<Record<string, unknown>>,
  error: { message: string } | null = null
): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.in = vi.fn(() => Promise.resolve({ data: rows, error }));
  return query;
}

function buildSourcesQuery(
  rows: Array<Record<string, unknown>>,
  error: { message: string } | null = null
): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.in = vi.fn(() => Promise.resolve({ data: rows, error }));
  return query;
}

const peopleRow = {
  id: "PPL_DINKA",
  content: {
    appellations: { selfAppellation: "Jieng" },
  },
};

const endonymRow = {
  id: "nr-endonym-1",
  name_text: "Jieng",
  name_type: "endonym",
  language_of_origin: "din",
  meaning: "the people",
  period_label: null,
  imposed_by: null,
  imposition_period: null,
  why_problematic: null,
  contemporary_usage: "primary self-identification",
  assertion_id: "assertion-1",
  sort_rank: 0,
};

const exonymRow = {
  id: "nr-exonym-1",
  name_text: "Dinka",
  name_type: "exonym",
  language_of_origin: "ara",
  meaning: null,
  period_label: null,
  imposed_by: "British/Egyptian colonial administration",
  imposition_period: "19th century",
  why_problematic: "Arabic-origin exonym imposed by colonial administrators",
  contemporary_usage: "still in common external use",
  assertion_id: "assertion-2",
  sort_rank: 1,
};

function mockTables({
  people = peopleRow,
  names = [endonymRow, exonymRow],
  assertions = [
    { id: "assertion-1", source_ids: ["src-1"] },
    { id: "assertion-2", source_ids: ["src-2"] },
  ],
  sources = [
    {
      id: "src-1",
      title: "Ethnologue",
      url: "https://ethnologue.com",
      year: 2023,
      tier: "official",
    },
    {
      id: "src-2",
      title: "UNESCO report",
      url: "https://unesco.org",
      year: 2019,
      tier: "official",
    },
  ],
}: {
  people?: Record<string, unknown> | null;
  names?: Array<Record<string, unknown>>;
  assertions?: Array<Record<string, unknown>>;
  sources?: Array<Record<string, unknown>>;
} = {}) {
  fromMock.mockImplementation((table: string) => {
    if (table === "afrik_peoples") return buildMaybeSingleQuery(people);
    if (table === "name_records") return buildNameRecordsQuery(names);
    if (table === "assertions") return buildAssertionsQuery(assertions);
    if (table === "sources") return buildSourcesQuery(sources);
    throw new Error(`Unexpected table: ${table}`);
  });
}

describe("names service — getPeopleNamesDossier", () => {
  beforeEach(() => {
    fromMock.mockReset();
    vi.mocked(getConfidenceMap).mockReset();
    vi.mocked(getConfidenceMap).mockResolvedValue(
      new Map([
        [
          "PPL_DINKA",
          {
            entityId: "PPL_DINKA",
            score: 85,
            sourceCount: 2,
            avgSourceQuality: 0.9,
            lastHumanAuditAt: null,
            openFlagCount: 0,
            recomputedAt: "2026-07-31T10:00:00Z",
          },
        ],
      ])
    );
  });

  // @req REQ-092
  it("returns the dossier ordered endonyms-first with per-record sources and confidence", async () => {
    mockTables();

    const result = await getPeopleNamesDossier("PPL_DINKA");

    expect(result.peopleId).toBe("PPL_DINKA");
    expect(result.autonym).toBe("Jieng");
    expect(result.names).toHaveLength(2);
    expect(result.names[0].nameText).toBe("Jieng");
    expect(result.names[0].nameType).toBe("endonym");
    expect(result.names[0].sources).toEqual([
      {
        id: "src-1",
        title: "Ethnologue",
        url: "https://ethnologue.com",
        year: 2023,
        tier: "official",
      },
    ]);
    expect(result.names[0].confidence).toEqual({
      score: 85,
      recomputedAt: "2026-07-31T10:00:00Z",
    });
    expect(result.names[1].nameText).toBe("Dinka");
    expect(result.names[1].nameType).toBe("exonym");
  });

  // @req REQ-092
  it("nests imposition fields for an exonym with imposedBy set", async () => {
    mockTables();

    const result = await getPeopleNamesDossier("PPL_DINKA");

    expect(result.names[1].imposition).toEqual({
      imposedBy: "British/Egyptian colonial administration",
      impositionPeriod: "19th century",
      whyProblematic: "Arabic-origin exonym imposed by colonial administrators",
      contemporaryUsage: "still in common external use",
    });
  });

  // @req REQ-092
  it("nests contemporaryUsage under imposition for a non-imposed endonym (no data loss)", async () => {
    mockTables();

    const result = await getPeopleNamesDossier("PPL_DINKA");

    expect(result.names[0].imposition).toEqual({
      imposedBy: null,
      impositionPeriod: null,
      whyProblematic: null,
      contemporaryUsage: "primary self-identification",
    });
  });

  // @req REQ-092
  it("sets imposition to null when no imposition-related field is present", async () => {
    mockTables({
      names: [
        {
          ...endonymRow,
          contemporary_usage: null,
        },
      ],
      assertions: [{ id: "assertion-1", source_ids: ["src-1"] }],
    });

    const result = await getPeopleNamesDossier("PPL_DINKA");

    expect(result.names[0].imposition).toBeNull();
  });

  // @req REQ-092
  it("returns an empty names array when the people has no name records", async () => {
    mockTables({ names: [], assertions: [] });

    const result = await getPeopleNamesDossier("PPL_DINKA");

    expect(result.names).toEqual([]);
  });

  // @req REQ-092
  it("batches sources and confidence lookups in one query each (AR17, no per-record queries)", async () => {
    mockTables();

    await getPeopleNamesDossier("PPL_DINKA");

    const calledTables = fromMock.mock.calls.map((call) => call[0]);
    expect(calledTables.filter((t) => t === "name_records")).toHaveLength(1);
    expect(calledTables.filter((t) => t === "assertions")).toHaveLength(1);
    expect(calledTables.filter((t) => t === "sources")).toHaveLength(1);
    expect(getConfidenceMap).toHaveBeenCalledTimes(1);
    expect(getConfidenceMap).toHaveBeenCalledWith(["PPL_DINKA"]);
  });

  // @req REQ-092
  it("throws PeopleNamesNotFoundError for an unknown people id", async () => {
    mockTables({ people: null });

    await expect(getPeopleNamesDossier("PPL_UNKNOWN")).rejects.toThrow(
      PeopleNamesNotFoundError
    );
  });
});

describe("names handler — getPeopleNamesHandler", () => {
  beforeEach(() => {
    fromMock.mockReset();
    vi.mocked(getConfidenceMap).mockReset();
    vi.mocked(getConfidenceMap).mockResolvedValue(new Map());
  });

  // @req REQ-092
  it("returns ok:true with the AR8 envelope for a valid dossier", async () => {
    mockTables();

    const result = await getPeopleNamesHandler("PPL_DINKA");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.data.peopleId).toBe("PPL_DINKA");
      expect(result.envelope.meta.license).toBe("CC-BY-SA-4.0");
      expect(result.envelope.errors).toEqual([]);
    }
  });

  // @req REQ-092
  it("returns ok:false NOT_FOUND for an unknown id", async () => {
    mockTables({ people: null });

    const result = await getPeopleNamesHandler("PPL_UNKNOWN");

    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });
});
