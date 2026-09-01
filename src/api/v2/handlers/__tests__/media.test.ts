import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/media", () => ({
  listPublicMedia: vi.fn(),
}));

import { listPublicMedia } from "../../services/media";
import { listMediaHandler } from "../media";

describe("media handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-128
  it("wraps public media entries in the canonical paginated envelope", async () => {
    vi.mocked(listPublicMedia).mockResolvedValue({
      data: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          entityType: "people",
          entityId: "PPL_TEST",
          author: "A. N.",
          licenceUri: "https://creativecommons.org/licenses/by-sa/4.0/",
          sourcePageUrl: "https://example.org/photo",
          period: "20th century",
          depictionTiming: "contemporary",
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
    const result = await listMediaHandler(query);

    expect(listPublicMedia).toHaveBeenCalledWith(query);
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
