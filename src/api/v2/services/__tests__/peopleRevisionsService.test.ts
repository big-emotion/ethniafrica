import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

import { listPeopleRevisions, getPeopleRevisionSnapshot } from "../revisions";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

const ENTITY_ID = "PPL_YORUBA";
const SNAPSHOT: Record<string, unknown> = {
  id: "PPL_YORUBA",
  name: "Yoruba",
  confidence: 0.92,
  demographics: { total_population: 45000000 },
};

function buildListQuery(
  rows: Record<string, unknown>[],
  error: { message: string } | null = null
): FakeQuery {
  const q: FakeQuery = {} as FakeQuery;
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.order = vi.fn(() => q);
  q.limit = vi.fn(() => q);
  q.lt = vi.fn(() => q);
  // Last call resolves the query
  const result = Promise.resolve({ data: error ? null : rows, error });
  // lt and limit are terminal — make them both return a thenable
  Object.defineProperty(q, "then", {
    get: () => result.then.bind(result),
  });
  q.limit = vi.fn(() => Promise.resolve({ data: error ? null : rows, error }));
  return q;
}

function buildSelectQuery(
  row: Record<string, unknown> | null,
  error: { message: string } | null = null
): FakeQuery {
  const q: FakeQuery = {} as FakeQuery;
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: error ? null : row, error })
  );
  return q;
}

describe("listPeopleRevisions", () => {
  beforeEach(() => fromMock.mockReset());

  it("returns items mapped from DB rows, no next_cursor when fewer than limit", async () => {
    const rows = [
      {
        version: 2,
        published_at: "2026-05-21T12:00:00.000Z",
        moderator_id: "aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb",
        reason: "Demographics update",
      },
      {
        version: 1,
        published_at: "2026-05-20T10:00:00.000Z",
        moderator_id: null,
        reason: null,
      },
    ];
    fromMock.mockReturnValue(buildListQuery(rows));

    const result = await listPeopleRevisions(ENTITY_ID, 20);

    expect(result.items).toHaveLength(2);
    expect(result.next_cursor).toBeNull();

    const first = result.items[0];
    expect(first.version).toBe(2);
    expect(first.published_at).toBe("2026-05-21T12:00:00.000Z");
    expect(first.moderator_pseudonym).toBe("mod-aaaabbbb");
    expect(first.reason).toBe("Demographics update");
    expect(first.pinned_url).toBe("/api/v2/peoples/PPL_YORUBA/versions/2");

    const second = result.items[1];
    expect(second.moderator_pseudonym).toBeNull();
  });

  it("sets next_cursor and trims results when DB returns limit+1 rows", async () => {
    // 3 rows returned for limit=2 → hasMore=true, next_cursor=version of 2nd item
    const rows = [
      { version: 5, published_at: null, moderator_id: null, reason: null },
      { version: 4, published_at: null, moderator_id: null, reason: null },
      { version: 3, published_at: null, moderator_id: null, reason: null }, // lookahead
    ];
    fromMock.mockReturnValue(buildListQuery(rows));

    const result = await listPeopleRevisions(ENTITY_ID, 2);

    expect(result.items).toHaveLength(2);
    expect(result.items[0].version).toBe(5);
    expect(result.items[1].version).toBe(4);
    expect(result.next_cursor).toBe(4);
  });

  it("derives a stable pseudonym from moderator_id", async () => {
    const rows = [
      {
        version: 1,
        published_at: null,
        moderator_id: "11112222-3333-4444-5555-666677778888",
        reason: null,
      },
    ];
    fromMock.mockReturnValue(buildListQuery(rows));

    const result = await listPeopleRevisions(ENTITY_ID, 20);
    expect(result.items[0].moderator_pseudonym).toBe("mod-11112222");
  });

  it("returns empty items and no cursor for an entity with no revisions", async () => {
    fromMock.mockReturnValue(buildListQuery([]));

    const result = await listPeopleRevisions(ENTITY_ID, 20);
    expect(result.items).toHaveLength(0);
    expect(result.next_cursor).toBeNull();
  });

  it("throws on DB error", async () => {
    const q: FakeQuery = {} as FakeQuery;
    q.select = vi.fn(() => q);
    q.eq = vi.fn(() => q);
    q.order = vi.fn(() => q);
    q.lt = vi.fn(() => q);
    q.limit = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "connection refused" } })
    );
    fromMock.mockReturnValue(q);

    await expect(listPeopleRevisions(ENTITY_ID, 20)).rejects.toThrow(
      /Failed to list revisions/
    );
  });
});

describe("getPeopleRevisionSnapshot", () => {
  beforeEach(() => fromMock.mockReset());

  it("returns the snapshot and reads confidence from snapshot_jsonb", async () => {
    const row = {
      version: 3,
      snapshot_jsonb: SNAPSHOT,
      published_at: "2026-05-21T10:00:00.000Z",
    };
    fromMock.mockReturnValue(buildSelectQuery(row));

    const result = await getPeopleRevisionSnapshot(ENTITY_ID, 3);

    expect(result).not.toBeNull();
    expect(result!.version).toBe(3);
    expect(result!.data).toEqual(SNAPSHOT);
    expect(result!.confidence).toBe(0.92);
    expect(result!.published_at).toBe("2026-05-21T10:00:00.000Z");
  });

  it("returns null confidence when snapshot has no confidence field", async () => {
    const row = {
      version: 1,
      snapshot_jsonb: { id: "PPL_YORUBA", name: "Yoruba" },
      published_at: null,
    };
    fromMock.mockReturnValue(buildSelectQuery(row));

    const result = await getPeopleRevisionSnapshot(ENTITY_ID, 1);
    expect(result!.confidence).toBeNull();
  });

  it("returns null when the version does not exist", async () => {
    fromMock.mockReturnValue(buildSelectQuery(null));

    const result = await getPeopleRevisionSnapshot(ENTITY_ID, 999);
    expect(result).toBeNull();
  });

  it("throws on DB error", async () => {
    const q: FakeQuery = {} as FakeQuery;
    q.select = vi.fn(() => q);
    q.eq = vi.fn(() => q);
    q.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "db error" } })
    );
    fromMock.mockReturnValue(q);

    await expect(getPeopleRevisionSnapshot(ENTITY_ID, 1)).rejects.toThrow(
      /Failed to load revision/
    );
  });

  it("never reads confidence from the live entity — data is snapshot-isolated", async () => {
    // The snapshot contains a stale confidence (0.42) that differs from what
    // a live entity query might return. The service must return 0.42.
    const staleSnapshot = { id: "PPL_YORUBA", confidence: 0.42 };
    const row = {
      version: 2,
      snapshot_jsonb: staleSnapshot,
      published_at: "2026-01-01T00:00:00.000Z",
    };
    fromMock.mockReturnValue(buildSelectQuery(row));

    const result = await getPeopleRevisionSnapshot(ENTITY_ID, 2);
    expect(result!.confidence).toBe(0.42);
    expect(result!.data).toEqual(staleSnapshot);
    // Confirm we queried revisions, not the live table
    expect(fromMock).toHaveBeenCalledWith("revisions");
  });
});
