import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageResponse } from "next/og";
import { getComparisonEntities } from "@/api/v2/services/comparisonService";
import { GET } from "../route";

vi.mock("next/og", () => ({
  ImageResponse: vi.fn(function ImageResponseMock() {
    return new Response("image", { status: 200 });
  }),
}));

vi.mock("@/api/v2/services/comparisonService", () => ({
  getComparisonEntities: vi.fn(),
}));

vi.mock("@/lib/comparisonDataTransformer", () => ({
  transformComparisonData: vi.fn(() => ({
    type: "peuple",
    columns: [
      { id: "PPL_ONE", label: "One", type: "peuple" },
      { id: "PPL_TWO", label: "Two", type: "peuple" },
    ],
    rows: [],
  })),
}));

const mockedGetComparisonEntities = vi.mocked(getComparisonEntities);

function request(ids: string[]) {
  const url = new URL(
    "https://ethniafrica.example/fr/comparer/peuples/opengraph-image"
  );
  ids.forEach((id) => url.searchParams.append("id", id));
  return new Request(url);
}

function context(entityType = "peuples") {
  return { params: Promise.resolve({ lang: "fr", entityType }) };
}

describe("comparison Open Graph image route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-097
  it.each([
    ["unknown entity type", "langues", ["PPL_ONE", "PPL_TWO"]],
    ["fewer than two ids", "peuples", ["PPL_ONE"]],
    [
      "more than three ids",
      "peuples",
      ["PPL_ONE", "PPL_TWO", "PPL_THREE", "PPL_FOUR"],
    ],
    ["duplicate ids", "peuples", ["PPL_ONE", "PPL_ONE"]],
  ])("returns 404 for %s", async (_label, entityType, ids) => {
    const response = await GET(request(ids), context(entityType));

    expect(response.status).toBe(404);
    expect(mockedGetComparisonEntities).not.toHaveBeenCalled();
  });

  // @req REQ-097
  it("returns 404 when an entity is missing", async () => {
    mockedGetComparisonEntities.mockResolvedValueOnce({
      entities: [],
      missingIds: ["PPL_TWO"],
    });

    const response = await GET(request(["PPL_ONE", "PPL_TWO"]), context());

    expect(response.status).toBe(404);
  });

  // @req REQ-097
  it("renders a cacheable 1200x630 image for a valid comparison", async () => {
    mockedGetComparisonEntities.mockResolvedValueOnce({
      entities: [
        {
          id: "PPL_ONE",
          entity: { type: "peuple", id: "PPL_ONE", label: "One" },
          confidence: {
            entityId: "PPL_ONE",
            score: 0.8,
            sourceCount: 2,
            avgSourceQuality: null,
            lastHumanAuditAt: null,
            openFlagCount: null,
            recomputedAt: null,
          },
        },
        {
          id: "PPL_TWO",
          entity: { type: "peuple", id: "PPL_TWO", label: "Two" },
          confidence: null,
        },
      ],
      missingIds: [],
    });

    const response = await GET(request(["PPL_ONE", "PPL_TWO"]), context());

    expect(response.status).toBe(200);
    expect(mockedGetComparisonEntities).toHaveBeenCalledWith("peuple", [
      "PPL_ONE",
      "PPL_TWO",
    ]);
    expect(ImageResponse).toHaveBeenCalledOnce();
    expect(vi.mocked(ImageResponse).mock.calls[0][1]).toMatchObject({
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  });
});
