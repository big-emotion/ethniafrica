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

import { listFlagsForModeration } from "../flags";

const row = {
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  public_slug: "0123456789",
  entity_type: "people",
  entity_id: "PPL_YORUBA",
  assertion_field_path: null,
  assertion_id: null,
  flag_kind: "other",
  reason_text: "La population est périmée.",
  counter_source_url: null,
  counter_source_citation: null,
  proposed_rewrite: null,
  contributor_id: null,
  severity: null,
  auto_generated: false,
  status: "open",
  created_at: "2026-08-30T10:00:00.000Z",
  updated_at: null,
  resolved_at: null,
};

function queryReturning(result: {
  data: unknown[];
  count: number;
  error?: { message: string };
}) {
  const calls: Record<string, unknown[][]> = {
    select: [],
    in: [],
    eq: [],
    order: [],
    range: [],
  };

  const query: Record<string, unknown> = {};
  for (const method of ["select", "in", "eq", "order"]) {
    query[method] = vi.fn((...args: unknown[]) => {
      calls[method].push(args);
      return query;
    });
  }
  query.range = vi.fn((...args: unknown[]) => {
    calls.range.push(args);
    return Promise.resolve({
      data: result.data,
      count: result.count,
      error: result.error ?? null,
    });
  });

  mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });
  return calls;
}

const baseFilters = {
  sort: "recent" as const,
  page: 1,
  pageSize: 25,
};

describe("listFlagsForModeration", () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * The queue used to serve two statuses. A moderator who had just accepted a
   * report could not then find it, and nothing on the surface said the other
   * three states existed.
   */
  // @req REQ-042
  it("serves every status when none is asked for", async () => {
    const calls = queryReturning({ data: [row], count: 1 });

    const result = await listFlagsForModeration(baseFilters);

    expect(calls.in).toHaveLength(0);
    expect(result.total).toBe(1);
    expect(result.items[0].target_id).toBe("PPL_YORUBA");
  });

  // @req REQ-042
  it("narrows to the statuses asked for", async () => {
    const calls = queryReturning({ data: [], count: 0 });

    await listFlagsForModeration({
      ...baseFilters,
      statuses: ["open", "under_review"],
    });

    expect(calls.in[0]).toEqual(["status", ["open", "under_review"]]);
  });

  // @req REQ-042
  it("puts the oldest first when asked, so a backlog cannot hide", async () => {
    const calls = queryReturning({ data: [], count: 0 });

    await listFlagsForModeration({ ...baseFilters, sort: "oldest" });

    expect(calls.order[0]).toEqual(["created_at", { ascending: true }]);
  });

  // @req REQ-042
  it("puts the newest first by default", async () => {
    const calls = queryReturning({ data: [], count: 0 });

    await listFlagsForModeration(baseFilters);

    expect(calls.order[0]).toEqual(["created_at", { ascending: false }]);
  });

  // @req REQ-042
  it("asks for the window the requested page covers", async () => {
    const calls = queryReturning({ data: [], count: 0 });

    await listFlagsForModeration({ ...baseFilters, page: 3, pageSize: 25 });

    expect(calls.range[0]).toEqual([50, 74]);
  });

  // @req REQ-042
  it("treats a page before the first as the first", async () => {
    const calls = queryReturning({ data: [], count: 0 });

    await listFlagsForModeration({ ...baseFilters, page: 0 });

    expect(calls.range[0]).toEqual([0, 24]);
  });

  // @req REQ-042
  it("narrows by kind and by entity type", async () => {
    const calls = queryReturning({ data: [], count: 0 });

    await listFlagsForModeration({
      ...baseFilters,
      kind: "offensive",
      entityType: "country",
    });

    expect(calls.eq).toContainEqual(["flag_kind", "offensive"]);
    expect(calls.eq).toContainEqual(["entity_type", "country"]);
  });

  /**
   * An unreadable queue must not look like an empty one: a moderator would
   * conclude there is nothing to do.
   */
  // @req REQ-042
  it("raises rather than reporting an empty queue when the read fails", async () => {
    queryReturning({ data: [], count: 0, error: { message: "timeout" } });

    await expect(listFlagsForModeration(baseFilters)).rejects.toThrow();
    expect(mocks.loggerError).toHaveBeenCalled();
  });
});
