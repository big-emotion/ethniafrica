import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/v2/handlers/doctrine", () => ({
  listDoctrineHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { listDoctrineHandler } from "@/api/v2/handlers/doctrine";
import { GET } from "../doctrine/route";

describe("GET /api/v2/doctrine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with the envelope and the current doctrine entries", async () => {
    vi.mocked(listDoctrineHandler).mockResolvedValue({
      data: [
        {
          slug: "review_policy",
          title: "Review policy",
          mdxSource: "# Review",
          version: 3,
          publishedAt: "2026-04-01T00:00:00.000Z",
        },
      ],
      meta: {
        license: "CC-BY-SA-4.0",
        attribution: "Africa History — africahistory.org",
      },
      errors: [],
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].slug).toBe("review_policy");
    expect(body.errors).toEqual([]);
    expect(listDoctrineHandler).toHaveBeenCalled();
  });

  it("returns 500 on handler error", async () => {
    vi.mocked(listDoctrineHandler).mockRejectedValue(new Error("rls"));
    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });
});
