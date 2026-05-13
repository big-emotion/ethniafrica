import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Audit log helper tests.
 *
 * We mock the admin Supabase client at the module level. The helper must:
 *   - insert into audit_log via the admin client
 *   - map AuditLogInput fields to the schema columns (entity_type, entity_id,
 *     ip_address) and fold before/after/userAgent into the metadata JSONB
 *   - only include optional metadata keys when they are defined
 *   - truncate the IP before inserting
 *   - never throw on Supabase failure
 */

const mocks = vi.hoisted(() => {
  const insertMock = vi.fn();
  const fromMock = vi.fn(() => ({ insert: insertMock }));
  const createAdminClientMock = vi.fn(() => ({ from: fromMock }));
  const loggerError = vi.fn();
  return { insertMock, fromMock, createAdminClientMock, loggerError };
});

const { insertMock, fromMock, createAdminClientMock, loggerError } = mocks;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClientMock,
}));

vi.mock("@/lib/api/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: (...args: unknown[]) => mocks.loggerError(...args),
    debug: vi.fn(),
  },
}));

import { auditLog } from "../log";

describe("auditLog.write", () => {
  beforeEach(() => {
    insertMock.mockReset();
    insertMock.mockResolvedValue({ data: null, error: null });
    fromMock.mockClear();
    createAdminClientMock.mockClear();
    loggerError.mockReset();
  });

  it("inserts a row into audit_log with the mapped columns", async () => {
    await auditLog.write({
      actorId: "11111111-1111-1111-1111-111111111111",
      action: "contribution.approve",
      targetType: "contribution",
      targetId: "abc-123",
      ip: "192.168.1.42",
      userAgent: "Mozilla/5.0",
      before: { status: "pending" },
      after: { status: "approved" },
    });

    expect(fromMock).toHaveBeenCalledWith("audit_log");
    expect(insertMock).toHaveBeenCalledTimes(1);

    const row = insertMock.mock.calls[0][0];
    expect(row.action).toBe("contribution.approve");
    expect(row.entity_type).toBe("contribution");
    expect(row.entity_id).toBe("abc-123");
    expect(row.actor_id).toBe("11111111-1111-1111-1111-111111111111");
    // IP must be truncated before insertion
    expect(row.ip_address).toBe("192.168.1.0");
    // before/after/userAgent live inside metadata
    expect(row.metadata).toEqual({
      before: { status: "pending" },
      after: { status: "approved" },
      userAgent: "Mozilla/5.0",
    });
  });

  it("omits optional metadata keys when undefined", async () => {
    await auditLog.write({
      actorId: null,
      action: "api_key.issue",
    });

    const row = insertMock.mock.calls[0][0];
    expect(row.action).toBe("api_key.issue");
    expect(row.actor_id).toBeNull();
    expect(row.entity_type).toBeUndefined();
    expect(row.entity_id).toBeUndefined();
    expect(row.ip_address).toBeNull();
    expect(row.metadata).toEqual({});
    expect("before" in row.metadata).toBe(false);
    expect("after" in row.metadata).toBe(false);
    expect("userAgent" in row.metadata).toBe(false);
  });

  it("includes only the metadata keys that are provided", async () => {
    await auditLog.write({
      actorId: null,
      action: "user_role.change",
      userAgent: "curl/8.0",
    });

    const row = insertMock.mock.calls[0][0];
    expect(row.metadata).toEqual({ userAgent: "curl/8.0" });
  });

  it("truncates IPv6 to /48 before insertion", async () => {
    await auditLog.write({
      actorId: null,
      action: "api_key.issue",
      ip: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
    });

    const row = insertMock.mock.calls[0][0];
    expect(row.ip_address).toBe("2001:db8:85a3::");
  });

  it("does not throw when the insert fails and logs the error", async () => {
    insertMock.mockResolvedValueOnce({
      data: null,
      error: { message: "boom" },
    });

    await expect(
      auditLog.write({ actorId: null, action: "contribution.reject" })
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalled();
  });

  it("does not throw when the admin client itself throws", async () => {
    insertMock.mockRejectedValueOnce(new Error("network exploded"));

    await expect(
      auditLog.write({ actorId: null, action: "contribution.reject" })
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalled();
  });

  it("does not throw when createAdminClient throws", async () => {
    createAdminClientMock.mockImplementationOnce(() => {
      throw new Error("env missing");
    });

    await expect(
      auditLog.write({ actorId: null, action: "contribution.reject" })
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalled();
  });
});
