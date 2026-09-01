import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

import { listPublicMedia } from "../media";

type FakeQuery = Record<string, ReturnType<typeof vi.fn>>;

function buildListQuery(
  rows: Array<Record<string, unknown>>,
  count: number
): FakeQuery {
  const query: FakeQuery = {} as FakeQuery;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.range = vi.fn(() =>
    Promise.resolve({ data: rows, error: null, count })
  );
  return query;
}

describe("media service", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  // @req REQ-128
  it("lists media entries linked to the requested entity, mapped to camelCase", async () => {
    const query = buildListQuery(
      [
        {
          id: "11111111-1111-1111-1111-111111111111",
          entity_type: "people",
          entity_id: "PPL_YORUBA",
          author: "A. Adeyemi",
          licence_uri: "https://creativecommons.org/licenses/by-sa/4.0/",
          source_page_url: "https://example.org/photo",
          period: "20th century",
          depiction_timing: "contemporary",
        },
      ],
      1
    );
    fromMock.mockReturnValue(query);

    const result = await listPublicMedia({
      entityType: "people",
      entityId: "PPL_YORUBA",
      page: 1,
      perPage: 20,
    });

    expect(fromMock).toHaveBeenCalledWith("afrik_media");
    expect(query.select).toHaveBeenCalledWith(
      "id,entity_type,entity_id,author,licence_uri,source_page_url,period,depiction_timing",
      { count: "exact" }
    );
    expect(query.eq).toHaveBeenCalledWith("entity_type", "people");
    expect(query.eq).toHaveBeenCalledWith("entity_id", "PPL_YORUBA");
    expect(query.range).toHaveBeenCalledWith(0, 19);
    expect(result).toEqual({
      data: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          entityType: "people",
          entityId: "PPL_YORUBA",
          author: "A. Adeyemi",
          licenceUri: "https://creativecommons.org/licenses/by-sa/4.0/",
          sourcePageUrl: "https://example.org/photo",
          period: "20th century",
          depictionTiming: "contemporary",
        },
      ],
      total: 1,
    });
  });

  // @req REQ-128
  it("carries a null author and period through unchanged", async () => {
    const query = buildListQuery(
      [
        {
          id: "22222222-2222-2222-2222-222222222222",
          entity_type: "country",
          entity_id: "NGA",
          author: null,
          licence_uri: "https://creativecommons.org/licenses/by/4.0/",
          source_page_url: "https://example.org/archive",
          period: null,
          depiction_timing: "reconstitution",
        },
      ],
      1
    );
    fromMock.mockReturnValue(query);

    const result = await listPublicMedia({
      entityType: "country",
      entityId: "NGA",
      page: 1,
      perPage: 20,
    });

    expect(result.data[0]).toEqual(
      expect.objectContaining({ author: null, period: null })
    );
  });

  // @req REQ-128
  it("throws when the public media query fails", async () => {
    const query = buildListQuery([], 0);
    query.range = vi.fn(() =>
      Promise.resolve({
        data: null,
        error: { message: "database unavailable" },
        count: null,
      })
    );
    fromMock.mockReturnValue(query);

    await expect(
      listPublicMedia({
        entityType: "people",
        entityId: "PPL_TEST",
        page: 1,
        perPage: 20,
      })
    ).rejects.toThrow("Failed to list public media: database unavailable");
  });
});
