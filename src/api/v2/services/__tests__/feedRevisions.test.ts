import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

import {
  listFeedRevisions,
  encodeCursor,
  decodeCursor,
} from "../feedRevisions";

type FakeQuery = Record<string, unknown>;

function buildQuery(
  rows: Record<string, unknown>[],
  error: { message: string } | null = null
): FakeQuery {
  const resolved = Promise.resolve({ data: error ? null : rows, error });
  const q: FakeQuery = {};
  for (const m of ["select", "not", "order", "limit", "gte", "or"]) {
    q[m] = vi.fn(() => q);
  }
  Object.defineProperty(q, "then", {
    get: () => resolved.then.bind(resolved),
  });
  Object.defineProperty(q, "catch", {
    get: () => resolved.catch.bind(resolved),
  });
  Object.defineProperty(q, "finally", {
    get: () => resolved.finally.bind(resolved),
  });
  return q;
}

const ROWS = [
  {
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    entity_type: "people",
    entity_id: "PPL_YORUBA",
    version: 3,
    published_at: "2026-05-21T12:00:00.000Z",
    reason: "Demographics update",
  },
  {
    id: "aaaaaaaa-0000-0000-0000-000000000002",
    entity_type: "country",
    entity_id: "ZAF",
    version: 2,
    published_at: "2026-05-20T10:00:00.000Z",
    reason: null,
  },
];

describe("encodeCursor / decodeCursor", () => {
  it("encodes and decodes a round-trip correctly", () => {
    const pt = "2026-05-21T12:00:00.000Z";
    const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const cursor = encodeCursor(pt, id);
    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual({ publishedAt: pt, id });
  });

  it("returns null for an invalid cursor", () => {
    expect(decodeCursor("not-valid-base64!!")).toBeNull();
  });

  it("returns null for a cursor missing the separator", () => {
    const bad = Buffer.from("nopipe").toString("base64url");
    expect(decodeCursor(bad)).toBeNull();
  });
});

describe("listFeedRevisions", () => {
  beforeEach(() => fromMock.mockReset());

  it("returns mapped items and no next_cursor when result <= limit", async () => {
    fromMock.mockReturnValue(buildQuery(ROWS));

    const result = await listFeedRevisions(20);

    expect(fromMock).toHaveBeenCalledWith("revisions");
    expect(result.items).toHaveLength(2);
    expect(result.next_cursor).toBeNull();

    const first = result.items[0];
    expect(first.entity_type).toBe("people");
    expect(first.entity_id).toBe("PPL_YORUBA");
    expect(first.slug).toBe("ppl_yoruba");
    expect(first.version).toBe(3);
    expect(first.published_at).toBe("2026-05-21T12:00:00.000Z");
    expect(first.pinned_url).toBe("/api/v2/peoples/PPL_YORUBA/versions/3");
    expect(first.summary).toBe("Demographics update");

    const second = result.items[1];
    expect(second.entity_type).toBe("country");
    expect(second.entity_id).toBe("ZAF");
    expect(second.slug).toBe("zaf");
    expect(second.pinned_url).toBe("/api/v2/countries/ZAF/versions/2");
    expect(second.summary).toBeNull();
  });

  it("sets next_cursor when DB returns limit+1 rows", async () => {
    const rows = [
      {
        id: "aaaaaaaa-0000-0000-0000-000000000001",
        entity_type: "people",
        entity_id: "PPL_YORUBA",
        version: 3,
        published_at: "2026-05-21T12:00:00.000Z",
        reason: null,
      },
      {
        id: "aaaaaaaa-0000-0000-0000-000000000002",
        entity_type: "country",
        entity_id: "ZAF",
        version: 2,
        published_at: "2026-05-20T10:00:00.000Z",
        reason: null,
      },
      // lookahead row
      {
        id: "aaaaaaaa-0000-0000-0000-000000000003",
        entity_type: "languageFamily",
        entity_id: "FLG_BANTU",
        version: 1,
        published_at: "2026-05-19T08:00:00.000Z",
        reason: null,
      },
    ];
    fromMock.mockReturnValue(buildQuery(rows));

    const result = await listFeedRevisions(2);

    expect(result.items).toHaveLength(2);
    expect(result.next_cursor).not.toBeNull();
    // cursor should encode the last page row's published_at + id
    const decoded = decodeCursor(result.next_cursor!);
    expect(decoded!.publishedAt).toBe("2026-05-20T10:00:00.000Z");
    expect(decoded!.id).toBe("aaaaaaaa-0000-0000-0000-000000000002");
  });

  it("derives pinned_url correctly for languageFamily entity_type", async () => {
    const rows = [
      {
        id: "aaaaaaaa-0000-0000-0000-000000000001",
        entity_type: "languageFamily",
        entity_id: "FLG_BANTU",
        version: 1,
        published_at: "2026-05-01T00:00:00.000Z",
        reason: null,
      },
    ];
    fromMock.mockReturnValue(buildQuery(rows));

    const result = await listFeedRevisions(20);
    expect(result.items[0].pinned_url).toBe(
      "/api/v2/language-families/FLG_BANTU/versions/1"
    );
  });

  it("applies the `since` filter when provided", async () => {
    const q = buildQuery(ROWS);
    fromMock.mockReturnValue(q);

    await listFeedRevisions(20, "2026-05-01T00:00:00.000Z");

    expect(q.gte as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      "published_at",
      "2026-05-01T00:00:00.000Z"
    );
  });

  it("applies the cursor filter when a valid cursor is provided", async () => {
    const cursor = encodeCursor(
      "2026-05-20T10:00:00.000Z",
      "aaaaaaaa-0000-0000-0000-000000000002"
    );
    const q = buildQuery(ROWS);
    fromMock.mockReturnValue(q);

    await listFeedRevisions(20, undefined, cursor);

    expect(q.or as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it("returns empty list and no cursor for no rows", async () => {
    fromMock.mockReturnValue(buildQuery([]));

    const result = await listFeedRevisions(20);
    expect(result.items).toHaveLength(0);
    expect(result.next_cursor).toBeNull();
  });

  it("throws on DB error", async () => {
    const q = buildQuery([], { message: "connection refused" });
    fromMock.mockReturnValue(q);

    await expect(listFeedRevisions(20)).rejects.toThrow(
      /Failed to list feed revisions/
    );
  });
});
