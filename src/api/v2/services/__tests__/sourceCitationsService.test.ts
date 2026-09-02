import { describe, it, expect, vi, beforeEach } from "vitest";

import type { People } from "@/types/afrik";

const fromMock = vi.fn();
const getPeoplesByIdsMock = vi.fn();
const getCountryIndexMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/api/v2/services/peopleService", () => ({
  getPeoplesByIds: (...args: unknown[]) => getPeoplesByIdsMock(...args),
}));

vi.mock("@/api/v2/services/countryService", () => ({
  getCountryIndex: () => getCountryIndexMock(),
}));

import { getSourceCitations } from "../sourceCitations";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

const SOURCE_ID = "11111111-1111-1111-1111-111111111111";

/** The head count: `select(..., { head: true })` resolves without rows. */
function buildCountQuery(count: number): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.contains = vi.fn(() => Promise.resolve({ count, error: null }));
  return query;
}

function buildRowsQuery(rows: Array<Record<string, unknown>>): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.contains = vi.fn(() => query);
  query.limit = vi.fn(() => Promise.resolve({ data: rows, error: null }));
  return query;
}

describe("getSourceCitations", () => {
  beforeEach(() => {
    fromMock.mockReset();
    getPeoplesByIdsMock.mockReset().mockResolvedValue([]);
    getCountryIndexMock.mockReset().mockResolvedValue([]);
  });

  /**
   * `source_ids` is a UUID[] with no foreign key, so PostgREST cannot embed it
   * and array containment is the only path back from a source to the fiches
   * citing it. Reaching for a text operator on an array column is the mistake
   * this pins down: it would parse, and it would quietly match nothing.
   */
  // @req REQ-093
  it("walks the citation graph backwards with array containment", async () => {
    const count = buildCountQuery(0);
    const rows = buildRowsQuery([]);
    fromMock.mockReturnValueOnce(count).mockReturnValueOnce(rows);

    await getSourceCitations(SOURCE_ID);

    expect(fromMock).toHaveBeenCalledWith("assertions");
    expect(rows.contains).toHaveBeenCalledWith("source_ids", [SOURCE_ID]);
  });

  /**
   * 11 500 assertions must never be loaded to say how many cite one source.
   */
  // @req REQ-093
  it("counts with a head query rather than by loading the rows it counts", async () => {
    const count = buildCountQuery(48);
    const rows = buildRowsQuery([]);
    fromMock.mockReturnValueOnce(count).mockReturnValueOnce(rows);

    const result = await getSourceCitations(SOURCE_ID);

    expect(count.select).toHaveBeenCalledWith(
      "*",
      expect.objectContaining({ head: true, count: "exact" })
    );
    expect(result.total).toBe(48);
  });

  /**
   * A people carries about fourteen assertions and they all cite the same
   * fiche-level source list, so a source's citations are dozens of rows over
   * a handful of fiches. Listing the rows would read as dozens of citations
   * of the same thing.
   */
  // @req REQ-093
  it("folds a fiche's several assertions into one citation", async () => {
    const count = buildCountQuery(3);
    const rows = buildRowsQuery([
      { entity_type: "people", entity_id: "PPL_YORUBA" },
      { entity_type: "people", entity_id: "PPL_YORUBA" },
      { entity_type: "country", entity_id: "NGA" },
    ]);
    fromMock.mockReturnValueOnce(count).mockReturnValueOnce(rows);
    // `nameMain` is the field a People carries; typing this fixture against
    // the real interface is what stops it from inventing one that resolves to
    // undefined and leaves the identifier on screen.
    getPeoplesByIdsMock.mockResolvedValue([
      { id: "PPL_YORUBA", nameMain: "Yoruba" } as People,
    ]);
    getCountryIndexMock.mockResolvedValue([{ id: "NGA", nameFr: "Nigeria" }]);

    const result = await getSourceCitations(SOURCE_ID);

    expect(result.entities).toHaveLength(2);
    expect(result.entities[0]).toMatchObject({
      entityType: "people",
      entityId: "PPL_YORUBA",
      label: "Yoruba",
      assertionCount: 2,
    });
  });

  // @req REQ-093
  it("names the fiche rather than printing its identifier", async () => {
    const count = buildCountQuery(1);
    const rows = buildRowsQuery([{ entity_type: "country", entity_id: "NGA" }]);
    fromMock.mockReturnValueOnce(count).mockReturnValueOnce(rows);
    getCountryIndexMock.mockResolvedValue([{ id: "NGA", nameFr: "Nigeria" }]);

    const result = await getSourceCitations(SOURCE_ID);

    expect(result.entities[0].label).toBe("Nigeria");
    expect(result.entities[0].href).toContain("NGA");
  });

  /**
   * `assertions.entity_type` has no CHECK constraint, so a type this app does
   * not route is a live possibility rather than a hypothetical. It must read
   * as an entry with no link, never as a link that 404s.
   */
  // @req REQ-093
  it("leaves an unroutable entity type without a link", async () => {
    const count = buildCountQuery(1);
    const rows = buildRowsQuery([
      { entity_type: "oral_narrative", entity_id: "ORA_042" },
    ]);
    fromMock.mockReturnValueOnce(count).mockReturnValueOnce(rows);

    const result = await getSourceCitations(SOURCE_ID);

    expect(result.entities[0].href).toBeNull();
    expect(result.entities[0].label).toBe("ORA_042");
  });

  // @req REQ-093
  it("reports an empty graph rather than throwing when a source is cited by nothing", async () => {
    const count = buildCountQuery(0);
    const rows = buildRowsQuery([]);
    fromMock.mockReturnValueOnce(count).mockReturnValueOnce(rows);

    const result = await getSourceCitations(SOURCE_ID);

    expect(result).toEqual({ total: 0, entities: [], truncated: false });
  });
});
