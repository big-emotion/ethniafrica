import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { error: mocks.loggerError },
}));

import {
  createFlag,
  decodeFlagCursor,
  encodeFlagCursor,
  getAuthenticatedContributor,
  getFlagByIdOrSlug,
  listFlags,
} from "../flags";

function resolvedQuery(result: {
  data: unknown;
  error: { message: string } | null;
}) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of [
    "select",
    "eq",
    "or",
    "order",
    "limit",
    "insert",
    "single",
    "maybeSingle",
  ]) {
    query[method] = vi.fn(() => query);
  }
  Object.assign(query, {
    then: result.error
      ? (
          resolve: (value: typeof result) => unknown,
          _reject: (reason?: unknown) => unknown
        ) => Promise.resolve(result).then(resolve)
      : (resolve: (value: typeof result) => unknown) =>
          Promise.resolve(result).then(resolve),
  });
  return query;
}

const createdFlag = {
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  public_slug: "0123456789",
  status: "open",
  created_at: "2026-07-24T19:00:00.000Z",
};

const publicRows = [
  {
    id: "aaaaaaaa-0000-4000-8000-000000000003",
    public_slug: "012345678A",
    entity_type: "assertion",
    entity_id: "PPL_YORUBA",
    assertion_field_path: "demographics.population",
    flag_kind: "inaccurate",
    reason_text: "The population figure is outdated.",
    counter_source_url: "https://example.org/source",
    counter_source_citation: "Example Institute (2025)",
    proposed_rewrite: "Use the 2025 census figure.",
    status: "open",
    created_at: "2026-07-24T19:02:00.000Z",
    updated_at: "2026-07-24T19:02:00.000Z",
    resolved_at: null,
  },
  {
    id: "aaaaaaaa-0000-4000-8000-000000000002",
    public_slug: "012345678B",
    entity_type: "people",
    entity_id: "PPL_AKAN",
    assertion_field_path: null,
    flag_kind: "missing-source",
    reason_text: "This statement needs a primary source.",
    counter_source_url: null,
    counter_source_citation: null,
    proposed_rewrite: null,
    status: "under_review",
    created_at: "2026-07-24T19:01:00.000Z",
    updated_at: "2026-07-24T19:01:00.000Z",
    resolved_at: null,
  },
];

describe("getAuthenticatedContributor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-012
  it("resolves a Supabase user from the bearer access token", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mocks.createAdminClient.mockReturnValue({ auth: { getUser } });

    await expect(getAuthenticatedContributor("valid-jwt")).resolves.toEqual({
      id: "user-123",
    });
    expect(getUser).toHaveBeenCalledWith("valid-jwt");
  });

  // @req REQ-012
  it("returns null when Supabase rejects the identity", async () => {
    const error = { message: "JWT expired" };
    mocks.createAdminClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error,
        }),
      },
    });

    await expect(
      getAuthenticatedContributor("expired-jwt")
    ).resolves.toBeNull();
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "Failed to authenticate flag contributor",
      error
    );
  });
});

describe("createFlag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-012
  it("maps the complete API payload to migration 019 columns", async () => {
    const query = resolvedQuery({ data: createdFlag, error: null });
    const from = vi.fn(() => query);
    mocks.createAdminClient.mockReturnValue({ from });

    const result = await createFlag("user-123", {
      target_type: "assertion",
      target_id: "PPL_YORUBA",
      target_field_path: "demographics.population",
      flag_kind: "correction-proposal",
      reason_text: "The current population figure is outdated.",
      counter_source_url: "https://example.org/census",
      counter_source_citation: "Example Census Bureau (2025)",
      proposed_rewrite: "Replace the figure with the 2025 census total.",
    });

    expect(from).toHaveBeenCalledWith("flags");
    expect(query.insert).toHaveBeenCalledWith({
      entity_type: "assertion",
      entity_id: "PPL_YORUBA",
      assertion_field_path: "demographics.population",
      flag_kind: "correction-proposal",
      reason_text: "The current population figure is outdated.",
      counter_source_url: "https://example.org/census",
      counter_source_citation: "Example Census Bureau (2025)",
      proposed_rewrite: "Replace the figure with the 2025 census total.",
      contributor_id: "user-123",
      status: "open",
      turnstile_token_verified: true,
    });
    expect(query.select).toHaveBeenCalledWith(
      "id, public_slug, status, created_at"
    );
    expect(result).toEqual(createdFlag);
  });

  // @req REQ-012
  it("persists absent optional fields as null", async () => {
    const query = resolvedQuery({ data: createdFlag, error: null });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });

    await createFlag("user-123", {
      target_type: "people",
      target_id: "PPL_AKAN",
      flag_kind: "other",
      reason_text: "This statement needs editorial review.",
    });

    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        assertion_field_path: null,
        counter_source_url: null,
        counter_source_citation: null,
        proposed_rewrite: null,
      })
    );
  });

  // @req REQ-012
  it("propagates insert errors with a stable English message", async () => {
    const error = { message: "insert denied" };
    const query = resolvedQuery({ data: null, error });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => query),
    });

    await expect(
      createFlag("user-123", {
        target_type: "people",
        target_id: "PPL_AKAN",
        flag_kind: "other",
        reason_text: "This statement needs editorial review.",
      })
    ).rejects.toThrow("Failed to create flag: insert denied");
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "Failed to create flag",
      error
    );
  });
});

