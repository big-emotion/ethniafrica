/**
 * Test-first: patronyme dossier service (ETNI-1462, REQ-133).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { getPatronymeById, listPatronymes } from "../patronymes";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

function buildMaybeSingleQuery(row: Record<string, unknown> | null): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: null }));
  return query;
}

/** `afrik_patronymes` answers both the fiche row and the allied names lookup. */
function buildPatronymeQuery(
  row: Record<string, unknown> | null,
  alliedRows: Array<Record<string, unknown>>
): FakeQuery {
  const query = buildMaybeSingleQuery(row);
  query.in = vi.fn(() => Promise.resolve({ data: alliedRows, error: null }));
  return query;
}

function buildInQuery(
  rows: Array<Record<string, unknown>>,
  error: { message: string } | null = null
): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => Promise.resolve({ data: rows, error }));
  query.in = vi.fn(() => Promise.resolve({ data: rows, error }));
  return query;
}

const patronymeRow = {
  id: "PAT_KEITA",
  name_system: "clan_name",
  caste_or_social_function: "horon",
  content: { nameMain: "Keita" },
};

function makeBearerRow(n: number) {
  return {
    id: `PER_BEARER_${n}`,
    full_name: `Bearer ${n}`,
    role_category: "author",
  };
}

function makePeopleRow(n: number) {
  return {
    id: `PPL_TEST_${n}`,
    name_main: `People ${n}`,
    content: { appellations: { selfAppellation: `Auto ${n}` } },
  };
}

function mockTables({
  patronyme = patronymeRow,
  patronymePeoples = [{ patronyme_id: "PAT_KEITA", people_id: "PPL_TEST_1" }],
  peoples = [makePeopleRow(1)],
  patronymeCountries = [{ patronyme_id: "PAT_KEITA", country_id: "MLI" }],
  countries = [{ id: "MLI", name_fr: "Mali" }],
  patronymePersons = [{ patronyme_id: "PAT_KEITA", person_id: "PER_BEARER_1" }],
  persons = [makeBearerRow(1)],
  alliedPatronymes = [],
}: {
  patronyme?: Record<string, unknown> | null;
  alliedPatronymes?: Array<Record<string, unknown>>;
  patronymePeoples?: Array<Record<string, unknown>>;
  peoples?: Array<Record<string, unknown>>;
  patronymeCountries?: Array<Record<string, unknown>>;
  countries?: Array<Record<string, unknown>>;
  patronymePersons?: Array<Record<string, unknown>>;
  persons?: Array<Record<string, unknown>>;
} = {}) {
  fromMock.mockImplementation((table: string) => {
    if (table === "afrik_patronymes")
      return buildPatronymeQuery(patronyme, alliedPatronymes);
    if (table === "afrik_patronyme_peoples")
      return buildInQuery(patronymePeoples);
    if (table === "afrik_peoples") return buildInQuery(peoples);
    if (table === "afrik_patronyme_countries")
      return buildInQuery(patronymeCountries);
    if (table === "afrik_countries") return buildInQuery(countries);
    if (table === "afrik_patronyme_persons")
      return buildInQuery(patronymePersons);
    if (table === "persons") return buildInQuery(persons);
    throw new Error(`Unexpected table: ${table}`);
  });
}

