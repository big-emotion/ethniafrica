import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

import { listDoctrine } from "../doctrine";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

function buildListQuery(rows: Array<Record<string, unknown>>): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.order = vi.fn(() => Promise.resolve({ data: rows, error: null }));
  return query;
}

describe("doctrine service", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("returns the current version of every known doctrine slug", async () => {
    const rows = [
      {
        key: "review_policy",
        title: "Review policy",
        content: "# Review policy\n...",
        version: 3,
        updated_at: "2026-04-01T00:00:00.000Z",
      },
      {
        key: "naming_convention",
        title: "Naming convention",
        content: "# Naming\n...",
        version: 2,
        updated_at: "2026-04-02T00:00:00.000Z",
      },
    ];
    const query = buildListQuery(rows);
    fromMock.mockReturnValue(query);

    const result = await listDoctrine();

    expect(fromMock).toHaveBeenCalledWith("editorial_doctrine");
    expect(query.in).toHaveBeenCalledWith("key", [
      "review_policy",
      "naming_convention",
      "ai_disclosure",
      "license_attribution",
    ]);
    expect(query.eq).toHaveBeenCalledWith("active", true);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      slug: "review_policy",
      title: "Review policy",
      mdxSource: "# Review policy\n...",
      version: 3,
      publishedAt: "2026-04-01T00:00:00.000Z",
    });
  });

  it("prefers the mdx_source/slug/published_at columns when present (post-014)", async () => {
    const rows = [
      {
        slug: "ai_disclosure",
        title: "AI disclosure",
        mdx_source: "# AI\n...",
        version: 1,
        published_at: "2026-04-03T00:00:00.000Z",
      },
    ];
    const query = buildListQuery(rows);
    fromMock.mockReturnValue(query);

    const result = await listDoctrine();

    expect(result[0]).toEqual({
      slug: "ai_disclosure",
      title: "AI disclosure",
      mdxSource: "# AI\n...",
      version: 1,
      publishedAt: "2026-04-03T00:00:00.000Z",
    });
  });

  it("filters out rows whose slug is not in the canonical enum", async () => {
    const rows = [
      {
        key: "review_policy",
        title: "Review",
        content: "...",
        version: 1,
        updated_at: null,
      },
      {
        key: "legacy_unrelated",
        title: "Legacy",
        content: "...",
        version: 1,
        updated_at: null,
      },
    ];
    const query = buildListQuery(rows);
    fromMock.mockReturnValue(query);

    const result = await listDoctrine();

    expect(result.map((entry) => entry.slug)).toEqual(["review_policy"]);
  });

  it("throws on supabase errors", async () => {
    const query: FakeQuery = {} as FakeQuery;
    query.select = vi.fn(() => query);
    query.in = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "rls" } })
    );
    fromMock.mockReturnValue(query);

    await expect(listDoctrine()).rejects.toThrow(/rls/);
  });
});
