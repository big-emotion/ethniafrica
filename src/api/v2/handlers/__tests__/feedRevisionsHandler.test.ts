import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/feedRevisions", () => ({
  listFeedRevisions: vi.fn(),
}));

import { listFeedRevisions } from "../../services/feedRevisions";
import { listFeedRevisionsHandler } from "../feedRevisionsHandler";

const ITEMS = [
  {
    entity_type: "people",
    entity_id: "PPL_YORUBA",
    slug: "ppl_yoruba",
    version: 3,
    published_at: "2026-05-21T12:00:00.000Z",
    pinned_url: "/api/v2/peoples/PPL_YORUBA/versions/3",
    summary: "Demographics update",
  },
];

describe("listFeedRevisionsHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns Module #0 envelope with cursor pagination meta", async () => {
    vi.mocked(listFeedRevisions).mockResolvedValue({
      items: ITEMS,
      next_cursor: null,
    });

    const result = await listFeedRevisionsHandler(20);

    expect(listFeedRevisions).toHaveBeenCalledWith(20, undefined, undefined);
    expect(result).toEqual({
      data: ITEMS,
      meta: {
        license: "CC-BY-SA-4.0",
        attribution: "Africa History — africahistory.org",
        pagination: { limit: 20, next_cursor: null },
      },
      errors: [],
    });
  });

  it("propagates since and cursor to the service", async () => {
    vi.mocked(listFeedRevisions).mockResolvedValue({
      items: [],
      next_cursor: null,
    });

    await listFeedRevisionsHandler(10, "2026-05-01T00:00:00.000Z", "dGVzdA");

    expect(listFeedRevisions).toHaveBeenCalledWith(
      10,
      "2026-05-01T00:00:00.000Z",
      "dGVzdA"
    );
  });

  it("includes next_cursor in pagination meta", async () => {
    vi.mocked(listFeedRevisions).mockResolvedValue({
      items: ITEMS,
      next_cursor: "dGVzdA",
    });

    const result = await listFeedRevisionsHandler(1);

    expect(result.meta.pagination.next_cursor).toBe("dGVzdA");
    expect(result.meta.pagination.limit).toBe(1);
  });

  it("returns empty data with null next_cursor when no revisions exist", async () => {
    vi.mocked(listFeedRevisions).mockResolvedValue({
      items: [],
      next_cursor: null,
    });

    const result = await listFeedRevisionsHandler(20);

    expect(result.data).toEqual([]);
    expect(result.meta.pagination.next_cursor).toBeNull();
    expect(result.errors).toEqual([]);
  });
});