describe("patronymes service — getPatronymeById", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  // @req REQ-133
  it("returns the aggregate with real columns pulled to the top level", async () => {
    mockTables();

    const result = await getPatronymeById("PAT_KEITA");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("PAT_KEITA");
    expect(result?.nameMain).toBe("Keita");
    expect(result?.nameSystem).toBe("clan_name");
    expect(result?.casteOrSocialFunction).toBe("horon");
    expect(result?.content).toEqual({ nameMain: "Keita" });
  });

  // @req REQ-133
  it("returns associated peoples via the join table", async () => {
    mockTables();

    const result = await getPatronymeById("PAT_KEITA");

    expect(result?.associatedPeoples).toEqual([
      {
        id: "PPL_TEST_1",
        nameMain: "People 1",
        autonym: "Auto 1",
        slug: "PPL_TEST_1",
      },
    ]);
  });

  // @req REQ-133
  it("returns associated countries via the join table", async () => {
    mockTables();

    const result = await getPatronymeById("PAT_KEITA");

    expect(result?.associatedCountries).toEqual([
      { id: "MLI", nameFr: "Mali" },
    ]);
  });

  // @req REQ-133
  it("returns bearers via the join table, one summary per person", async () => {
    mockTables();

    const result = await getPatronymeById("PAT_KEITA");

    expect(result?.bearers).toEqual([
      { id: "PER_BEARER_1", fullName: "Bearer 1", roleCategory: "author" },
    ]);
  });

  // @req REQ-133
  it("never includes a peopleLinks, countryIds or content field on a bearer (DEC-040)", async () => {
    mockTables();

    const result = await getPatronymeById("PAT_KEITA");
    const bearer = result?.bearers[0] as unknown as Record<string, unknown>;

    expect(bearer).not.toHaveProperty("peopleLinks");
    expect(bearer).not.toHaveProperty("countryIds");
    expect(bearer).not.toHaveProperty("content");
    expect(Object.keys(bearer).sort()).toEqual([
      "fullName",
      "id",
      "roleCategory",
    ]);
  });

  // @req REQ-133
  it("resolves each declared alliance to the allied name, in the dossier's order", async () => {
    mockTables({
      patronyme: {
        ...patronymeRow,
        content: {
          nameMain: "Keita",
          alliances: [
            { targetPatronymeId: "PAT_COULIBALY", allianceType: "sanankuya" },
            { targetPatronymeId: "PAT_FOFANA", allianceType: null },
          ],
        },
      },
      alliedPatronymes: [
        { id: "PAT_FOFANA", name_main: "Fofana" },
        { id: "PAT_COULIBALY", name_main: "Coulibaly" },
      ],
    });

    const result = await getPatronymeById("PAT_KEITA");

    expect(result?.alliances).toEqual([
      {
        targetId: "PAT_COULIBALY",
        targetNameMain: "Coulibaly",
        allianceType: "sanankuya",
      },
      { targetId: "PAT_FOFANA", targetNameMain: "Fofana", allianceType: null },
    ]);
  });

  // A dossier can cite a name whose row has not been loaded yet; the fiche
  // must then show nothing for it rather than the raw identifier.
  // @req REQ-133
  it("drops an alliance whose target the database does not hold", async () => {
    mockTables({
      patronyme: {
        ...patronymeRow,
        content: {
          nameMain: "Keita",
          alliances: [
            { targetPatronymeId: "PAT_NOT_LOADED", allianceType: "sanankuya" },
          ],
        },
      },
      alliedPatronymes: [],
    });

    const result = await getPatronymeById("PAT_KEITA");

    expect(result?.alliances).toEqual([]);
  });

  // @req REQ-133
  it("returns an empty alliances list without a lookup when the dossier declares none", async () => {
    mockTables();

    const result = await getPatronymeById("PAT_KEITA");

    expect(result?.alliances).toEqual([]);
  });

  // @req REQ-133
  it("returns null for an unknown patronyme id without querying any relation", async () => {
    mockTables({ patronyme: null });

    const result = await getPatronymeById("PAT_UNKNOWN");

    expect(result).toBeNull();
    const calledTables = fromMock.mock.calls.map((call) => call[0]);
    expect(calledTables).toEqual(["afrik_patronymes"]);
  });

  // @req REQ-133
  it("returns empty arrays when a name has no peoples, countries or bearers", async () => {
    mockTables({
      patronymePeoples: [],
      peoples: [],
      patronymeCountries: [],
      countries: [],
      patronymePersons: [],
      persons: [],
    });

    const result = await getPatronymeById("PAT_KEITA");

    expect(result?.associatedPeoples).toEqual([]);
    expect(result?.associatedCountries).toEqual([]);
    expect(result?.bearers).toEqual([]);
  });

  // AC1: fifty bearers, six associated peoples — assembled without one query per row.
  // @req REQ-133
  it("batches fifty bearers and six associated peoples in a fixed number of queries (AC1, no N+1)", async () => {
    const bearerLinks = Array.from({ length: 50 }, (_, i) => ({
      patronyme_id: "PAT_KEITA",
      person_id: `PER_BEARER_${i}`,
    }));
    const bearerRows = Array.from({ length: 50 }, (_, i) => makeBearerRow(i));
    const peopleLinks = Array.from({ length: 6 }, (_, i) => ({
      patronyme_id: "PAT_KEITA",
      people_id: `PPL_TEST_${i}`,
    }));
    const peopleRows = Array.from({ length: 6 }, (_, i) => makePeopleRow(i));

    mockTables({
      patronymePersons: bearerLinks,
      persons: bearerRows,
      patronymePeoples: peopleLinks,
      peoples: peopleRows,
    });

    const result = await getPatronymeById("PAT_KEITA");

    expect(result?.bearers).toHaveLength(50);
    expect(result?.associatedPeoples).toHaveLength(6);

    const calledTables = fromMock.mock.calls.map((call) => call[0]);
    expect(calledTables.filter((t) => t === "afrik_patronymes")).toHaveLength(
      1
    );
    expect(
      calledTables.filter((t) => t === "afrik_patronyme_peoples")
    ).toHaveLength(1);
    expect(calledTables.filter((t) => t === "afrik_peoples")).toHaveLength(1);
    expect(
      calledTables.filter((t) => t === "afrik_patronyme_countries")
    ).toHaveLength(1);
    expect(calledTables.filter((t) => t === "afrik_countries")).toHaveLength(1);
    expect(
      calledTables.filter((t) => t === "afrik_patronyme_persons")
    ).toHaveLength(1);
    expect(calledTables.filter((t) => t === "persons")).toHaveLength(1);
    expect(calledTables).toHaveLength(7);
  });
});

