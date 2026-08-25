/**
 * Test-first: service + handler for GET /v2/peoples/{id}/fragmentation.
 * Route-level tests live in src/app/api/v2/__tests__/peoples-fragmentation.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
  getPeopleFragmentation,
  listPeopleFragmentations,
  PeopleFragmentationNotFoundError,
  InsufficientCountriesError,
} from "../services/peopleFragmentation";
import { getPeopleFragmentationHandler } from "../handlers/peopleFragmentation";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

function buildMaybeSingleQuery(row: Record<string, unknown> | null): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: null }));
  return query;
}

function buildCountriesQuery(
  rows: Array<Record<string, unknown>>,
  error: { message: string } | null = null
): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.in = vi.fn(() => Promise.resolve({ data: rows, error }));
  return query;
}

function buildAssertionsQuery(
  rows: Array<Record<string, unknown>>,
  error: { message: string } | null = null
): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.like = vi.fn(() => Promise.resolve({ data: rows, error }));
  return query;
}

const peopleRow = {
  id: "PPL_EWE",
  content: {
    appellations: { selfAppellation: "Eʋe", exonyms: ["Ewe"] },
    demography: {
      distributionByCountry: [
        { country: "GHA", population: 620000, percentage: 62 },
        { country: "TGO", population: 380000, percentage: 38 },
      ],
    },
  },
};

function mockTables({
  people = peopleRow,
  countries = [
    { id: "GHA", name_fr: "Ghana" },
    { id: "TGO", name_fr: "Togo" },
  ],
  assertions = [
    { id: "aaaaaaaa-1111-1111-1111-111111111111", value: { country: "GHA" } },
  ],
}: {
  people?: Record<string, unknown> | null;
  countries?: Array<Record<string, unknown>>;
  assertions?: Array<Record<string, unknown>>;
} = {}) {
  fromMock.mockImplementation((table: string) => {
    if (table === "afrik_peoples") return buildMaybeSingleQuery(people);
    if (table === "afrik_countries") return buildCountriesQuery(countries);
    if (table === "assertions") return buildAssertionsQuery(assertions);
    throw new Error(`Unexpected table: ${table}`);
  });
}

describe("peopleFragmentation service", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  // @req REQ-091
  it("returns fragmentation for a people spanning >= 2 countries", async () => {
    mockTables();

    const result = await getPeopleFragmentation("PPL_EWE");

    expect(result.peopleId).toBe("PPL_EWE");
    expect(result.autonym).toBe("Eʋe");
    expect(result.exonym).toBe("Ewe");
    expect(result.countryCount).toBe(2);
    expect(result.countries).toEqual([
      {
        iso3: "GHA",
        nameFr: "Ghana",
        populationShare: 0.62,
        assertionId: "aaaaaaaa-1111-1111-1111-111111111111",
      },
      {
        iso3: "TGO",
        nameFr: "Togo",
        populationShare: 0.38,
        assertionId: null,
      },
    ]);
    expect(result.borderPairs).toEqual([{ a: "GHA", b: "TGO" }]);
  });

  // @req REQ-091
  it("computes populationShare from population/total when percentage is absent", async () => {
    mockTables({
      people: {
        id: "PPL_EWE",
        content: {
          appellations: {},
          demography: {
            distributionByCountry: [
              { country: "GHA", population: 3 },
              { country: "TGO", population: 1 },
            ],
          },
        },
      },
      assertions: [],
    });

    const result = await getPeopleFragmentation("PPL_EWE");

    expect(result.countries[0].populationShare).toBeCloseTo(0.75);
    expect(result.countries[1].populationShare).toBeCloseTo(0.25);
  });

  // @req REQ-091
  it("sets assertionId to null when no assertion matches the country", async () => {
    mockTables({ assertions: [] });

    const result = await getPeopleFragmentation("PPL_EWE");

    expect(result.countries.every((c) => c.assertionId === null)).toBe(true);
  });

  // @req REQ-091
  it("never populates colonialOrigin (13.3 dataset does not exist yet)", async () => {
    mockTables();

    const result = await getPeopleFragmentation("PPL_EWE");

    expect(result.borderPairs.every((p) => !("colonialOrigin" in p))).toBe(
      true
    );
  });

  // @req REQ-091
  it("batches countries and assertions in one query each (AR17)", async () => {
    mockTables();

    await getPeopleFragmentation("PPL_EWE");

    const calledTables = fromMock.mock.calls.map((call) => call[0]);
    expect(calledTables.filter((t) => t === "afrik_countries")).toHaveLength(1);
    expect(calledTables.filter((t) => t === "assertions")).toHaveLength(1);
  });

  // @req REQ-091
  it("throws PeopleFragmentationNotFoundError for an unknown id", async () => {
    mockTables({ people: null });

    await expect(getPeopleFragmentation("PPL_UNKNOWN")).rejects.toThrow(
      PeopleFragmentationNotFoundError
    );
  });

  // @req REQ-091
  it("throws InsufficientCountriesError when the people spans < 2 countries", async () => {
    mockTables({
      people: {
        id: "PPL_SOLO",
        content: {
          appellations: {},
          demography: {
            distributionByCountry: [{ country: "GHA", population: 1000 }],
          },
        },
      },
    });

    await expect(getPeopleFragmentation("PPL_SOLO")).rejects.toThrow(
      InsufficientCountriesError
    );
  });
});

describe("peopleFragmentation handler", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  // @req REQ-091
  it("returns ok:true with the AR8 envelope for a valid fragmentation", async () => {
    mockTables();

    const result = await getPeopleFragmentationHandler("PPL_EWE");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.data.peopleId).toBe("PPL_EWE");
      expect(result.envelope.meta.license).toBe("CC-BY-SA-4.0");
      expect(result.envelope.errors).toEqual([]);
    }
  });

  // @req REQ-091
  it("returns ok:false NOT_FOUND for an unknown id", async () => {
    mockTables({ people: null });

    const result = await getPeopleFragmentationHandler("PPL_UNKNOWN");

    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  // @req REQ-091
  it("returns ok:false SEMANTIC_ERROR for a people in < 2 countries", async () => {
    mockTables({
      people: {
        id: "PPL_SOLO",
        content: {
          appellations: {},
          demography: {
            distributionByCountry: [{ country: "GHA", population: 1000 }],
          },
        },
      },
    });

    const result = await getPeopleFragmentationHandler("PPL_SOLO");

    expect(result).toMatchObject({ ok: false, code: "SEMANTIC_ERROR" });
  });
});

/**
 * Test-first: bulk read backing the /fr/regards/colonisation-et-resistances
 * fragmentation-index section (Epic 13, Story 13.9, ETNI-533).
 */
