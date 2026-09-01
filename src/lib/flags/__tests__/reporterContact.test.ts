import { createHash } from "node:crypto";
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
  createReporterContact,
  getVerifiedReporterEmail,
  verifyReporterContact,
} from "../reporterContact";

const FLAG_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const SLUG = "flag-7kq3m2";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * One fake per table, dispatched on the name `from()` is called with, so a test
 * can say what the contacts row is and what the flag row is without caring
 * about the order the service reads them in.
 */
function database(tables: Record<string, unknown>) {
  const inserted: Record<string, unknown>[] = [];
  const updated: Record<string, unknown>[] = [];

  const from = vi.fn((table: string) => {
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is"]) {
      query[method] = vi.fn(() => query);
    }
    query.insert = vi.fn((row: Record<string, unknown>) => {
      inserted.push({ table, ...row });
      return Promise.resolve({ data: null, error: null });
    });
    query.update = vi.fn((row: Record<string, unknown>) => {
      updated.push({ table, ...row });
      return query;
    });
    query.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: tables[table] ?? null, error: null })
    );
    return query;
  });

  mocks.createAdminClient.mockReturnValue({ from });
  return { from, inserted, updated };
}

describe("createReporterContact", () => {
  beforeEach(() => vi.clearAllMocks());

  // @req REQ-012
  it("stores the token only as a hash, never in the clear", async () => {
    const { inserted } = database({});

    const token = await createReporterContact(FLAG_ID, "lectrice@example.org");

    expect(token).toBeTruthy();
    const row = inserted[0];
    expect(row.token_hash).toBe(sha256(token as string));
    expect(JSON.stringify(row)).not.toContain(token);
  });

  // @req REQ-012
  it("gives the link a deadline rather than letting it live forever", async () => {
    const { inserted } = database({});

    await createReporterContact(FLAG_ID, "lectrice@example.org");

    const expiresAt = new Date(inserted[0].expires_at as string).getTime();
    const hoursAway = (expiresAt - Date.now()) / 3_600_000;
    expect(hoursAway).toBeGreaterThan(23);
    expect(hoursAway).toBeLessThanOrEqual(24);
  });

  // @req REQ-012
  it("records the address trimmed", async () => {
    const { inserted } = database({});

    await createReporterContact(FLAG_ID, "  lectrice@example.org  ");

    expect(inserted[0].email).toBe("lectrice@example.org");
  });
});

describe("verifyReporterContact", () => {
  beforeEach(() => vi.clearAllMocks());

  // @req REQ-012
  it("verifies a live token and hands back the report to look at", async () => {
    const { updated } = database({
      flag_reporter_contacts: {
        flag_id: FLAG_ID,
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        verified_at: null,
      },
      flags: { public_slug: SLUG },
    });

    await expect(verifyReporterContact("a-live-token")).resolves.toEqual({
      status: "verified",
      publicSlug: SLUG,
    });
    expect(updated[0].verified_at).toBeTruthy();
  });

  // @req REQ-012
  it("spends the token once — a second visit verifies nothing more", async () => {
    const { updated } = database({
      flag_reporter_contacts: {
        flag_id: FLAG_ID,
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        verified_at: "2026-09-01T10:00:00.000Z",
      },
      flags: { public_slug: SLUG },
    });

    await expect(verifyReporterContact("a-spent-token")).resolves.toEqual({
      status: "already-verified",
      publicSlug: SLUG,
    });
    expect(updated).toHaveLength(0);
  });

  // @req REQ-012
  it("refuses a token past its deadline", async () => {
    const { updated } = database({
      flag_reporter_contacts: {
        flag_id: FLAG_ID,
        expires_at: new Date(Date.now() - 1_000).toISOString(),
        verified_at: null,
      },
      flags: { public_slug: SLUG },
    });

    await expect(verifyReporterContact("a-stale-token")).resolves.toEqual({
      status: "expired",
    });
    expect(updated).toHaveLength(0);
  });

  // @req REQ-012
  it("refuses a token nobody issued", async () => {
    database({});

    await expect(verifyReporterContact("invented")).resolves.toEqual({
      status: "unknown",
    });
  });

  // @req REQ-012
  it("refuses an empty token without asking the database", async () => {
    const { from } = database({});

    await expect(verifyReporterContact("  ")).resolves.toEqual({
      status: "unknown",
    });
    expect(from).not.toHaveBeenCalled();
  });
});

describe("getVerifiedReporterEmail", () => {
  beforeEach(() => vi.clearAllMocks());

  // @req REQ-042
  it("returns the address once it has been proven", async () => {
    database({
      flag_reporter_contacts: {
        email: "lectrice@example.org",
        verified_at: "2026-09-01T10:00:00.000Z",
      },
    });

    await expect(getVerifiedReporterEmail(FLAG_ID)).resolves.toBe(
      "lectrice@example.org"
    );
  });

  // @req REQ-042
  it("withholds an address nobody has proven", async () => {
    database({
      flag_reporter_contacts: {
        email: "lectrice@example.org",
        verified_at: null,
      },
    });

    await expect(getVerifiedReporterEmail(FLAG_ID)).resolves.toBeNull();
  });
});