// ETNI-1799: the index-row query behind the (separately owned) /atlas/noms
// page. Deliberately paginated even though the corpus holds 30 rows today —
// ETNI-1461 treats that as a first tranche, not a ceiling.
describe("patronymes service — listPatronymes", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  function buildListQuery(
    rows: Array<Record<string, unknown>>,
    count: number | null
  ): FakeQuery {
    const query: FakeQuery = {} as FakeQuery;
    query.select = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn(() =>
      Promise.resolve({ data: rows, error: null, count })
    );
    return query;
  }

  // @req REQ-133
  it("returns a page of index rows shaped for a fiche link", async () => {
    const query = buildListQuery(
      [
        {
          id: "PAT_KEITA",
          name_main: "Keita",
          name_system: "clan_name",
        },
        {
          id: "PAT_DIALLO",
          name_main: "Diallo",
          name_system: "patronym",
        },
      ],
      2
    );
    fromMock.mockReturnValue(query);

    const result = await listPatronymes({ page: 1, perPage: 20 });

    expect(fromMock).toHaveBeenCalledWith("afrik_patronymes");
    // `name_main` rather than the `content` JSONB the name also sits in: the
    // list keeps one string per row and the dossier body is 52 KB of it.
    expect(query.select).toHaveBeenCalledWith("id, name_main, name_system", {
      count: "exact",
    });
    expect(result.data).toEqual([
      { id: "PAT_KEITA", nameMain: "Keita", nameSystem: "clan_name" },
      { id: "PAT_DIALLO", nameMain: "Diallo", nameSystem: "patronym" },
    ]);
    expect(result.total).toBe(2);
  });

  // @req REQ-133
  it("turns the page and perPage params into a zero-based range offset", async () => {
    const query = buildListQuery([], 45);
    fromMock.mockReturnValue(query);

    await listPatronymes({ page: 3, perPage: 10 });

    expect(query.range).toHaveBeenCalledWith(20, 29);
  });

  // @req REQ-133
  it("uses the default first-page range when called with page 1", async () => {
    const query = buildListQuery([], 30);
    fromMock.mockReturnValue(query);

    await listPatronymes({ page: 1, perPage: 20 });

    expect(query.range).toHaveBeenCalledWith(0, 19);
  });

  // @req REQ-133
  it("throws a clear error when the Supabase query fails", async () => {
    const query: FakeQuery = {} as FakeQuery;
    query.select = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn(() =>
      Promise.resolve({
        data: null,
        error: { message: "connection reset" },
        count: null,
      })
    );
    fromMock.mockReturnValue(query);

    await expect(listPatronymes({ page: 1, perPage: 20 })).rejects.toThrow(
      "Failed to list patronymes: connection reset"
    );
  });

  // @req REQ-133
  it("returns a total from which the caller can derive an exact page count", async () => {
    const query = buildListQuery([], 45);
    fromMock.mockReturnValue(query);

    const result = await listPatronymes({ page: 1, perPage: 20 });

    expect(result.total).toBe(45);
    expect(Math.ceil(result.total / 20)).toBe(3);
  });

  // @req REQ-133
  it("queries only afrik_patronymes — never the peoples/countries/bearers join tables", async () => {
    const query = buildListQuery(
      [
        {
          id: "PAT_KEITA",
          content: { nameMain: "Keita" },
          name_system: "clan_name",
        },
      ],
      1
    );
    fromMock.mockReturnValue(query);

    await listPatronymes({ page: 1, perPage: 20 });

    const calledTables = fromMock.mock.calls.map((call) => call[0]);
    expect(calledTables).toEqual(["afrik_patronymes"]);
    expect(calledTables).not.toContain("afrik_patronyme_peoples");
    expect(calledTables).not.toContain("afrik_patronyme_countries");
    expect(calledTables).not.toContain("afrik_patronyme_persons");
  });

  // @req REQ-133
  it("falls back to the returned row count when Supabase omits the exact count", async () => {
    const query = buildListQuery(
      [
        {
          id: "PAT_KEITA",
          content: { nameMain: "Keita" },
          name_system: "clan_name",
        },
      ],
      null
    );
    fromMock.mockReturnValue(query);

    const result = await listPatronymes({ page: 1, perPage: 20 });

    expect(result.total).toBe(1);
  });
});
