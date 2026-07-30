import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/oralNarratives", () => ({
  listPublicOralNarratives: vi.fn(),
}));

import { listPublicOralNarratives } from "../../services/oralNarratives";
import { listOralNarrativesHandler } from "../oralNarratives";

describe("oral narratives handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-095
  it("wraps public narratives in the canonical paginated envelope", async () => {
    vi.mocked(listPublicOralNarratives).mockResolvedValue({
      data: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          narrativeCode: "ORL_TEST_001",
          narratorDisplayName: "M. N.",
          community: "Community test",
          languageCode: "fra",
          narrativeKind: "testimony",
          summary: "An attributed account.",
          variantOf: null,
        },
      ],
      total: 1,
    });

    const query = {
      entityType: "people" as const,
      entityId: "PPL_TEST",
      page: 1,
      perPage: 20,
    };
    const result = await listOralNarrativesHandler(query);

    expect(listPublicOralNarratives).toHaveBeenCalledWith(query);
    expect(result.data).toHaveLength(1);
    expect(result.meta.pagination).toEqual({
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
    });
    expect(result.errors).toEqual([]);
  });
});