describe("flag cursors", () => {
  // @req REQ-014
  it("round-trips a created_at and id pair as opaque base64url", () => {
    const cursor = encodeFlagCursor(
      "2026-07-24T19:01:00.000Z",
      "aaaaaaaa-0000-4000-8000-000000000002"
    );

    expect(cursor).not.toContain("|");
    expect(decodeFlagCursor(cursor)).toEqual({
      createdAt: "2026-07-24T19:01:00.000Z",
      id: "aaaaaaaa-0000-4000-8000-000000000002",
    });
  });

  // @req REQ-014
  it("returns null for malformed cursors", () => {
    expect(decodeFlagCursor("not-a-valid-cursor!")).toBeNull();
    expect(
      decodeFlagCursor(Buffer.from("missing-separator").toString("base64url"))
    ).toBeNull();
  });

  // @req REQ-014
  it("rejects decoded values that are unsafe for a PostgREST predicate", () => {
    const unsafeCursor = Buffer.from("not-a-date|injection").toString(
      "base64url"
    );

    expect(decodeFlagCursor(unsafeCursor)).toBeNull();
  });
});

describe("listFlags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-014
  it("applies filters, stable ordering, and a limit+1 lookahead", async () => {
    const lookahead = {
      ...publicRows[1],
      id: "aaaaaaaa-0000-4000-8000-000000000001",
      created_at: "2026-07-24T19:00:00.000Z",
    };
    const query = resolvedQuery({
      data: [...publicRows, lookahead],
      error: null,
    });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => query),
    });

    const result = await listFlags({
      status: "open",
      kind: "inaccurate",
      target_type: "assertion",
      limit: 2,
    });

    expect(query.eq).toHaveBeenNthCalledWith(1, "status", "open");
    expect(query.eq).toHaveBeenNthCalledWith(2, "flag_kind", "inaccurate");
    expect(query.eq).toHaveBeenNthCalledWith(3, "entity_type", "assertion");
    expect(query.order).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: false,
    });
    expect(query.order).toHaveBeenNthCalledWith(2, "id", {
      ascending: false,
    });
    expect(query.limit).toHaveBeenCalledWith(3);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        target_type: "assertion",
        target_id: "PPL_YORUBA",
        target_field_path: "demographics.population",
        flag_kind: "inaccurate",
      })
    );
    expect(result.next_cursor).toBe(
      encodeFlagCursor(publicRows[1].created_at, publicRows[1].id)
    );
  });

  // @req REQ-014
  it("applies a stable keyset cursor predicate", async () => {
    const query = resolvedQuery({ data: publicRows, error: null });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => query),
    });
    const cursor = encodeFlagCursor(
      "2026-07-24T19:01:00.000Z",
      "aaaaaaaa-0000-4000-8000-000000000002"
    );

    await listFlags({ limit: 20, cursor });

    expect(query.or).toHaveBeenCalledWith(
      "created_at.lt.2026-07-24T19:01:00.000Z,and(created_at.eq.2026-07-24T19:01:00.000Z,id.lt.aaaaaaaa-0000-4000-8000-000000000002)"
    );
  });

  // @req REQ-014
  it("returns no cursor when the page has no lookahead row", async () => {
    const query = resolvedQuery({ data: publicRows, error: null });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => query),
    });

    await expect(listFlags({ limit: 20 })).resolves.toEqual({
      items: expect.any(Array),
      next_cursor: null,
    });
  });

  // @req REQ-014
  it("propagates list errors with a stable English message", async () => {
    const error = { message: "query timed out" };
    const query = resolvedQuery({ data: null, error });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => query),
    });

    await expect(listFlags({ limit: 20 })).rejects.toThrow(
      "Failed to list flags: query timed out"
    );
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "Failed to list flags",
      error
    );
  });
});

describe("getFlagByIdOrSlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-014
  it("looks up UUID identifiers by id", async () => {
    const query = resolvedQuery({ data: publicRows[0], error: null });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => query),
    });

    const result = await getFlagByIdOrSlug(
      "aaaaaaaa-0000-4000-8000-000000000003"
    );

    expect(query.eq).toHaveBeenCalledWith(
      "id",
      "aaaaaaaa-0000-4000-8000-000000000003"
    );
    expect(result).toEqual(
      expect.objectContaining({
        target_type: "assertion",
        target_id: "PPL_YORUBA",
      })
    );
  });

  // @req REQ-014
  it("looks up non-UUID identifiers by public_slug", async () => {
    const query = resolvedQuery({ data: publicRows[0], error: null });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => query),
    });

    await getFlagByIdOrSlug("012345678A");

    expect(query.eq).toHaveBeenCalledWith("public_slug", "012345678A");
  });

  // @req REQ-014
  it("returns null when the flag does not exist", async () => {
    const query = resolvedQuery({ data: null, error: null });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => query),
    });

    await expect(getFlagByIdOrSlug("NOTFOUND00")).resolves.toBeNull();
  });

  // @req REQ-014
  it("propagates detail errors with a stable English message", async () => {
    const error = { message: "connection refused" };
    const query = resolvedQuery({ data: null, error });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => query),
    });

    await expect(getFlagByIdOrSlug("012345678A")).rejects.toThrow(
      "Failed to get flag: connection refused"
    );
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "Failed to get flag",
      error,
      { identifier: "012345678A" }
    );
  });
});
