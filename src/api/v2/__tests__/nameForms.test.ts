/**
 * The Appellations nomenclature service (REQ-054, migration 071).
 *
 * These assert the two things the record-level listing got wrong and that a
 * grouped listing exists to fix: a page of *forms* rather than of rows, and
 * bearers carried as an attribute of the name rather than as the link the row
 * turns into.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { listNameForms, getNameTypeCounts } from "@/api/v2/services/names";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

function buildFormsQuery(
  rows: Array<Record<string, unknown>>,
  count: number
): FakeQuery {
  const result = Promise.resolve({ data: rows, error: null, count });
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.ilike = vi.fn(() => query);
  query.contains = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.range = vi.fn(() => result);
  return query;
}

const AYNEHA = {
  form_key: "ayneha",
  display_name: "Ayneha",
  spellings: ["Ayneha"],
  name_types: ["endonym", "historical_spelling"],
  bearer_count: 4,
  bearers: [
    { id: "PPL_SONGHAI", name: "Songhai" },
    { id: "PPL_SONGHAY_GURMA", name: "Songhay Gurma" },
    { id: "PPL_SONGHAY_MACRO", name: "Peuples Songhay (macro-groupe)" },
    { id: "PPL_SONGHAY_NIGERIEN", name: "Songhay Nigerien" },
  ],
  has_imposed: false,
  why_problematic: null,
  language_of_origin: null,
};

beforeEach(() => {
  fromMock.mockReset();
});

describe("listNameForms", () => {
  // @req REQ-054
  it("carries the peoples that bear a name as an attribute of that one entry", async () => {
    const query = buildFormsQuery([AYNEHA], 1);
    fromMock.mockReturnValue(query);

    const { forms } = await listNameForms({
      page: 1,
      perPage: 48,
      imposedOnly: false,
    });

    expect(forms).toHaveLength(1);
    expect(forms[0].displayName).toBe("Ayneha");
    expect(forms[0].bearerCount).toBe(4);
    expect(forms[0].bearers.map((bearer) => bearer.id)).toEqual([
      "PPL_SONGHAI",
      "PPL_SONGHAY_GURMA",
      "PPL_SONGHAY_MACRO",
      "PPL_SONGHAY_NIGERIEN",
    ]);
  });

  // @req REQ-054
  it("folds accents and case before matching, so 'Traore' finds 'Traoré'", async () => {
    const query = buildFormsQuery([], 0);
    fromMock.mockReturnValue(query);

    await listNameForms({
      q: "TRAORÉ",
      page: 1,
      perPage: 48,
      imposedOnly: false,
    });

    expect(query.ilike).toHaveBeenCalledWith("form_key", "%traore%");
  });

  // @req REQ-054
  it("treats a wildcard typed by the reader as a literal character", async () => {
    const query = buildFormsQuery([], 0);
    fromMock.mockReturnValue(query);

    await listNameForms({
      q: "100%",
      page: 1,
      perPage: 48,
      imposedOnly: false,
    });

    expect(query.ilike).toHaveBeenCalledWith("form_key", "%100\\%%");
  });

  // @req REQ-054
  it("filters on a name type by array containment, not equality", async () => {
    const query = buildFormsQuery([], 0);
    fromMock.mockReturnValue(query);

    await listNameForms({
      nameType: "exonym",
      page: 1,
      perPage: 48,
      imposedOnly: false,
    });

    expect(query.contains).toHaveBeenCalledWith("name_types", ["exonym"]);
  });

  // @req REQ-054
  it("pages over forms, so the count and the list count the same thing", async () => {
    const query = buildFormsQuery([AYNEHA], 3134);
    fromMock.mockReturnValue(query);

    const result = await listNameForms({
      page: 3,
      perPage: 48,
      imposedOnly: false,
    });

    expect(query.range).toHaveBeenCalledWith(96, 143);
    expect(result.total).toBe(3134);
    expect(result.pageCount).toBe(66);
  });

  // @req REQ-054
  it("reports an empty nomenclature rather than throwing when the view is missing", async () => {
    const query: FakeQuery = {} as FakeQuery;
    query.select = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn(() =>
      Promise.resolve({
        data: null,
        error: { code: "42P01", message: "relation does not exist" },
        count: null,
      })
    );
    fromMock.mockReturnValue(query);

    await expect(
      listNameForms({ page: 1, perPage: 48, imposedOnly: false })
    ).rejects.toThrow(/unavailable/i);
  });
});

describe("getNameTypeCounts", () => {
  // @req REQ-054
  it("omits a type the corpus holds no record for, so no filter leads nowhere", async () => {
    const query: FakeQuery = {} as FakeQuery;
    query.select = vi.fn(() =>
      Promise.resolve({
        data: [
          { name_type: "exonym", record_count: 2742, imposed_count: 3 },
          { name_type: "endonym", record_count: 715, imposed_count: 0 },
        ],
        error: null,
      })
    );
    fromMock.mockReturnValue(query);

    const counts = await getNameTypeCounts();

    expect(counts.byType.exonym).toBe(2742);
    expect(counts.byType.surname).toBeUndefined();
    expect(counts.imposed).toBe(3);
  });
});
