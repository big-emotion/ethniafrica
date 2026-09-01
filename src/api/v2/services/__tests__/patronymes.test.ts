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

import { getPatronymeById } from "../patronymes";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

function buildMaybeSingleQuery(row: Record<string, unknown> | null): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: null }));
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
}: {
  patronyme?: Record<string, unknown> | null;
  patronymePeoples?: Array<Record<string, unknown>>;
  peoples?: Array<Record<string, unknown>>;
  patronymeCountries?: Array<Record<string, unknown>>;
  countries?: Array<Record<string, unknown>>;
  patronymePersons?: Array<Record<string, unknown>>;
  persons?: Array<Record<string, unknown>>;
} = {}) {
  fromMock.mockImplementation((table: string) => {
    if (table === "afrik_patronymes") return buildMaybeSingleQuery(patronyme);
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
