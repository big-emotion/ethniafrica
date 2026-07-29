import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

import { listPublicOralNarratives } from "../oralNarratives";

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

describe("oral narratives service", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  // @req REQ-095
  it("lists only reviewed, cleared public narratives linked to the requested entity", async () => {
    const query = buildListQuery(
      [
        {
          id: "11111111-1111-1111-1111-111111111111",
          narrative_code: "ORL_YORUBA_MEMORY_001",
          narrator_display_name: "A. Adeyemi",
          community: "Yoruba",
          language_code: "yor",
          narrative_kind: "memory",
          summary: "A public memory.",
          variant_of: null,
          transcript: "This private field must never be selected.",
          collector: "This private field must never be selected.",
          media_locator: "This private field must never be selected.",
        },
      ],
      1
    );
    fromMock.mockReturnValue(query);

    const result = await listPublicOralNarratives({
      entityType: "people",
      entityId: "PPL_YORUBA",
      page: 2,
      perPage: 10,
    });

    expect(fromMock).toHaveBeenCalledWith("oral_narratives");
    expect(query.select).toHaveBeenCalledWith(
      "id,narrative_code,narrator_display_name,community,language_code,narrative_kind,summary,variant_of,oral_narrative_links!inner(entity_type,entity_id)",
      { count: "exact" }
    );
    expect(query.eq).toHaveBeenCalledWith("visibility", "public");
    expect(query.eq).toHaveBeenCalledWith("review_status", "approved");
    expect(query.eq).toHaveBeenCalledWith("rights_status", "cleared");
    expect(query.eq).toHaveBeenCalledWith(
      "oral_narrative_links.entity_type",
      "people"
    );
    expect(query.eq).toHaveBeenCalledWith(
      "oral_narrative_links.entity_id",
      "PPL_YORUBA"
    );
    expect(query.range).toHaveBeenCalledWith(10, 19);
    expect(result).toEqual({
      data: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          narrativeCode: "ORL_YORUBA_MEMORY_001",
          narratorDisplayName: "A. Adeyemi",
          community: "Yoruba",
          languageCode: "yor",
          narrativeKind: "memory",
          summary: "A public memory.",
          variantOf: null,
        },
      ],
      total: 1,
    });
  });

  // @req REQ-095
  it("keeps published variants as separate public rows", async () => {
    const query = buildListQuery(
      [
        {
          id: "11111111-1111-1111-1111-111111111111",
          narrative_code: "ORL_YORUBA_MEMORY_001",
          narrator_display_name: null,
          community: "Yoruba",
          language_code: "yor",
          narrative_kind: "memory",
          summary: "First public variant.",
          variant_of: null,
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          narrative_code: "ORL_YORUBA_MEMORY_002",
          narrator_display_name: null,
          community: "Yoruba",
          language_code: "yor",
          narrative_kind: "memory",
          summary: "Second public variant.",
          variant_of: "11111111-1111-1111-1111-111111111111",
        },
      ],
      2
    );
    fromMock.mockReturnValue(query);

    const result = await listPublicOralNarratives({
      entityType: "people",
      entityId: "PPL_YORUBA",
      page: 1,
      perPage: 20,
    });

    expect(result.data).toEqual([
      expect.objectContaining({ narrativeCode: "ORL_YORUBA_MEMORY_001" }),
      expect.objectContaining({
        narrativeCode: "ORL_YORUBA_MEMORY_002",
        variantOf: "11111111-1111-1111-1111-111111111111",
      }),
    ]);
    expect(result.total).toBe(2);
  });

  // @req REQ-095
  it("throws when the public narrative query fails", async () => {
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
      listPublicOralNarratives({
        entityType: "country",
        entityId: "NGA",
        page: 1,
        perPage: 20,
      })
    ).rejects.toThrow(
      "Failed to list public oral narratives: database unavailable"
    );
  });
});
