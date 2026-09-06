import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Search query log helper tests (ETNI-1419).
 *
 * We mock the admin Supabase client at the module level, mirroring
 * src/lib/audit/__tests__/log.test.ts. The helper must:
 *   - insert into search_query_log via the admin client
 *   - map the input to exactly { query, result_count } — no reader
 *     identifier, IP or user-agent field ever leaves this module
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

import { searchQueryLog } from "../searchQueryLog";

describe("searchQueryLog.write", () => {
  beforeEach(() => {
    insertMock.mockReset();
    insertMock.mockResolvedValue({ data: null, error: null });
    fromMock.mockClear();
    createAdminClientMock.mockClear();
    loggerError.mockReset();
  });

  // @req REQ-002
  it("inserts a row into search_query_log with the mapped columns", async () => {
    await searchQueryLog.write({ query: "yoruba", resultCount: 3, lang: "fr" });

    expect(fromMock).toHaveBeenCalledWith("search_query_log");
    expect(insertMock).toHaveBeenCalledTimes(1);

    const row = insertMock.mock.calls[0][0];
    expect(row).toEqual({ query: "yoruba", result_count: 3, lang: "fr" });
  });

  // ETNI-1857: a failed English search is a different gap from a failed
  // French one — the aliases it asks for live in another locale's names.
  // @req REQ-141
  it("records the locale the search was served in", async () => {
    await searchQueryLog.write({ query: "chad", resultCount: 0, lang: "en" });

    const row = insertMock.mock.calls[0][0];
    expect(row.lang).toBe("en");
  });

  // @req REQ-002
  it("carries no reader identifier, IP or user-agent field", async () => {
    await searchQueryLog.write({ query: "bété", resultCount: 0, lang: "fr" });

    const row = insertMock.mock.calls[0][0];
    expect(Object.keys(row).sort()).toEqual(["lang", "query", "result_count"]);
  });

  // @req REQ-002
  it("logs a zero-result query the same way as any other", async () => {
    await searchQueryLog.write({
      query: "unmatched-spelling",
      resultCount: 0,
      lang: "fr",
    });

    const row = insertMock.mock.calls[0][0];
    expect(row.result_count).toBe(0);
  });

  // @req REQ-002
  it("does not throw when the insert fails and logs the error", async () => {
    insertMock.mockResolvedValueOnce({
      data: null,
      error: { message: "boom" },
    });

    await expect(
      searchQueryLog.write({ query: "yoruba", resultCount: 1, lang: "fr" })
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalled();
  });

  // @req REQ-002
  it("does not throw when the admin client itself throws", async () => {
    insertMock.mockRejectedValueOnce(new Error("network exploded"));

    await expect(
      searchQueryLog.write({ query: "yoruba", resultCount: 1, lang: "fr" })
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalled();
  });

  // @req REQ-002
  it("does not throw when createAdminClient throws", async () => {
    createAdminClientMock.mockImplementationOnce(() => {
      throw new Error("env missing");
    });

    await expect(
      searchQueryLog.write({ query: "yoruba", resultCount: 1, lang: "fr" })
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalled();
  });
});
