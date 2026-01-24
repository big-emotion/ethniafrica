import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../v2/peoples/route";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/peoples", () => ({
  listPeoplesHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { listPeoplesHandler } from "@/api/v2/handlers/peoples";

describe("API v2 - Peoples Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v2/peoples", () => {
    it("should return paginated peoples", async () => {
      const mockResponse = {
        data: [
          {
            id: "PPL_SHONA",
            nameMain: "Shona",
            languageFamilyId: "FLG_BANTU",
            currentCountries: [],
            content: {},
          },
        ],
        meta: { total: 1, page: 1, perPage: 20, totalPages: 1 },
      };

      (listPeoplesHandler as any).mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost/api/v2/peoples");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should return 500 on error", async () => {
      (listPeoplesHandler as any).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost/api/v2/peoples");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
