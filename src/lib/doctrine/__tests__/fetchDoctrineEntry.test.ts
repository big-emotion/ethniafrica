import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDoctrineEntry } from "@/lib/doctrine/fetchDoctrineEntry";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    from: mockFrom,
  }),
}));

interface DoctrineQueryMock {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

interface DoctrineQueryResult {
  data: {
    id: string;
    slug: string;
    title: string;
    mdx_source: string;
    version: number;
    published_at: string;
  } | null;
  error: { message: string } | null;
}

function createDoctrineQueryMock(result: DoctrineQueryResult) {
  const query: DoctrineQueryMock = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };

  return query;
}

describe("fetchDoctrineEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-025
  it("fetches the highest current non-superseded version for a live slug", async () => {
    const query = createDoctrineQueryMock({
      data: {
        id: "doctrine-v3",
        slug: "classifications-contestees",
        title: "Classifications contestées",
        mdx_source: "# Version actuelle",
        version: 3,
        published_at: "2026-07-24T00:00:00Z",
      },
      error: null,
    });
    mockFrom.mockReturnValue(query);

    const entry = await fetchDoctrineEntry("classifications-contestees");

    expect(mockFrom).toHaveBeenCalledWith("editorial_doctrine");
    expect(query.eq).toHaveBeenCalledWith("slug", "classifications-contestees");
    expect(query.is).toHaveBeenCalledWith("superseded_at", null);
    expect(query.order).toHaveBeenCalledWith("version", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(entry).toEqual({
      id: "doctrine-v3",
      slug: "classifications-contestees",
      title: "Classifications contestées",
      mdxSource: "# Version actuelle",
      version: 3,
      publishedAt: "2026-07-24T00:00:00Z",
    });
  });

  // @req REQ-025
  it("fetches the exact slug and version for a pinned doctrine entry", async () => {
    const query = createDoctrineQueryMock({
      data: {
        id: "doctrine-v42",
        slug: "classifications-contestees",
        title: "Classifications contestées",
        mdx_source: "# Version archivée",
        version: 42,
        published_at: "2025-02-03T00:00:00Z",
      },
      error: null,
    });
    mockFrom.mockReturnValue(query);

    const entry = await fetchDoctrineEntry("classifications-contestees", 42);

    expect(query.eq).toHaveBeenNthCalledWith(
      1,
      "slug",
      "classifications-contestees"
    );
    expect(query.eq).toHaveBeenNthCalledWith(2, "version", 42);
    expect(query.is).not.toHaveBeenCalled();
    expect(query.order).not.toHaveBeenCalled();
    expect(query.limit).not.toHaveBeenCalled();
    expect(entry?.mdxSource).toBe("# Version archivée");
    expect(entry?.version).toBe(42);
  });

  // @req REQ-025
  it("returns null when an exact slug and version combination is unknown", async () => {
    const query = createDoctrineQueryMock({
      data: null,
      error: null,
    });
    mockFrom.mockReturnValue(query);

    await expect(
      fetchDoctrineEntry("classifications-contestees", 999)
    ).resolves.toBeNull();
  });

  /**
   * "The database did not answer" and "there is no such doctrine" are not the
   * same fact, and only the second one is a 404. The caller turns a `null` into
   * `notFound()`, so collapsing the two told crawlers a published page had been
   * withdrawn every time a read failed — which is exactly what
   * `/fr/doctrine/classifications-contestees` reported for hours while the row
   * sat in the table, unsuperseded, the whole time.
   */
  // @req REQ-025
  it("raises rather than reporting a read failure as an unknown slug", async () => {
    const query = createDoctrineQueryMock({
      data: null,
      error: { message: "AbortError: This operation was aborted" },
    });
    mockFrom.mockReturnValue(query);

    await expect(
      fetchDoctrineEntry("classifications-contestees")
    ).rejects.toMatchObject({
      message: "AbortError: This operation was aborted",
    });
  });
});
