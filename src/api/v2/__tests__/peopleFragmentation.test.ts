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
  CANDIDATE_PAGE_SIZE,
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
  query.in = vi.fn(() => query);
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
    {
      id: "aaaaaaaa-1111-1111-1111-111111111111",
      entity_id: "PPL_EWE",
      statement: "GHA",
    },
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

  /**
   * Migration 015 dropped `assertions.value` in favour of `statement`, and
   * this service was never moved over: PostgREST answered 42703, the error
   * was swallowed, and every assertionId came back null. Reading the column
   * that exists is what makes the sourcing link resolve at all.
   */
  // @req REQ-091
  it("reads the country from the assertion statement, not a dropped value column", async () => {
    mockTables({
      assertions: [
        {
          id: "bbbbbbbb-2222-2222-2222-222222222222",
          entity_id: "PPL_EWE",
          statement: "TGO",
        },
      ],
    });

    const result = await getPeopleFragmentation("PPL_EWE");

    expect(result.countries.find((c) => c.iso3 === "TGO")?.assertionId).toBe(
      "bbbbbbbb-2222-2222-2222-222222222222"
    );
    expect(result.countries.find((c) => c.iso3 === "GHA")?.assertionId).toBe(
      null
    );
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
 *
 * The sweep it replaces took an unordered `limit 50` off a table of 803 and
 * then spent three queries per candidate. Both halves of that are asserted
 * here: which peoples come back, and how many round trips it took.
 */
describe("listPeopleFragmentations", () => {
  /** A candidate row as the sweep's narrowed select returns it. */
  function candidate(id: string, countries: string[]) {
    return {
      id,
      appellations: { selfAppellation: `${id} autonym`, exonyms: [id] },
      distribution: countries.map((country, position) => ({
        country,
        percentage:
          position === 0 ? 60 : 40 / Math.max(1, countries.length - 1),
      })),
    };
  }

  /**
   * Serves the given rows through successive `.order().range()` calls, one
   * page at a time, exactly as PostgREST would — so a suite that never pages
   * cannot pass a walk that forgot to.
   */
  function buildSweepQuery(
    rows: Array<Record<string, unknown>>,
    error: { message: string } | null = null
  ): FakeQuery {
    const query: FakeQuery = {} as FakeQuery;
    query.select = vi.fn(() => query);
    query.order = vi.fn(() => query);
    // Honours the range the service asks for, so a page is only ever short
    // because the rows ran out — which is the signal the walk terminates on.
    query.range = vi.fn((start: unknown, end: unknown) =>
      Promise.resolve({
        data: error ? null : rows.slice(start as number, (end as number) + 1),
        error,
      })
    );
    return query;
  }

  function mockListTables({
    rows = [
      candidate("PPL_EWE", ["GHA", "TGO"]),
      candidate("PPL_SOLO", ["GHA"]),
      candidate("PPL_WIDE", ["GHA", "TGO", "BEN"]),
    ],
    error = null,
    countries = [
      { id: "GHA", name_fr: "Ghana" },
      { id: "TGO", name_fr: "Togo" },
      { id: "BEN", name_fr: "Bénin" },
    ],
    assertions = [],
  }: {
    rows?: Array<Record<string, unknown>>;
    error?: { message: string } | null;
    countries?: Array<Record<string, unknown>>;
    assertions?: Array<Record<string, unknown>>;
  } = {}) {
    const sweep = buildSweepQuery(rows, error);

    fromMock.mockImplementation((table: string) => {
      if (table === "afrik_peoples") return sweep;
      if (table === "afrik_countries") return buildCountriesQuery(countries);
      if (table === "assertions") return buildAssertionsQuery(assertions);
      throw new Error(`Unexpected table: ${table}`);
    });

    return sweep;
  }

  beforeEach(() => {
    fromMock.mockReset();
  });

  // @req REQ-091 FR90
  it("returns fragmentation only for candidates with >= 2 countries", async () => {
    mockListTables();

    const result = await listPeopleFragmentations();

    expect(result.map((f) => f.peopleId)).toEqual(["PPL_WIDE", "PPL_EWE"]);
  });

  /**
   * The defect: an unordered `limit 50` over 803 peoples, roughly half of
   * which span one country, returned whichever ~19 fragmented peoples the
   * planner happened to hand back. A fragmented people sitting past the
   * limit-th row was simply never seen.
   */
  // @req REQ-091 FR90
  it("finds a fragmented people that sits past the requested count", async () => {
    mockListTables({
      rows: [
        candidate("PPL_A", ["GHA"]),
        candidate("PPL_B", ["GHA"]),
        candidate("PPL_C", ["GHA", "TGO"]),
      ],
    });

    const result = await listPeopleFragmentations(1);

    expect(result.map((f) => f.peopleId)).toEqual(["PPL_C"]);
  });

  // An index *of* fragmentation is ordered by fragmentation; ties break on
  // id so two renders of one corpus agree.
  // @req REQ-091 FR90
  it("ranks the most fragmented first and breaks ties on id", async () => {
    mockListTables({
      rows: [
        candidate("PPL_ZED", ["GHA", "TGO"]),
        candidate("PPL_ABLE", ["GHA", "TGO"]),
        candidate("PPL_WIDE", ["GHA", "TGO", "BEN"]),
      ],
    });

    const result = await listPeopleFragmentations();

    expect(result.map((f) => f.peopleId)).toEqual([
      "PPL_WIDE",
      "PPL_ABLE",
      "PPL_ZED",
    ]);
  });

  // @req REQ-091 FR90
  it("caps the number of fragmentations it returns", async () => {
    mockListTables();

    const result = await listPeopleFragmentations(1);

    expect(result).toHaveLength(1);
  });

  /**
   * The performance defect, stated as a count: the old sweep spent three
   * queries per candidate (people row, countries, assertions). Nothing about
   * the number of candidates may move the number of round trips.
   */
  // @req REQ-091 FR90
  it("costs the same number of queries whatever the corpus size", async () => {
    mockListTables({
      rows: Array.from({ length: 40 }, (_unused, index) =>
        candidate(`PPL_${String(index).padStart(3, "0")}`, ["GHA", "TGO"])
      ),
    });

    await listPeopleFragmentations();

    const calledTables = fromMock.mock.calls.map((call) => call[0]);
    expect(calledTables.filter((t) => t === "afrik_peoples")).toHaveLength(1);
    expect(calledTables.filter((t) => t === "afrik_countries")).toHaveLength(1);
    expect(calledTables.filter((t) => t === "assertions")).toHaveLength(1);
  });

  /**
   * An unranged select is truncated server-side at 1000 rows without saying
   * so, which would silently drop the tail of a growing corpus.
   */
  // @req REQ-091 FR90
  it("pages the sweep rather than trusting one unranged select", async () => {
    // One full page plus one row: a corpus that ends exactly on a page
    // boundary would let a single-shot read pass by luck.
    const rows = Array.from({ length: CANDIDATE_PAGE_SIZE + 1 }, (_u, index) =>
      candidate(`PPL_${String(index).padStart(4, "0")}`, ["GHA", "TGO"])
    );
    const sweep = mockListTables({ rows });

    const result = await listPeopleFragmentations(CANDIDATE_PAGE_SIZE + 1);

    expect(sweep.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(sweep.range.mock.calls.length).toBe(2);
    // The row past the first page is in the result, not silently dropped.
    expect(result).toHaveLength(CANDIDATE_PAGE_SIZE + 1);
    expect(result.map((f) => f.peopleId)).toContain(
      `PPL_${String(CANDIDATE_PAGE_SIZE).padStart(4, "0")}`
    );
  });

  // @req REQ-091 FR90
  it("resolves country names and assertion ids for every people in one pass", async () => {
    mockListTables({
      rows: [
        candidate("PPL_EWE", ["GHA", "TGO"]),
        candidate("PPL_OTHER", ["GHA", "BEN"]),
      ],
      assertions: [
        {
          id: "aaaaaaaa-1111-1111-1111-111111111111",
          entity_id: "PPL_OTHER",
          statement: "BEN",
        },
      ],
    });

    const result = await listPeopleFragmentations();
    const other = result.find((f) => f.peopleId === "PPL_OTHER");
    const ewe = result.find((f) => f.peopleId === "PPL_EWE");

    expect(other?.countries.map((c) => c.nameFr)).toEqual(["Ghana", "Bénin"]);
    expect(other?.countries.find((c) => c.iso3 === "BEN")?.assertionId).toBe(
      "aaaaaaaa-1111-1111-1111-111111111111"
    );
    // One people's assertion never leaks onto another's country.
    expect(ewe?.countries.every((c) => c.assertionId === null)).toBe(true);
  });

  // @req REQ-091 FR90
  it("returns an empty array when the sweep errors", async () => {
    mockListTables({ error: { message: "boom" } });

    const result = await listPeopleFragmentations();

    expect(result).toEqual([]);
  });

  // Nothing fragmented means nothing to look up: no country or assertion
  // query is worth issuing for an empty page.
  // @req REQ-091 FR90
  it("issues no follow-up query when no people is fragmented", async () => {
    mockListTables({ rows: [candidate("PPL_SOLO", ["GHA"])] });

    const result = await listPeopleFragmentations();

    expect(result).toEqual([]);
    const calledTables = fromMock.mock.calls.map((call) => call[0]);
    expect(calledTables).not.toContain("afrik_countries");
    expect(calledTables).not.toContain("assertions");
  });
});