describe("listPeopleFragmentations", () => {
  /**
   * The `afrik_peoples` table backs two different call chains from the same
   * mock: the candidate-id sweep (`.select().limit()`) and each per-people
   * lookup inside `getPeopleFragmentation` (`.select().eq().maybeSingle()`).
   * One object with both terminal methods, sharing a single `query`
   * reference, supports either chain regardless of call order.
   */
  function buildAfrikPeoplesQuery(
    listRows: Array<{ id: string }> | null,
    listError: { message: string } | null,
    rowsById: Record<string, Record<string, unknown> | null>
  ): FakeQuery {
    const query: FakeQuery = {} as FakeQuery;
    let currentId: string | undefined;
    query.select = vi.fn(() => query);
    query.limit = vi.fn(() =>
      Promise.resolve({ data: listRows, error: listError })
    );
    query.eq = vi.fn((_col: unknown, value: unknown) => {
      currentId = value as string;
      return query;
    });
    query.maybeSingle = vi.fn(() =>
      Promise.resolve({
        data: currentId ? (rowsById[currentId] ?? null) : null,
        error: null,
      })
    );
    return query;
  }

  const soloRow = {
    id: "PPL_SOLO",
    content: {
      appellations: {},
      demography: {
        distributionByCountry: [{ country: "GHA", population: 1000 }],
      },
    },
  };

  function mockListTables({
    candidateIds = ["PPL_EWE", "PPL_SOLO", "PPL_GHOST"],
    error = null,
  }: {
    candidateIds?: string[];
    error?: { message: string } | null;
  } = {}) {
    const rowsById: Record<string, Record<string, unknown> | null> = {
      PPL_EWE: peopleRow,
      PPL_SOLO: soloRow,
      PPL_GHOST: null,
    };
    const peoplesQuery = buildAfrikPeoplesQuery(
      candidateIds.map((id) => ({ id })),
      error,
      rowsById
    );

    fromMock.mockImplementation((table: string) => {
      if (table === "afrik_peoples") return peoplesQuery;
      if (table === "afrik_countries")
        return buildCountriesQuery([
          { id: "GHA", name_fr: "Ghana" },
          { id: "TGO", name_fr: "Togo" },
        ]);
      if (table === "assertions") return buildAssertionsQuery([]);
      throw new Error(`Unexpected table: ${table}`);
    });

    return peoplesQuery;
  }

  beforeEach(() => {
    fromMock.mockReset();
  });

  // @req REQ-091 FR90
  it("returns fragmentation only for candidates with >= 2 countries", async () => {
    mockListTables();

    const result = await listPeopleFragmentations();

    expect(result).toHaveLength(1);
    expect(result[0].peopleId).toBe("PPL_EWE");
  });

  // @req REQ-091 FR90
  it("skips candidates below the country threshold and unknown ids without throwing", async () => {
    mockListTables();

    await expect(listPeopleFragmentations()).resolves.not.toThrow();
  });

  // @req REQ-091 FR90
  it("passes the limit through to the candidate-id query", async () => {
    const peoplesQuery = mockListTables({ candidateIds: ["PPL_EWE"] });

    await listPeopleFragmentations(10);

    expect(peoplesQuery.limit).toHaveBeenCalledWith(10);
  });

  // @req REQ-091 FR90
  it("returns an empty array when the candidate-id query errors", async () => {
    mockListTables({ error: { message: "boom" } });

    const result = await listPeopleFragmentations();

    expect(result).toEqual([]);
  });
});
