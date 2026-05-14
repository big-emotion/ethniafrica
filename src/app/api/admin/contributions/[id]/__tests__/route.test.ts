import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Wiring test for the admin contributions PATCH handler.
 *
 * Verifies that auditLog.write is called with the expected action after the
 * mutation succeeds — once for approval, once for rejection.
 */

const mocks = vi.hoisted(() => {
  const auditLogWrite = vi.fn().mockResolvedValue(undefined);
  const getCurrentUser = vi
    .fn()
    .mockResolvedValue({ id: "user-admin", email: "a@b.test" });
  const isAdmin = vi.fn().mockResolvedValue(true);

  type Row = Record<string, unknown>;
  const state: { row: Row | null; rowError: unknown } = {
    row: { id: "abc-123", status: "pending", type: "new_country" },
    rowError: null,
  };

  function createBuilder() {
    const builder: Record<string, unknown> = {};
    builder.update = vi.fn(() => builder);
    builder.insert = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.select = vi.fn(() => builder);
    builder.single = vi.fn(async () => ({
      data: state.row,
      error: state.rowError,
    }));
    return builder;
  }

  const fromMock = vi.fn(() => createBuilder());
  const adminClient = { from: fromMock };
  const createAdminClient = vi.fn(() => adminClient);

  return {
    auditLogWrite,
    getCurrentUser,
    isAdmin,
    createAdminClient,
    fromMock,
    state,
  };
});

vi.mock("@/lib/audit/log", () => ({
  auditLog: { write: mocks.auditLogWrite },
}));

vi.mock("@/lib/auth/supabase-auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isAdmin: mocks.isAdmin,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { PATCH } from "../route";

function buildRequest(body: Record<string, unknown>): NextRequest {
  return {
    json: async () => body,
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === "x-forwarded-for") return "203.0.113.42";
        if (name.toLowerCase() === "user-agent") return "vitest/1.0";
        return null;
      },
    },
  } as unknown as NextRequest;
}

describe("PATCH /api/admin/contributions/[id]", () => {
  beforeEach(() => {
    mocks.auditLogWrite.mockClear();
    mocks.getCurrentUser.mockClear();
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-admin",
      email: "a@b.test",
    });
    mocks.isAdmin.mockClear();
    mocks.isAdmin.mockResolvedValue(true);
    mocks.createAdminClient.mockClear();
    mocks.fromMock.mockClear();
    mocks.state.row = {
      id: "abc-123",
      status: "pending",
      type: "new_country",
      proposed_payload: { id: "abc-123" },
    };
    mocks.state.rowError = null;
  });

  it("emits audit_log entry with action 'contribution.approve' on approve", async () => {
    const response = await PATCH(buildRequest({ action: "approve" }), {
      params: Promise.resolve({ id: "abc-123" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.auditLogWrite).toHaveBeenCalledTimes(1);
    const call = mocks.auditLogWrite.mock.calls[0][0];
    expect(call.action).toBe("contribution.approve");
    expect(call.targetType).toBe("contribution");
    expect(call.targetId).toBe("abc-123");
    expect(call.ip).toBe("203.0.113.42");
    expect(call.userAgent).toBe("vitest/1.0");
    expect(call.before).toBeDefined();
    expect(call.after).toBeDefined();
  });

  it("emits audit_log entry with action 'contribution.reject' on reject", async () => {
    const response = await PATCH(buildRequest({ action: "reject" }), {
      params: Promise.resolve({ id: "abc-123" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.auditLogWrite).toHaveBeenCalledTimes(1);
    const call = mocks.auditLogWrite.mock.calls[0][0];
    expect(call.action).toBe("contribution.reject");
    expect(call.targetType).toBe("contribution");
    expect(call.targetId).toBe("abc-123");
  });

  it("does not emit audit_log entry when the mutation fails", async () => {
    mocks.state.row = null;
    mocks.state.rowError = { code: "PGRST116", message: "not found" };

    const response = await PATCH(buildRequest({ action: "approve" }), {
      params: Promise.resolve({ id: "abc-123" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.auditLogWrite).not.toHaveBeenCalled();
  });

  it("does not emit audit_log entry when unauthorized", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await PATCH(buildRequest({ action: "approve" }), {
      params: Promise.resolve({ id: "abc-123" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.auditLogWrite).not.toHaveBeenCalled();
  });
});
