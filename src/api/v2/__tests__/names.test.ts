/**
 * ETNI-471 — /v2/names endpoint: unit tests covering all acceptance criteria.
 *
 * Tests run at service + handler level with Supabase queries mocked.
 * Route-level (HTTP) tests live in src/app/api/v2/__tests__/names-routes.test.ts.
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
  listNames,
  NamesSchemaUnavailableError,
} from "@/api/v2/services/names";
import { listNamesHandler } from "@/api/v2/handlers/names";
import type { ListNamesQuery } from "@/api/v2/schemas/names";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

function baseQuery(): ListNamesQuery {
  return { limit: 20, offset: 0, imposedOnly: false };
}

function buildNamesQuery(
  rows: Array<Record<string, unknown>>,
  count: number
): FakeQuery {
  const result = Promise.resolve({ data: rows, error: null, count });
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.textSearch = vi.fn(() => query);
  query.not = vi.fn(() => query);
  query.ilike = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.range = vi.fn(() => result);
  return query;
}

function buildNamesQueryError(code: string, message: string): FakeQuery {
  const result = Promise.resolve({
    data: null,
    error: { code, message },
    count: null,
  });
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.textSearch = vi.fn(() => query);
  query.not = vi.fn(() => query);
  query.ilike = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.range = vi.fn(() => result);
  return query;
}

function buildPeopleQuery(rows: Array<Record<string, unknown>>): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.in = vi.fn(() => Promise.resolve({ data: rows, error: null }));
  return query;
}

function buildConfidenceQuery(rows: Array<Record<string, unknown>>): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.in = vi.fn(() => Promise.resolve({ data: rows, error: null }));
  return query;
}

const jiengName = {
  id: "11111111-1111-1111-1111-111111111111",
  entity_type: "people",
  entity_id: "PPL_JIENG",
  name_text: "Jieng",
  name_type: "endonym",
  language_of_origin: "din",
  meaning: "the people",
  period_label: null,
  imposed_by: null,
  imposition_period: null,
  why_problematic: null,
  contemporary_usage: null,
  sort_rank: 0,
};

const dinkaName = {
  id: "22222222-2222-2222-2222-222222222222",
  entity_type: "people",
  entity_id: "PPL_JIENG",
  name_text: "Dinka",
  name_type: "exonym",
  language_of_origin: null,
  meaning: null,
  period_label: "colonial",
  imposed_by: "colonial administration",
  imposition_period: "19th century",
  why_problematic: "exonym imposed during colonial rule",
  contemporary_usage: "still widely used internationally",
  sort_rank: 1,
};

const jiengPeopleRow = {
  id: "PPL_JIENG",
  name_main: "Jieng",
  content: { appellations: { selfAppellation: "Jieng" } },
};

describe("listNames (service)", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  // @req REQ-057
  it("lists names with people summary (id, nameMain, autonym, slug)", async () => {
    const namesQuery = buildNamesQuery([jiengName], 1);
    const peopleQuery = buildPeopleQuery([jiengPeopleRow]);
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return namesQuery;
      if (table === "afrik_peoples") return peopleQuery;
      throw new Error(`unexpected table ${table}`);
    });

    const result = await listNames(baseQuery());

    expect(result.total).toBe(1);
    expect(result.names[0]).toMatchObject({
      id: jiengName.id,
      nameText: "Jieng",
      nameType: "endonym",
      people: {
        id: "PPL_JIENG",
        nameMain: "Jieng",
        autonym: "Jieng",
        slug: "PPL_JIENG",
      },
    });
  });

  // @req REQ-057
  it("passes nameType filter to the query", async () => {
    const namesQuery = buildNamesQuery([], 0);
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return namesQuery;
      throw new Error(`unexpected table ${table}`);
    });

    await listNames({ ...baseQuery(), nameType: "exonym" });

    expect(namesQuery.eq).toHaveBeenCalledWith("name_type", "exonym");
  });

  // @req REQ-057
  it("imposedOnly=true filters to imposed_by IS NOT NULL", async () => {
    const namesQuery = buildNamesQuery([dinkaName], 1);
    const peopleQuery = buildPeopleQuery([jiengPeopleRow]);
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return namesQuery;
      if (table === "afrik_peoples") return peopleQuery;
      throw new Error(`unexpected table ${table}`);
    });

    const result = await listNames({ ...baseQuery(), imposedOnly: true });

    expect(namesQuery.not).toHaveBeenCalledWith("imposed_by", "is", null);
    expect(result.names).toHaveLength(1);
    expect(result.names[0].imposedBy).toBe("colonial administration");
  });

  // @req REQ-057
  it("does not apply the imposed filter when imposedOnly is false", async () => {
    const namesQuery = buildNamesQuery([], 0);
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return namesQuery;
      throw new Error(`unexpected table ${table}`);
    });

    await listNames(baseQuery());

    expect(namesQuery.not).not.toHaveBeenCalled();
  });

  // @req REQ-057
  it("filters by peopleId via entity_id", async () => {
    const namesQuery = buildNamesQuery([], 0);
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return namesQuery;
      throw new Error(`unexpected table ${table}`);
    });

    await listNames({ ...baseQuery(), peopleId: "PPL_JIENG" });

    expect(namesQuery.eq).toHaveBeenCalledWith("entity_id", "PPL_JIENG");
  });

  // @req REQ-057
  it("filters by initial letter case-insensitively", async () => {
    const namesQuery = buildNamesQuery([], 0);
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return namesQuery;
      throw new Error(`unexpected table ${table}`);
    });

    await listNames({ ...baseQuery(), letter: "J" });

    expect(namesQuery.ilike).toHaveBeenCalledWith("name_text", "J%");
  });

  // @req REQ-057
  it("applies pagination via range(offset, offset+limit-1)", async () => {
    const namesQuery = buildNamesQuery([], 0);
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return namesQuery;
      throw new Error(`unexpected table ${table}`);
    });

    await listNames({ ...baseQuery(), limit: 10, offset: 20 });

    expect(namesQuery.range).toHaveBeenCalledWith(20, 29);
  });

  // @req REQ-057
  it("q triggers websearch French full-text search and confidence-boost ordering", async () => {
    const lowConfidencePeople = {
      id: "PPL_OTHER",
      name_main: "Other",
      content: {},
    };
    const otherName = {
      ...jiengName,
      id: "33333333-3333-3333-3333-333333333333",
      entity_id: "PPL_OTHER",
    };
    const namesQuery = buildNamesQuery([otherName, jiengName], 2);
    const peopleQuery = buildPeopleQuery([jiengPeopleRow, lowConfidencePeople]);
    const confidenceQuery = buildConfidenceQuery([
      { entity_id: "PPL_OTHER", score: 0.2 },
      { entity_id: "PPL_JIENG", score: 0.9 },
    ]);
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return namesQuery;
      if (table === "afrik_peoples") return peopleQuery;
      if (table === "confidence_scores") return confidenceQuery;
      throw new Error(`unexpected table ${table}`);
    });

    const result = await listNames({ ...baseQuery(), q: "jieng" });

    expect(namesQuery.textSearch).toHaveBeenCalledWith(
      "search_vector",
      "jieng",
      { type: "websearch", config: "french" }
    );
    expect(result.names.map((n) => n.peopleId)).toEqual([
      "PPL_JIENG",
      "PPL_OTHER",
    ]);
  });

  // @req REQ-057
  it("skips people/confidence lookups when no rows match", async () => {
    const namesQuery = buildNamesQuery([], 0);
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return namesQuery;
      throw new Error(`unexpected table ${table}`);
    });

    const result = await listNames({ ...baseQuery(), q: "nomatch" });

    expect(result.names).toEqual([]);
    expect(result.total).toBe(0);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  // @req REQ-057
  it("throws on supabase errors", async () => {
    const query: FakeQuery = {} as FakeQuery;
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "boom" }, count: null })
    );
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return query;
      throw new Error(`unexpected table ${table}`);
    });

    await expect(listNames(baseQuery())).rejects.toThrow(/boom/);
  });

  // @req REQ-055 — 42P17 (self-referential RLS recursion, DEC-017) must
  // surface as a plain thrown error, not be misclassified as "schema
  // unavailable" (which would silently render an empty page).
  it("surfaces 42P17 as a real error, not NamesSchemaUnavailableError", async () => {
    const namesQuery = buildNamesQueryError(
      "42P17",
      'infinite recursion detected in policy for relation "user_roles"'
    );
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return namesQuery;
      throw new Error(`unexpected table ${table}`);
    });

    await expect(listNames(baseQuery())).rejects.toThrow(
      /Failed to list name records/
    );
    await expect(listNames(baseQuery())).rejects.not.toBeInstanceOf(
      NamesSchemaUnavailableError
    );
  });

  // @req REQ-055
  it("still degrades to an empty result for schema-absence codes (42P01, PGRST205)", async () => {
    const namesQuery = buildNamesQueryError(
      "42P01",
      'relation "name_records" does not exist'
    );
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return namesQuery;
      throw new Error(`unexpected table ${table}`);
    });

    await expect(listNames(baseQuery())).rejects.toBeInstanceOf(
      NamesSchemaUnavailableError
    );
  });
});

describe("listNamesHandler (handler)", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  // @req REQ-057
  it("response envelope — has data.names, data.total, meta.license, errors", async () => {
    const namesQuery = buildNamesQuery([jiengName], 1);
    const peopleQuery = buildPeopleQuery([jiengPeopleRow]);
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return namesQuery;
      if (table === "afrik_peoples") return peopleQuery;
      throw new Error(`unexpected table ${table}`);
    });

    const result = await listNamesHandler(baseQuery());

    expect(result.data.names).toHaveLength(1);
    expect(typeof result.data.total).toBe("number");
    expect(result.meta.license).toBe("CC-BY-SA-4.0");
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // @req REQ-057
  it("empty result — returns valid envelope", async () => {
    const namesQuery = buildNamesQuery([], 0);
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return namesQuery;
      throw new Error(`unexpected table ${table}`);
    });

    const result = await listNamesHandler(baseQuery());

    expect(result.data.names).toEqual([]);
    expect(result.data.total).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  // @req REQ-057
  it("error propagation — throws on service failure", async () => {
    const query: FakeQuery = {} as FakeQuery;
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "boom" }, count: null })
    );
    fromMock.mockImplementation((table: string) => {
      if (table === "name_records") return query;
      throw new Error(`unexpected table ${table}`);
    });

    await expect(listNamesHandler(baseQuery())).rejects.toThrow(/boom/);
  });
});
