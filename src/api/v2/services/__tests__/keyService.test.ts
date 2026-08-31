import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  loggerError: vi.fn(),
  hashApiKey: vi.fn(),
  getKeyPrefix: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { error: mocks.loggerError },
}));

vi.mock("@/lib/api/auth", () => ({
  hashApiKey: mocks.hashApiKey,
  getKeyPrefix: mocks.getKeyPrefix,
}));

import {
  createUserApiKey,
  getAuthenticatedUser,
  listUserApiKeys,
  revokeUserApiKey,
} from "../keyService";

function chainableQuery(result: { data: unknown; error: unknown }) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of [
    "select",
    "eq",
    "is",
    "order",
    "insert",
    "update",
    "single",
    "maybeSingle",
  ]) {
    query[method] = vi.fn(() => query);
  }
  query.single = vi.fn().mockResolvedValue(result);
  query.maybeSingle = vi.fn().mockResolvedValue(result);
  // `order` terminates a list query without an explicit terminal call.
  query.order = vi.fn().mockResolvedValue(result);
  return query;
}

describe("getAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-056
  it("resolves a Supabase user from the bearer access token", async () => {
    const getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mocks.createAdminClient.mockReturnValue({ auth: { getUser } });

    await expect(getAuthenticatedUser("valid-jwt")).resolves.toEqual({
      id: "user-1",
    });
    expect(getUser).toHaveBeenCalledWith("valid-jwt");
  });

  // @req REQ-056
  it("returns null when Supabase rejects the token", async () => {
    mocks.createAdminClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: { message: "x" } }),
      },
    });

    await expect(getAuthenticatedUser("bad-jwt")).resolves.toBeNull();
    expect(mocks.loggerError).toHaveBeenCalled();
  });
});

describe("listUserApiKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-056
  it("scopes the query to the caller's own keys", async () => {
    const rows = [
      {
        id: "key-1",
        label: "CI script",
        tier: "public",
        active: true,
        key_prefix: "usr_abcdef",
        created_at: "2026-01-01T00:00:00.000Z",
        last_used_at: null,
        expires_at: null,
        revoked_at: null,
      },
    ];
    const query = chainableQuery({ data: rows, error: null });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => query),
    });

    await expect(listUserApiKeys("user-1")).resolves.toEqual(rows);
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  // @req REQ-056
  it("throws when the query fails", async () => {
    const query = chainableQuery({
      data: null,
      error: { message: "db down" },
    });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });

    await expect(listUserApiKeys("user-1")).rejects.toThrow("db down");
  });
});

describe("createUserApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashApiKey.mockResolvedValue("pbkdf2v1:600000:salt:hash");
    mocks.getKeyPrefix.mockReturnValue("usr_abcdef012345678901");
  });

  // @req REQ-056
  it("inserts a public-tier key scoped to the caller and returns the raw key once", async () => {
    const insertedRow = {
      id: "key-2",
      label: "Local dev",
      tier: "public",
      active: true,
      key_prefix: "usr_abcdef012345678901", // gitleaks:allow
      created_at: "2026-01-02T00:00:00.000Z",
      last_used_at: null,
      expires_at: null,
      revoked_at: null,
    };
    const query = chainableQuery({ data: insertedRow, error: null });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });

    const result = await createUserApiKey("user-1", "Local dev");

    expect(result).toMatchObject(insertedRow);
    expect(typeof result.key).toBe("string");
    expect(result.key.startsWith("usr_")).toBe(true);

    const insertedRecord = query.insert.mock.calls[0][0];
    expect(insertedRecord.tier).toBe("public");
    expect(insertedRecord.user_id).toBe("user-1");
    expect(insertedRecord.created_by).toBe("user-1");
    expect(insertedRecord.label).toBe("Local dev");
    expect(insertedRecord.active).toBe(true);
  });

  // @req REQ-056
  it("throws when the insert fails", async () => {
    const query = chainableQuery({
      data: null,
      error: { message: "constraint violation" },
    });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });

    await expect(createUserApiKey("user-1", "Local dev")).rejects.toThrow(
      "constraint violation"
    );
  });
});

describe("revokeUserApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-056
  it("revokes a key owned by the caller", async () => {
    const query = chainableQuery({ data: { id: "key-1" }, error: null });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });

    await expect(revokeUserApiKey("user-1", "key-1")).resolves.toBe("revoked");
    expect(query.eq).toHaveBeenCalledWith("id", "key-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    const updatePayload = query.update.mock.calls[0][0];
    expect(updatePayload.active).toBe(false);
    expect(typeof updatePayload.revoked_at).toBe("string");
  });

  // @req REQ-056
  it("returns not_found when the key does not belong to the caller or is already revoked", async () => {
    const query = chainableQuery({ data: null, error: null });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });

    await expect(revokeUserApiKey("user-1", "someone-elses-key")).resolves.toBe(
      "not_found"
    );
  });

  // @req REQ-056
  it("throws when the update fails", async () => {
    const query = chainableQuery({
      data: null,
      error: { message: "db down" },
    });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });

    await expect(revokeUserApiKey("user-1", "key-1")).rejects.toThrow(
      "db down"
    );
  });
});
